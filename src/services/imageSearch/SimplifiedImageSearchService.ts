import { Book } from '../../types/Book';

/**
 * 簡略化された表紙画像検索サービス
 * 複雑すぎるマッチングロジックを単純化し、確実性を重視
 */
export class SimplifiedImageSearchService {
  private static instance: SimplifiedImageSearchService;
  private readonly GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';
  private cache = new Map<string, string>();
  private pendingRequests = new Map<string, Promise<string>>();
  
  // 🚨 API制限対応: リクエスト制御機能追加
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1秒間隔に拡大

  static getInstance(): SimplifiedImageSearchService {
    if (!this.instance) {
      this.instance = new SimplifiedImageSearchService();
    }
    return this.instance;
  }

  /**
   * 書籍の表紙画像URLを取得（デバッグ強化版・強制ログ有効）
   */
  async getImageForBook(book: Book): Promise<string> {
    // 🚨 強制デバッグログ有効化 - NODE_ENV関係なく常に出力
    console.group(`🔍 [${book.id}] 表紙検索開始: "${book.title}" by "${book.author}"`);
    console.log(`📋 ISBN: ${book.isbn || 'なし'}`);
    console.log(`📚 書籍ID: ${book.id}`);
    console.log(`⚙️ NODE_ENV: ${process.env.NODE_ENV || '未定義'}`);
    console.log(`⏰ 検索開始時刻: ${new Date().toLocaleTimeString()}`);
    
    try {
      // 既存の画像がある場合
      if (book.coverImage && book.coverImage.trim() !== '') {
        console.log(`✅ 既存画像使用: ${book.coverImage}`);
        console.groupEnd();
        return book.coverImage;
      }

      // キャッシュキーの詳細表示
      const cacheKey = `${book.id}_${book.title}_${book.author}_${book.isbn || ''}`;
      console.log(`🔑 キャッシュキー: ${cacheKey}`);
      
      const cachedUrl = this.cache.get(cacheKey);
      if (cachedUrl) {
        console.log(`💾 キャッシュヒット: ${cachedUrl}`);
        console.log(`📊 現在のキャッシュサイズ: ${this.cache.size}`);
        console.groupEnd();
        return cachedUrl;
      }

      // 重複リクエスト防止
      const pendingRequest = this.pendingRequests.get(cacheKey);
      if (pendingRequest) {
        console.log(`⏳ 検索中のリクエストを待機...`);
        const result = await pendingRequest;
        console.groupEnd();
        return result;
      }

      // 新しい検索を実行
      console.log(`🚀 新しい検索を開始...`);
      const searchPromise = this.performSimplifiedSearch(book);
      this.pendingRequests.set(cacheKey, searchPromise);

      try {
        const result = await searchPromise;
        this.pendingRequests.delete(cacheKey);
        this.cache.set(cacheKey, result);
        console.log(`✅ 検索完了・キャッシュ保存: ${result}`);
        console.log(`📊 更新後キャッシュサイズ: ${this.cache.size}`);
        console.groupEnd();
        return result;
      } catch (error) {
        this.pendingRequests.delete(cacheKey);
        throw error;
      }

    } catch (error) {
      console.error(`❌ 画像検索エラー: ${book.title}`, error);
      const fallbackImage = this.generatePlaceholder(book);
      console.log(`🔄 プレースホルダー生成: ${fallbackImage}`);
      console.groupEnd();
      return fallbackImage;
    }
  }

  /**
   * 簡略化された検索処理（2段階に削減 - API制限対応）
   */
  private async performSimplifiedSearch(book: Book): Promise<string> {
    // 段階1: ISBN検索（ISBNがある場合のみ）
    if (book.isbn && book.isbn.trim() !== '') {
      console.log(`🔍 ISBN検索: ${book.isbn}`);
      const isbnResult = await this.searchByISBN(book.isbn);
      if (isbnResult && this.isValidImage(isbnResult)) {
        console.log(`✅ ISBN検索成功: ${isbnResult}`);
        return isbnResult;
      } else {
        console.log(`❌ ISBN検索失敗または無効な画像`);
      }
    }

    // 段階2: 正確なタイトル+著者検索（タイトルのみ検索は省略）
    console.log(`🔍 正確検索: "${book.title}" + "${book.author}"`);
    const exactResult = await this.searchExact(book);
    if (exactResult && this.isValidImage(exactResult)) {
      console.log(`✅ 正確検索成功: ${exactResult}`);
      return exactResult;
    }

    // すべて失敗 - プレースホルダー生成
    console.log(`❌ すべての検索が失敗: ${book.title} - プレースホルダー生成`);
    return this.generatePlaceholder(book);
  }

  /**
   * API制限対応のリクエスト実行（簡略版）
   */
  private async makeRateLimitedRequest(url: string): Promise<Response | null> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    // 最小間隔の確保
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const delay = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`⏳ API制限対応: ${delay}ms待機中...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
    
    try {
      console.log(`📡 API呼び出し: ${url.substring(0, 80)}...`);
      const response = await fetch(url);
      
      if (response.status === 429) {
        console.warn('⚠️ 429 Too Many Requests - 5秒待機して再試行');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 1回だけ再試行
        console.log(`🔄 再試行: ${url.substring(0, 80)}...`);
        this.lastRequestTime = Date.now();
        return await fetch(url);
      }
      
      return response;
    } catch (error) {
      console.error('❌ API呼び出しエラー:', error);
      return null;
    }
  }

  /**
   * ISBN検索（多重検証版）
   */
  private async searchByISBN(isbn: string): Promise<string | null> {
    try {
      const url = `${this.GOOGLE_BOOKS_API}?q=isbn:${isbn}`;
      const response = await this.makeRateLimitedRequest(url);
      
      if (!response || !response.ok) return null;
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        const imageUrl = this.extractImageUrl(item);
        
        if (imageUrl) {
          console.log(`📖 ISBN検索成功: "${item.volumeInfo.title}" by ${(item.volumeInfo.authors || []).join(', ')}`);
          console.log(`    出版社: ${item.volumeInfo.publisher || '不明'} (${item.volumeInfo.publishedDate || '不明'})`);
          return imageUrl;
        } else {
          console.log(`⚠️ ISBN検索で書籍発見も画像なし: "${item.volumeInfo.title}"`);
        }
      }
      
      return null;
    } catch (error) {
      console.error('ISBN検索エラー:', error);
      return null;
    }
  }

  /**
   * 正確なタイトル+著者検索（制限対応版）
   */
  private async searchExact(book: Book): Promise<string | null> {
    try {
      // 🚨 API制限対応: クエリパターンを1つに絞る
      const query = `"${book.title}" "${book.author}"`;
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.GOOGLE_BOOKS_API}?q=${encodedQuery}&maxResults=3&langRestrict=ja`;
      
      const response = await this.makeRateLimitedRequest(url);
      
      if (!response || !response.ok) return null;
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const result = this.selectBestMatch(book, data.items);
        if (result) return result;
      }
      
      return null;
    } catch (error) {
      console.error('正確検索エラー:', error);
      return null;
    }
  }

  /**
   * タイトルのみ検索（制限対応版）
   */
  private async searchByTitle(book: Book): Promise<string | null> {
    try {
      const encodedTitle = encodeURIComponent(`"${book.title}"`);
      const url = `${this.GOOGLE_BOOKS_API}?q=${encodedTitle}&maxResults=3&langRestrict=ja`;
      
      const response = await this.makeRateLimitedRequest(url);
      
      if (!response || !response.ok) return null;
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const result = this.selectBestTitleMatch(book, data.items);
        if (result) return result;
      }
      
      return null;
    } catch (error) {
      console.error('タイトル検索エラー:', error);
      return null;
    }
  }

  /**
   * 最適な結果を選択（多重検証版 - 誤マッチング徹底防止）
   */
  private selectBestMatch(book: Book, items: any[]): string | null {
    console.log(`🔍 [${book.id}] "${book.title}" の ${items.length}件の検索結果からマッチング:`);
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const volumeInfo = item.volumeInfo;
      const imageUrl = this.extractImageUrl(item);
      
      console.log(`\n   ${i + 1}. "${volumeInfo.title || '不明'}"`);
      console.log(`      著者: ${(volumeInfo.authors || ['不明']).join(', ')}`);
      console.log(`      出版社: ${volumeInfo.publisher || '不明'} (${volumeInfo.publishedDate || '不明'})`);
      console.log(`      画像: ${imageUrl ? '✅' : '❌'} ${imageUrl || 'なし'}`);
      
      if (!imageUrl) {
        console.log(`      ❌ 画像なしのためスキップ`);
        continue;
      }

      // 🚨 多重検証実装
      const verification = this.performMultiLayerVerification(book, volumeInfo);
      
      console.log(`      📊 タイトル類似度: ${(verification.titleSimilarity * 100).toFixed(1)}%`);
      console.log(`      📊 著者一致: ${verification.authorMatch ? '✅' : '❌'}`);
      console.log(`      📊 出版社一致: ${verification.publisherMatch ? '✅' : '❌'}`);
      console.log(`      📊 出版年近似: ${verification.dateMatch ? '✅' : '❌'}`);
      console.log(`      📊 総合スコア: ${(verification.totalScore * 100).toFixed(1)}%`);
      
      // 🚨 厳格な多重条件チェック
      if (verification.isHighConfidenceMatch) {
        console.log(`      ✅ 多重検証成功! 採用 (信頼度: ${(verification.totalScore * 100).toFixed(1)}%)`);
        return imageUrl;
      } else {
        console.log(`      ❌ 多重検証失敗 - 却下 (信頼度不足: ${(verification.totalScore * 100).toFixed(1)}%)`);
      }
    }
    
    console.log(`   ❌ [${book.id}] "${book.title}" に適切なマッチが見つかりませんでした`);
    return null;
  }

  /**
   * 多重検証システム - 誤マッチング防止の核心
   */
  private performMultiLayerVerification(book: Book, volumeInfo: any): {
    titleSimilarity: number;
    authorMatch: boolean;
    publisherMatch: boolean;
    dateMatch: boolean;
    totalScore: number;
    isHighConfidenceMatch: boolean;
  } {
    // 正規化関数
    const normalize = (str: string) => str.toLowerCase()
      .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');

    // 1. タイトル類似度
    const foundTitle = normalize(volumeInfo.title || '');
    const originalTitle = normalize(book.title);
    const titleSimilarity = this.calculateSimilarity(originalTitle, foundTitle);

    // 2. 著者一致チェック（厳格化 - 別書籍誤認防止）
    const foundAuthors = (volumeInfo.authors || []).map((a: string) => normalize(a));
    const originalAuthor = normalize(book.author);
    const authorMatch = foundAuthors.some((author: string) => {
      // 🚨 より厳格な著者チェック
      if (author === originalAuthor) return true; // 完全一致
      
      // 3文字以上の場合のみ部分一致を許可（短い名前での誤認防止）
      if (author.length >= 3 && originalAuthor.length >= 3) {
        // 姓と名の順序違いを考慮（例：山田太郎 vs 太郎山田）
        const authorParts = author.split(/[\s・]/);
        const originalParts = originalAuthor.split(/[\s・]/);
        
        // すべての部分が相互に含まれる場合のみ一致
        return authorParts.every(part => 
          originalParts.some(origPart => 
            part.includes(origPart) || origPart.includes(part)
          )
        ) && originalParts.every(origPart => 
          authorParts.some(part => 
            part.includes(origPart) || origPart.includes(part)
          )
        );
      }
      
      return false; // 短い名前や部分一致は基本的に拒否
    });

    // 3. 出版社一致チェック
    const foundPublisher = normalize(volumeInfo.publisher || '');
    const originalPublisher = normalize(book.publisher || '');
    const publisherMatch = originalPublisher !== '' && foundPublisher !== '' && 
      (foundPublisher.includes(originalPublisher) || originalPublisher.includes(foundPublisher));

    // 4. 出版年近似チェック
    const foundYear = this.extractYear(volumeInfo.publishedDate);
    const originalYear = this.extractYear(book.publishedDate);
    const dateMatch = Boolean(foundYear && originalYear && Math.abs(foundYear - originalYear) <= 2);

    // 5. 総合スコア計算
    let totalScore = 0;
    
    // タイトル類似度（最重要: 60%）
    totalScore += titleSimilarity * 0.6;
    
    // 著者一致（重要: 25%）
    if (authorMatch) totalScore += 0.25;
    
    // 出版社一致（10%）
    if (publisherMatch) totalScore += 0.1;
    
    // 出版年近似（5%）
    if (dateMatch) totalScore += 0.05;

    // 6. 高信頼度判定（著者一致必須 - 別書籍誤認防止）
    const isHighConfidenceMatch = 
      // 🚨 重要: 著者一致は全ての条件で必須！
      authorMatch && (
        // 条件1: 完全一致（タイトル95%以上 + 著者一致）
        (titleSimilarity >= 0.95) ||
        // 条件2: 高類似度 + 複数要素一致（タイトル90%以上 + 出版社/年一致）
        (titleSimilarity >= 0.9 && (publisherMatch || dateMatch)) ||
        // 条件3: 中程度類似度 + 出版社・年両方一致（タイトル80%以上）
        (titleSimilarity >= 0.8 && publisherMatch && dateMatch)
      );

    return {
      titleSimilarity,
      authorMatch,
      publisherMatch,
      dateMatch,
      totalScore,
      isHighConfidenceMatch
    };
  }

  /**
   * 出版年抽出
   */
  private extractYear(dateString: string): number | null {
    if (!dateString) return null;
    const match = dateString.match(/(\d{4})/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * タイトルのみでの最適な結果を選択（著者必須チェック強化）
   */
  private selectBestTitleMatch(book: Book, items: any[]): string | null {
    console.log(`🔍 [タイトル検索] "${book.title}" の ${items.length}件をチェック（著者必須）:`);
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const volumeInfo = item.volumeInfo;
      const imageUrl = this.extractImageUrl(item);
      
      console.log(`\n   ${i + 1}. "${volumeInfo.title || '不明'}"`);
      console.log(`      著者: ${(volumeInfo.authors || ['不明']).join(', ')}`);
      console.log(`      画像: ${imageUrl ? '✅' : '❌'}`);
      
      if (!imageUrl) {
        console.log(`      ❌ 画像なしのためスキップ`);
        continue;
      }

      // 🚨 タイトル検索でも多重検証を適用（著者必須）
      const verification = this.performMultiLayerVerification(book, volumeInfo);
      
      console.log(`      📊 タイトル類似度: ${(verification.titleSimilarity * 100).toFixed(1)}%`);
      console.log(`      📊 著者一致: ${verification.authorMatch ? '✅' : '❌'}`);
      console.log(`      📊 総合判定: ${verification.isHighConfidenceMatch ? '✅' : '❌'}`);
      
      // 🚨 著者一致必須 - タイトル検索でも同じ厳格さ
      if (verification.isHighConfidenceMatch) {
        console.log(`      ✅ タイトル検索成功（著者確認済み）: 採用`);
        return imageUrl;
      } else if (!verification.authorMatch) {
        console.log(`      ❌ 著者不一致のため却下（別書籍の可能性）`);
      } else {
        console.log(`      ❌ 類似度不足のため却下`);
      }
    }
    
    console.log(`   ❌ [タイトル検索] "${book.title}" に適切なマッチが見つかりませんでした`);
    return null;
  }

  /**
   * 文字列類似度を計算（Levenshtein距離ベース）
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
  }

  /**
   * Levenshtein距離を計算
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    // 初期化
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    // 距離計算
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
   * 画像URLを抽出
   */
  private extractImageUrl(item: any): string | null {
    const imageLinks = item.volumeInfo?.imageLinks;
    if (!imageLinks) return null;

    return imageLinks.large || 
           imageLinks.medium || 
           imageLinks.thumbnail || 
           imageLinks.smallThumbnail || 
           null;
  }

  /**
   * 画像URLの有効性チェック
   */
  private isValidImage(imageUrl: string): boolean {
    return Boolean(imageUrl) && 
           imageUrl.startsWith('http') && 
           !imageUrl.includes('placeholder') &&
           !imageUrl.includes('generic');
  }

  /**
   * プレースホルダー生成（日本語文字対応版）
   */
  private generatePlaceholder(book: Book): string {
    // 🚨 btoa()エラー修正: 日本語文字を安全な文字に変換
    const safeTitle = book.title.substring(0, 2).replace(/[^\w]/g, '本');
    const safeAuthor = book.author.substring(0, 1).replace(/[^\w]/g, '著');
    
    console.log(`🎨 プレースホルダー生成: "${book.title}" by "${book.author}"`);
    console.log(`📝 安全文字変換: "${safeTitle}" by "${safeAuthor}"`);
    
    // SVGコンテンツを完全に安全な文字のみで構成（絵文字も除外）
    const svgContent = `<svg width="80" height="100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#e8f4fd;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#cde7f0;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="80" height="100" fill="url(#grad)" stroke="#a0c4d4" stroke-width="1"/>
        <text x="40" y="30" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#2d4a5d">BOOK</text>
        <text x="40" y="50" text-anchor="middle" font-family="Arial" font-size="24" fill="#5a7a8a">[]</text>
        <text x="40" y="70" text-anchor="middle" font-family="Arial" font-size="8" fill="#7a9aaa">NO IMAGE</text>
        <text x="40" y="85" text-anchor="middle" font-family="Arial" font-size="6" fill="#9abad2">ID: ${book.id}</text>
      </svg>`;
    
    try {
      return `data:image/svg+xml;base64,${btoa(svgContent)}`;
    } catch (error) {
      console.error('❌ プレースホルダー生成エラー:', error);
      // フォールバック: URLエンコード方式
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    console.log('🗑️ 画像キャッシュをクリアしています...');
    const beforeSize = this.cache.size;
    this.cache.clear();
    this.pendingRequests.clear();
    console.log(`✅ キャッシュクリア完了: ${beforeSize}件のキャッシュを削除`);
  }

  /**
   * 特定の書籍のキャッシュを削除
   */
  clearCacheForBook(title: string, author: string, isbn?: string): void {
    const cacheKey = `${title}_${author}_${isbn || ''}`;
    if (this.cache.has(cacheKey)) {
      this.cache.delete(cacheKey);
      console.log(`🗑️ 書籍キャッシュを削除: "${title}"`);
    }
    if (this.pendingRequests.has(cacheKey)) {
      this.pendingRequests.delete(cacheKey);
      console.log(`⏸️ 進行中リクエストをキャンセル: "${title}"`);
    }
  }

  /**
   * キャッシュ統計
   */
  getCacheStats(): { cacheSize: number; pendingRequests: number } {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size
    };
  }

  /**
   * 全キャッシュエントリを取得（デバッグ用）
   */
  getAllCacheEntries(): { [key: string]: string } {
    const entries: { [key: string]: string } = {};
    this.cache.forEach((value, key) => {
      entries[key] = value;
    });
    return entries;
  }
}