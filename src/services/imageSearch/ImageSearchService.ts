import { Book } from '../../types/Book';
import { ImageCache } from './ImageCache';
import { BookMatcher } from './BookMatcher';
import { PlaceholderGenerator } from './PlaceholderGenerator';
import { DebugLogger } from './DebugLogger';

/**
 * 表紙画像検索サービス（リファクタリング版）
 * 単一責務原則に基づき、各機能を専用クラスに分離
 */
export class ImageSearchService {
  private static instance: ImageSearchService;
  private readonly cache = ImageCache.getInstance();
  private readonly matcher = BookMatcher.getInstance();
  private readonly placeholder = PlaceholderGenerator.getInstance();
  private readonly logger = DebugLogger.getInstance();
  
  private readonly GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

  static getInstance(): ImageSearchService {
    if (!this.instance) {
      this.instance = new ImageSearchService();
    }
    return this.instance;
  }

  /**
   * 書籍の表紙画像URLを取得（メインエントリーポイント）
   */
  async getImageForBook(book: Book): Promise<string> {
    this.logger.searchStart(book.title, book.isbn);

    try {
      // 既存の画像がある場合
      if (book.coverImage && book.coverImage.trim() !== '') {
        this.logger.searchEnd();
        return book.coverImage;
      }

      // キャッシュから取得
      const cachedUrl = this.cache.get(book.title, book.author, book.isbn);
      if (cachedUrl) {
        this.logger.cacheHit(book.title, cachedUrl);
        this.logger.searchEnd();
        return cachedUrl;
      }

      // 重複リクエスト防止
      const pendingRequest = this.cache.getPendingRequest(book.title, book.author, book.isbn);
      if (pendingRequest) {
        const result = await pendingRequest;
        this.logger.searchEnd();
        return result;
      }

      // 新しい検索を実行
      const searchPromise = this.performSearch(book);
      this.cache.setPendingRequest(book.title, book.author, searchPromise, book.isbn);

      try {
        const result = await searchPromise;
        this.cache.removePendingRequest(book.title, book.author, book.isbn);
        this.logger.searchEnd();
        return result;
      } catch (error) {
        this.cache.removePendingRequest(book.title, book.author, book.isbn);
        throw error;
      }

    } catch (error) {
      this.logger.error(`画像検索エラー: ${book.title}`, error as Error);
      const fallbackImage = this.placeholder.generate(book);
      this.cache.set(book.title, book.author, fallbackImage, book.isbn);
      this.logger.searchEnd();
      return fallbackImage;
    }
  }

  /**
   * 実際の検索処理を実行
   */
  private async performSearch(book: Book): Promise<string> {
    // 1. ISBN検索（最優先）
    if (book.isbn) {
      const isbnResult = await this.searchByISBN(book.isbn);
      if (isbnResult) {
        this.logger.isbnSearchSuccess(isbnResult);
        this.cache.set(book.title, book.author, isbnResult, book.isbn);
        return isbnResult;
      }
    }

    // 2. Google Books API検索
    const googleResult = await this.searchGoogleBooks(book);
    if (googleResult) {
      this.cache.set(book.title, book.author, googleResult, book.isbn);
      return googleResult;
    }

    // 3. プレースホルダー生成
    this.logger.noImageFound(book.title, book.author, book.publisher);
    const placeholderImage = this.placeholder.generate(book);
    this.cache.set(book.title, book.author, placeholderImage, book.isbn);
    return placeholderImage;
  }

  /**
   * ISBN検索
   */
  private async searchByISBN(isbn: string): Promise<string | null> {
    try {
      const url = `${this.GOOGLE_BOOKS_API}?q=isbn:${isbn}`;
      const response = await fetch(url);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const volumeInfo = data.items[0].volumeInfo;
        const imageLinks = volumeInfo.imageLinks;
        
        return imageLinks?.large || 
               imageLinks?.medium || 
               imageLinks?.thumbnail || 
               imageLinks?.smallThumbnail || 
               null;
      }
      
      return null;
    } catch (error) {
      this.logger.error('ISBN検索エラー', error as Error);
      return null;
    }
  }

  /**
   * Google Books API検索
   */
  private async searchGoogleBooks(book: Book): Promise<string | null> {
    try {
      const queries = this.buildSearchQueries(book);
      
      for (const query of queries) {
        const encodedQuery = encodeURIComponent(query);
        const response = await fetch(`${this.GOOGLE_BOOKS_API}?q=${encodedQuery}&maxResults=3&langRestrict=ja`);
        
        if (!response.ok) continue;
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          // 段階的マッチングを実行
          const result = this.tryMatchWithFallback(book, data.items);
          if (result) return result;
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error('Google Books検索エラー', error as Error);
      return null;
    }
  }

  /**
   * 検索クエリを構築
   */
  private buildSearchQueries(book: Book): string[] {
    return [
      `${book.title} ${book.author}`,
      `intitle:"${book.title}" inauthor:"${book.author}"`,
      book.title,
      `"${book.title}"`,
      `${book.title.replace(/[・]/g, ' ')} ${book.author.replace(/[・]/g, ' ')}`
    ];
  }

  /**
   * 段階的マッチング試行（厳格化版 - 表紙不一致問題対応）
   */
  private tryMatchWithFallback(book: Book, items: any[]): string | null {
    // マンガ版やオーディオブックを除外したアイテムを優先
    const sortedItems = this.sortAndFilterItems(book, items);
    
    // 段階1: 厳密マッチング（タイトル70% + 著者85%）
    for (const item of sortedItems) {
      const result = this.tryExactMatch(book, item, true);
      if (result) return result;
    }
    
    // 段階2: 通常マッチング（タイトル60% + 著者75%）
    for (const item of sortedItems) {
      const result = this.tryExactMatch(book, item, false);
      if (result) return result;
    }
    
    return null;
  }

  /**
   * 厳密マッチング試行
   */
  private tryExactMatch(book: Book, item: any, strictMode: boolean = false): string | null {
    const volumeInfo = item.volumeInfo;
    const imageLinks = volumeInfo.imageLinks;
    
    if (!imageLinks) return null;
    
    const titleMatch = this.matcher.isSimilarTitle(book.title, volumeInfo.title, strictMode);
    const authorMatch = this.matcher.isSimilarAuthor(book.author, volumeInfo.authors, strictMode);
    
    if (titleMatch && (authorMatch || !volumeInfo.authors)) {
      const imageUrl = imageLinks.large || imageLinks.medium || imageLinks.thumbnail || imageLinks.smallThumbnail;
      if (imageUrl) {
        // 詳細なデバッグ情報を出力
        console.log(`🎯 画像マッチ成功:`);
        console.log(`  検索書籍: "${book.title}" by "${book.author}"`);
        console.log(`  マッチ書籍: "${volumeInfo.title}" by "${volumeInfo.authors?.join(', ') || 'Unknown'}"`);
        console.log(`  タイトル一致: ${titleMatch} (厳格モード: ${strictMode})`);
        console.log(`  著者一致: ${authorMatch}`);
        console.log(`  画像URL: ${imageUrl}`);
        console.log(`  Publisher: ${volumeInfo.publisher || 'Unknown'}`);
        console.log(`  カテゴリ: ${volumeInfo.categories?.join(', ') || 'Unknown'}`);
        
        this.logger.exactMatch(book.title, volumeInfo.title, imageUrl);
        return imageUrl;
      }
    }
    
    return null;
  }

  /**
   * 中程度マッチング試行
   */
  private tryModerateMatch(book: Book, item: any): string | null {
    const volumeInfo = item.volumeInfo;
    const imageLinks = volumeInfo.imageLinks;
    
    if (!imageLinks) return null;
    
    const titleMatch = this.matcher.isSimilarTitle(book.title, volumeInfo.title, false); // 緩和モード
    const authorMatch = this.matcher.isSimilarAuthor(book.author, volumeInfo.authors);
    
    if (titleMatch && authorMatch) {
      const imageUrl = imageLinks.large || imageLinks.medium || imageLinks.thumbnail || imageLinks.smallThumbnail;
      if (imageUrl) {
        console.log(`⚡ 中程度マッチ: "${book.title}" ➜ "${volumeInfo.title}" by "${volumeInfo.authors?.join(', ') || 'Unknown'}" -> ${imageUrl}`);
        return imageUrl;
      }
    }
    
    return null;
  }

  /**
   * タイトルのみマッチング試行（警告付き）
   */
  private tryTitleOnlyMatch(book: Book, item: any): string | null {
    const volumeInfo = item.volumeInfo;
    const imageLinks = volumeInfo.imageLinks;
    
    if (!imageLinks) return null;
    
    if (this.matcher.isSimilarTitle(book.title, volumeInfo.title, false)) { // 緩和モード
      const imageUrl = imageLinks.large || imageLinks.medium || imageLinks.thumbnail || imageLinks.smallThumbnail;
      if (imageUrl) {
        this.logger.titleOnlyMatch(book.title, volumeInfo.title, volumeInfo.authors || [], imageUrl);
        return imageUrl;
      }
    }
    
    return null;
  }

  /**
   * 緩いマッチング試行（タイトル50%）
   */
  private tryLooseMatch(book: Book, item: any): string | null {
    const volumeInfo = item.volumeInfo;
    const imageLinks = volumeInfo.imageLinks;
    
    if (!imageLinks) return null;
    
    // 更に緩い条件でタイトルチェック
    const normalize = (str: string) => str.toLowerCase().replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
    const originalNorm = normalize(book.title);
    const foundNorm = normalize(volumeInfo.title || '');
    
    // 50%以上の類似度または部分一致
    const similarity = this.calculateSimilarity(originalNorm, foundNorm);
    const hasPartialMatch = originalNorm.length > 3 && (originalNorm.includes(foundNorm) || foundNorm.includes(originalNorm));
    
    if (similarity > 0.50 || hasPartialMatch) {
      const imageUrl = imageLinks.large || imageLinks.medium || imageLinks.thumbnail || imageLinks.smallThumbnail;
      if (imageUrl) {
        console.log(`🔸 緩いマッチング: "${book.title}" ➜ "${volumeInfo.title}" (類似度: ${Math.round(similarity * 100)}%) -> ${imageUrl}`);
        return imageUrl;
      }
    }
    
    return null;
  }

  /**
   * 最終手段マッチング（画像があれば採用）
   */
  private tryAnyImageMatch(book: Book, item: any): string | null {
    const volumeInfo = item.volumeInfo;
    const imageLinks = volumeInfo.imageLinks;
    
    if (!imageLinks) return null;
    
    // キーワードが少しでも一致すれば採用
    const bookKeywords = book.title.toLowerCase().split(/[\s・]/);
    const foundTitle = (volumeInfo.title || '').toLowerCase();
    
    const hasKeywordMatch = bookKeywords.some(keyword => 
      keyword.length > 1 && foundTitle.includes(keyword)
    );
    
    if (hasKeywordMatch) {
      const imageUrl = imageLinks.large || imageLinks.medium || imageLinks.thumbnail || imageLinks.smallThumbnail;
      if (imageUrl) {
        console.log(`🚨 最終手段マッチング: "${book.title}" ➜ "${volumeInfo.title}" -> ${imageUrl}`);
        return imageUrl;
      }
    }
    
    return null;
  }

  /**
   * 書籍アイテムをソート・フィルタリング
   */
  private sortAndFilterItems(book: Book, items: any[]): any[] {
    // 版・形式の優先度を設定
    const getFormatPriority = (title: string): number => {
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes('マンガ') || lowerTitle.includes('コミック') || 
          lowerTitle.includes('comic') || lowerTitle.includes('manga')) {
        return 3; // 最下位優先度
      }
      if (lowerTitle.includes('オーディオ') || lowerTitle.includes('audio')) {
        return 2;
      }
      if (/\s\d+$/.test(title) || /[上下前後編]$/.test(title)) {
        return 1; // シリーズ番号付き
      }
      return 0; // 最高優先度（通常版）
    };
    
    return items.sort((a, b) => {
      const priorityA = getFormatPriority(a.volumeInfo?.title || '');
      const priorityB = getFormatPriority(b.volumeInfo?.title || '');
      return priorityA - priorityB;
    });
  }

  /**
   * 類似度計算（内部使用）
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * レーベンシュタイン距離（内部使用）
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * キャッシュ統計情報を取得
   */
  getCacheStats(): { cacheSize: number; pendingRequests: number } {
    return this.cache.getStats();
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 特定の書籍のキャッシュをクリア
   */
  clearBookCache(title: string, author: string, isbn?: string): void {
    this.cache.clearBookCache(title, author, isbn);
  }
}