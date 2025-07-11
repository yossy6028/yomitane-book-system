/**
 * 多層統合書籍検索サービス
 * 児童書特有の出版形態複雑性に対応した根本的解決策
 */

export interface BookSearchResult {
  imageUrl: string;
  source: string;
  confidence: number;
  metadata: {
    publisher?: string;
    isbn?: string;
    year?: number;
    series?: string;
  };
}

export interface Book {
  title: string;
  author: string;
  isbn?: string;
  genre?: string;
  targetAge?: string;
}

/**
 * 児童書検索特化アルゴリズム
 */
class ChildrenBookSearchEngine {
  // 児童書特有の検索パターン
  private readonly CHILDREN_BOOK_PATTERNS = {
    // 定番シリーズの出版社マッピング
    SERIES_PUBLISHERS: {
      '青い鳥文庫': '講談社',
      'つばさ文庫': '角川書店',
      '岩波少年文庫': '岩波書店',
      'フォア文庫': 'ポプラ社',
      'かいけつゾロリ': 'ポプラ社',
      'マジック・ツリーハウス': 'KADOKAWA'
    } as Record<string, string>,
    
    // 著者名の異表記パターン
    AUTHOR_VARIANTS: {
      'マーク・トウェイン': ['マーク・トウェーン', 'M.トウェイン', 'Mark Twain'],
      '宮沢賢治': ['宮澤賢治', 'みやざわけんじ'],
      '新美南吉': ['にいみなんきち'],
      'ルイス・キャロル': ['L.キャロル', 'Lewis Carroll'],
      'L.M.モンゴメリ': ['モンゴメリ', 'L.M.Montgomery']
    } as Record<string, string[]>,
    
    // タイトルの異表記パターン
    TITLE_VARIANTS: {
      'トムソーヤの冒険': ['トム・ソーヤーの冒険', 'トムソーヤー', 'トム・ソーヤ'],
      'ハックルベリー・フィンの冒険': ['ハックルベリーフィン', 'ハック・フィン'],
      'アンの夢': ['赤毛のアン', 'Anne of Green Gables'],
      'ナルニア国物語': ['ライオンと魔女', 'ナルニア国']
    } as Record<string, string[]>
  };

  /**
   * 児童書特化検索クエリを生成
   */
  generateChildrenBookQueries(book: Book): string[] {
    const queries: string[] = [];
    
    // 基本クエリ
    queries.push(`${book.title} ${book.author}`);
    
    // 著者の異表記を試行
    const authorVariants = (this.CHILDREN_BOOK_PATTERNS.AUTHOR_VARIANTS as Record<string, string[]>)[book.author] || [];
    authorVariants.forEach(variant => {
      queries.push(`${book.title} ${variant}`);
    });
    
    // タイトルの異表記を試行
    const titleVariants = (this.CHILDREN_BOOK_PATTERNS.TITLE_VARIANTS as Record<string, string[]>)[book.title] || [];
    titleVariants.forEach(variant => {
      queries.push(`${variant} ${book.author}`);
    });
    
    // シリーズ情報を含む検索
    Object.entries(this.CHILDREN_BOOK_PATTERNS.SERIES_PUBLISHERS as Record<string, string>).forEach(([series, publisher]) => {
      if (book.title.includes(series.split('')[0]) || book.author.includes(publisher)) {
        queries.push(`${book.title} ${series}`);
        queries.push(`${book.title} ${publisher}`);
      }
    });
    
    // 児童書・少年文庫キーワード追加
    queries.push(`${book.title} ${book.author} 少年文庫`);
    queries.push(`${book.title} ${book.author} 児童書`);
    queries.push(`${book.title} ${book.author} 青少年`);
    
    return Array.from(new Set(queries)); // 重複除去
  }

  /**
   * 検索結果の信頼度を評価
   */
  evaluateConfidence(result: any, originalBook: Book): number {
    let confidence = 0;
    
    // タイトル一致度 (40%)
    const titleSimilarity = this.calculateStringSimilarity(
      this.normalizeTitle(result.title || ''),
      this.normalizeTitle(originalBook.title)
    );
    confidence += titleSimilarity * 0.4;
    
    // 著者一致度 (30%)
    const authorSimilarity = this.calculateAuthorSimilarity(
      result.authors || [],
      originalBook.author
    );
    confidence += authorSimilarity * 0.3;
    
    // 出版社信頼度 (20%)
    const publisherScore = this.evaluatePublisherReliability(result.publisher || '');
    confidence += publisherScore * 0.2;
    
    // 画像品質 (10%)
    const imageQuality = this.evaluateImageQuality(result.imageLinks || {});
    confidence += imageQuality * 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[・・]/g, '')
      .replace(/\s+/g, '')
      .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
  }

  public calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  public calculateAuthorSimilarity(authors: string[], targetAuthor: string): number {
    if (!authors || !authors.length) return 0;
    
    const normalizedTarget = this.normalizeAuthor(targetAuthor);
    let maxSimilarity = 0;
    
    authors.forEach(author => {
      const normalizedAuthor = this.normalizeAuthor(author);
      const similarity = this.calculateStringSimilarity(normalizedAuthor, normalizedTarget);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    });
    
    return maxSimilarity;
  }

  private normalizeAuthor(author: string): string {
    return author
      .replace(/[・・]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  private evaluatePublisherReliability(publisher: string): number {
    const TRUSTED_CHILDREN_PUBLISHERS = [
      '講談社', 'ポプラ社', '岩波書店', 'KADOKAWA', '角川書店',
      '小学館', '集英社', '学研', '偕成社', 'あかね書房',
      '福音館書店', '金の星社', 'ひかりのくに'
    ];
    
    const normalizedPublisher = publisher.toLowerCase();
    const isTrusted = TRUSTED_CHILDREN_PUBLISHERS.some(trusted => 
      normalizedPublisher.includes(trusted.toLowerCase())
    );
    
    return isTrusted ? 1.0 : 0.5;
  }

  private evaluateImageQuality(imageLinks: any): number {
    if (!imageLinks) return 0;
    
    // 高解像度画像が利用可能かチェック
    if (imageLinks.extraLarge) return 1.0;
    if (imageLinks.large) return 0.8;
    if (imageLinks.medium) return 0.6;
    if (imageLinks.small) return 0.4;
    if (imageLinks.thumbnail) return 0.2;
    
    return 0;
  }
}

/**
 * 多層統合書籍検索サービス
 */
export class MultiLayerBookSearchService {
  private searchEngine = new ChildrenBookSearchEngine();

  constructor(
    private googleBooksApiKey: string,
    private rakutenApiKey?: string,
    private ndlApiKey?: string
  ) {}

  /**
   * 多層検索を実行
   */
  async searchBookImage(book: Book): Promise<BookSearchResult | null> {
    console.log(`🔍 多層検索開始: "${book.title}" by ${book.author}`);

    // Layer 1: Google Books API (従来)
    const googleResult = await this.searchGoogleBooks(book);
    if (googleResult && googleResult.confidence > 0.8) {
      console.log(`✅ Google Books (高信頼度): ${googleResult.confidence.toFixed(2)}`);
      return googleResult;
    }

    // Layer 2: 楽天ブックスAPI (国内出版社重視)
    if (this.rakutenApiKey) {
      const rakutenResult = await this.searchRakutenBooks(book);
      if (rakutenResult && rakutenResult.confidence > 0.7) {
        console.log(`✅ 楽天ブックス: ${rakutenResult.confidence.toFixed(2)}`);
        return rakutenResult;
      }
    }

    // Layer 3: 国立国会図書館API (網羅性重視)
    if (this.ndlApiKey) {
      const ndlResult = await this.searchNationalDietLibrary(book);
      if (ndlResult && ndlResult.confidence > 0.6) {
        console.log(`✅ 国立国会図書館: ${ndlResult.confidence.toFixed(2)}`);
        return ndlResult;
      }
    }

    // Layer 4: 最適結果の選択
    const allResults = [googleResult, await this.searchRakutenBooks(book), await this.searchNationalDietLibrary(book)]
      .filter(Boolean) as BookSearchResult[];

    if (allResults.length > 0) {
      const bestResult = allResults.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      console.log(`🎯 最適結果選択: ${bestResult.source} (${bestResult.confidence.toFixed(2)})`);
      return bestResult;
    }

    console.log(`❌ 全層検索失敗: "${book.title}"`);
    return null;
  }

  /**
   * Google Books API検索 (改良版)
   */
  private async searchGoogleBooks(book: Book): Promise<BookSearchResult | null> {
    const queries = this.searchEngine.generateChildrenBookQueries(book);
    
    for (const query of queries) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${this.googleBooksApiKey}&maxResults=5`
        );
        
        if (!response.ok) continue;
        
        const data = await response.json();
        if (data.items?.length) {
          for (const item of data.items) {
            const confidence = this.searchEngine.evaluateConfidence(item.volumeInfo, book);
            if (confidence > 0.6 && item.volumeInfo.imageLinks?.thumbnail) {
              return {
                imageUrl: item.volumeInfo.imageLinks.thumbnail.replace('http:', 'https:'),
                source: 'Google Books',
                confidence,
                metadata: {
                  publisher: item.volumeInfo.publisher,
                  isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier,
                  year: item.volumeInfo.publishedDate ? parseInt(item.volumeInfo.publishedDate) : undefined
                }
              };
            }
          }
        }
        
        // API制限対策
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Google Books API error for query "${query}":`, error);
      }
    }
    
    return null;
  }

  /**
   * 楽天ブックスAPI検索
   */
  private async searchRakutenBooks(book: Book): Promise<BookSearchResult | null> {
    if (!this.rakutenApiKey) return null;

    const queries = this.searchEngine.generateChildrenBookQueries(book);
    
    for (const query of queries) {
      try {
        const response = await fetch(
          `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?format=json&title=${encodeURIComponent(query)}&applicationId=${this.rakutenApiKey}&hits=5`
        );
        
        if (!response.ok) continue;
        
        const data = await response.json();
        if (data.Items?.length) {
          for (const item of data.Items) {
            const bookData = item.Item;
            const confidence = this.evaluateRakutenResult(bookData, book);
            
            if (confidence > 0.5 && bookData.largeImageUrl) {
              return {
                imageUrl: bookData.largeImageUrl,
                source: '楽天ブックス',
                confidence,
                metadata: {
                  publisher: bookData.publisherName,
                  isbn: bookData.isbn,
                  year: bookData.salesDate ? parseInt(bookData.salesDate.substring(0, 4)) : undefined
                }
              };
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`楽天ブックスAPI error for query "${query}":`, error);
      }
    }
    
    return null;
  }

  /**
   * 国立国会図書館API検索
   */
  private async searchNationalDietLibrary(book: Book): Promise<BookSearchResult | null> {
    // 実装省略 - NDL APIは画像提供が限定的
    return null;
  }

  private evaluateRakutenResult(result: any, originalBook: Book): number {
    let confidence = 0;
    
    // タイトル一致度
    const titleSimilarity = this.searchEngine.calculateStringSimilarity(
      result.title || '',
      originalBook.title
    );
    confidence += titleSimilarity * 0.5;
    
    // 著者一致度
    const authorSimilarity = this.searchEngine.calculateStringSimilarity(
      result.author || '',
      originalBook.author
    );
    confidence += authorSimilarity * 0.4;
    
    // カテゴリ情報
    if (result.booksGenreId && result.booksGenreId.includes('001004')) { // 児童書カテゴリ
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }
}