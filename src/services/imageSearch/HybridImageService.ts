import { Book } from '../../types/Book';

/**
 * ハイブリッド画像検索サービス
 * 複数の手段を組み合わせて確実に表紙画像を取得
 */
export class HybridImageService {
  private static instance: HybridImageService;
  private cache = new Map<string, string>();
  
  // バックエンドAPIのURL（環境変数で管理）
  private readonly BACKEND_API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

  static getInstance(): HybridImageService {
    if (!this.instance) {
      this.instance = new HybridImageService();
    }
    return this.instance;
  }

  /**
   * 統合画像検索 - あらゆる手段を駆使して画像を取得
   */
  async getBookCover(book: Book): Promise<string> {
    const cacheKey = `${book.id}_${book.title}_${book.author}`;
    
    // キャッシュチェック
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    console.log(`🔍 ハイブリッド検索開始: "${book.title}"`);

    // 戦略1: Google Books API（従来の方法）
    const googleImage = await this.tryGoogleBooks(book);
    if (googleImage) {
      this.cache.set(cacheKey, googleImage);
      return googleImage;
    }

    // 戦略2: Open Library（即座に利用可能）
    const openLibraryImage = await this.tryOpenLibrary(book);
    if (openLibraryImage) {
      this.cache.set(cacheKey, openLibraryImage);
      return openLibraryImage;
    }

    // 戦略3: バックエンドAPI（Playwright + Gemini）
    const backendImage = await this.tryBackendScraper(book);
    if (backendImage) {
      this.cache.set(cacheKey, backendImage);
      return backendImage;
    }

    // 戦略4: 静的画像データベース（事前準備）
    const staticImage = await this.tryStaticDatabase(book);
    if (staticImage) {
      this.cache.set(cacheKey, staticImage);
      return staticImage;
    }

    // 最終手段: 美しいプレースホルダー
    const placeholder = this.generateEnhancedPlaceholder(book);
    this.cache.set(cacheKey, placeholder);
    return placeholder;
  }

  /**
   * Google Books API（改善版）
   */
  private async tryGoogleBooks(book: Book): Promise<string | null> {
    try {
      // ISBNがある場合は最優先
      if (book.isbn) {
        const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${book.isbn}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.items?.[0]?.volumeInfo?.imageLinks) {
          const links = data.items[0].volumeInfo.imageLinks;
          return links.large || links.medium || links.thumbnail;
        }
      }

      // タイトルと著者で検索（正確性重視）
      const query = `intitle:"${book.title}" inauthor:"${book.author}"`;
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&langRestrict=ja`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.items?.length > 0) {
        // タイトルが完全一致するものを優先
        const exactMatch = data.items.find((item: any) => 
          item.volumeInfo.title === book.title
        );
        
        if (exactMatch?.volumeInfo?.imageLinks) {
          const links = exactMatch.volumeInfo.imageLinks;
          return links.large || links.medium || links.thumbnail;
        }
      }
    } catch (error) {
      console.error('Google Books API エラー:', error);
    }

    return null;
  }

  /**
   * Open Library API
   */
  private async tryOpenLibrary(book: Book): Promise<string | null> {
    try {
      if (book.isbn) {
        const coverUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg?default=false`;
        const response = await fetch(coverUrl, { method: 'HEAD' });
        
        if (response.ok) {
          console.log('✅ Open Libraryで画像発見');
          return coverUrl;
        }
      }
    } catch (error) {
      console.error('Open Library エラー:', error);
    }

    return null;
  }

  /**
   * バックエンドAPI（Playwright + Gemini）
   */
  private async tryBackendScraper(book: Book): Promise<string | null> {
    try {
      const response = await fetch(`${this.BACKEND_API_URL}/api/book-cover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          genre: book.categories?.[0] || 'general'
        })
      });

      const data = await response.json();
      
      if (data.success && data.imageUrl) {
        console.log('✅ バックエンドスクレイパーで画像発見');
        return data.imageUrl;
      }
    } catch (error) {
      console.error('バックエンドAPI エラー:', error);
    }

    return null;
  }

  /**
   * 静的画像データベース（事前に収集した画像）
   */
  private async tryStaticDatabase(book: Book): Promise<string | null> {
    try {
      // public/book-covers/ に事前に配置した画像をチェック
      const possibleFiles = [
        `${book.isbn}.jpg`,
        `${book.id}.jpg`,
        `${book.title.replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '')}.jpg`
      ];

      for (const filename of possibleFiles) {
        const url = `/book-covers/${filename}`;
        const response = await fetch(url, { method: 'HEAD' });
        
        if (response.ok) {
          console.log('✅ 静的画像データベースで発見');
          return url;
        }
      }
    } catch (error) {
      console.error('静的データベース エラー:', error);
    }

    return null;
  }

  /**
   * 改善されたプレースホルダー生成
   */
  private generateEnhancedPlaceholder(book: Book): string {
    // ジャンル別の色scheme
    const colorSchemes: { [key: string]: { primary: string; secondary: string } } = {
      '冒険': { primary: '#FF6B6B', secondary: '#4ECDC4' },
      'ファンタジー': { primary: '#9B59B6', secondary: '#3498DB' },
      '科学': { primary: '#3498DB', secondary: '#2ECC71' },
      '日本の名作': { primary: '#E74C3C', secondary: '#F39C12' },
      'default': { primary: '#34495E', secondary: '#95A5A6' }
    };

    const mainCategory = book.categories?.[0] || 'default';
    const scheme = colorSchemes[mainCategory] || colorSchemes.default;
    
    // 美しいグラデーションプレースホルダー
    const svg = `<svg width="120" height="180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad${book.id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${scheme.primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${scheme.secondary};stop-opacity:1" />
        </linearGradient>
        <pattern id="pattern${book.id}" patternUnits="userSpaceOnUse" width="40" height="40">
          <circle cx="20" cy="20" r="1.5" fill="rgba(255,255,255,0.1)"/>
        </pattern>
      </defs>
      <rect width="120" height="180" fill="url(#grad${book.id})"/>
      <rect width="120" height="180" fill="url(#pattern${book.id})"/>
      <rect x="10" y="10" width="100" height="160" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <text x="60" y="90" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white">
        ${book.title.substring(0, 8)}
      </text>
      <text x="60" y="110" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.8)">
        ${book.author.substring(0, 10)}
      </text>
    </svg>`;

    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  }

  /**
   * バッチ更新用メソッド
   */
  async updateAllBookCovers(books: Book[]): Promise<void> {
    console.log(`📚 ${books.length}冊の表紙を更新開始`);
    
    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      
      // 進捗表示
      if (i % 10 === 0) {
        console.log(`進捗: ${i}/${books.length} (${(i/books.length*100).toFixed(1)}%)`);
      }
      
      // API制限対策
      if (i > 0 && i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      await this.getBookCover(book);
    }
    
    console.log('✅ 全書籍の表紙更新完了');
  }
}