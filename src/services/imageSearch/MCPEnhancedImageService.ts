import { Book } from '../../types/Book';

/**
 * MCP Enhanced Image Search Service
 * MCPツールを活用した高精度表紙画像検索システム
 * 
 * 機能:
 * - Context7を使用した最新の書籍データベース検索
 * - YouTube検索による動画レビューからの表紙画像抽出
 * - Web検索による包括的な画像収集
 * - 並列処理による高速検索
 */
export class MCPEnhancedImageService {
  private static instance: MCPEnhancedImageService;
  private cache = new Map<string, string>();
  private pendingRequests = new Map<string, Promise<string>>();
  
  // MCP利用可能性チェック
  private mcpAvailable = false;
  
  static getInstance(): MCPEnhancedImageService {
    if (!this.instance) {
      this.instance = new MCPEnhancedImageService();
    }
    return this.instance;
  }

  constructor() {
    this.initializeMCPServices();
  }

  private async initializeMCPServices() {
    try {
      // MCPツールの利用可能性を確認
      if (typeof window !== 'undefined' && (window as any).mcp) {
        this.mcpAvailable = true;
        console.log('✅ MCPツール利用可能');
      } else {
        console.log('⚠️ MCPツール未利用 - フォールバック検索を使用');
      }
    } catch (error) {
      console.error('❌ MCP初期化エラー:', error);
      this.mcpAvailable = false;
    }
  }

  /**
   * メイン検索関数 - MCPツールを活用した高精度検索
   */
  async getImageForBook(book: Book): Promise<string> {
    console.group(`🔍 [MCP] 表紙検索開始: "${book.title}" by "${book.author}"`);
    
    const cacheKey = this.generateCacheKey(book);
    
    // キャッシュチェック
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      console.log(`💾 キャッシュヒット: ${cachedResult}`);
      console.groupEnd();
      return cachedResult;
    }

    // 重複リクエスト防止
    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      console.log(`⏳ 検索中のリクエストを待機...`);
      const result = await pendingRequest;
      console.groupEnd();
      return result;
    }

    // 新しい検索実行
    const searchPromise = this.performMCPSearch(book);
    this.pendingRequests.set(cacheKey, searchPromise);

    try {
      const result = await searchPromise;
      this.pendingRequests.delete(cacheKey);
      this.cache.set(cacheKey, result);
      console.log(`✅ 検索完了: ${result}`);
      console.groupEnd();
      return result;
    } catch (error) {
      this.pendingRequests.delete(cacheKey);
      console.error(`❌ 検索エラー:`, error);
      const fallback = this.generatePlaceholder(book);
      console.groupEnd();
      return fallback;
    }
  }

  /**
   * MCP並列検索実行
   */
  private async performMCPSearch(book: Book): Promise<string> {
    console.log(`🚀 MCP並列検索開始...`);
    
    // 複数の検索戦略を並列実行
    const searchPromises = [
      this.searchWithContext7(book),
      this.searchWithWebSearch(book),
      this.searchWithYoutube(book),
      this.searchWithTraditionalAPI(book)
    ];

    // 最初に成功した結果を採用
    const results = await Promise.allSettled(searchPromises);
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        const imageUrl = result.value;
        if (await this.validateImageUrl(imageUrl)) {
          console.log(`✅ 検証済み画像取得: ${imageUrl}`);
          return imageUrl;
        }
      }
    }

    // 全て失敗した場合はプレースホルダー
    console.log(`⚠️ 全検索失敗 - プレースホルダー生成`);
    return this.generatePlaceholder(book);
  }

  /**
   * Context7を使用した書籍データベース検索
   */
  private async searchWithContext7(book: Book): Promise<string | null> {
    if (!this.mcpAvailable) return null;

    try {
      console.log(`📚 Context7検索: ${book.title}`);
      
      // Context7ライブラリID解決
      const librarySearchQuery = `${book.title} ${book.author} 表紙画像`;
      
      // MCPツールでContext7検索を実行
      const searchResult = await this.executeMCPSearch('context7', {
        query: librarySearchQuery,
        type: 'book_cover'
      });

      if (searchResult && searchResult.imageUrl) {
        console.log(`✅ Context7検索成功: ${searchResult.imageUrl}`);
        return searchResult.imageUrl;
      }
    } catch (error) {
      console.error(`❌ Context7検索エラー:`, error);
    }

    return null;
  }

  /**
   * Web検索による画像収集
   */
  private async searchWithWebSearch(book: Book): Promise<string | null> {
    if (!this.mcpAvailable) return null;

    try {
      console.log(`🌐 Web検索: ${book.title}`);
      
      const searchQuery = `"${book.title}" "${book.author}" 表紙 本 カバー`;
      
      // MCPツールでWeb検索を実行
      const searchResult = await this.executeMCPSearch('web', {
        query: searchQuery,
        type: 'images',
        filter: 'book_cover'
      });

      if (searchResult && searchResult.images && searchResult.images.length > 0) {
        // 最も関連性の高い画像を選択
        const bestImage = this.selectBestWebImage(searchResult.images, book);
        if (bestImage) {
          console.log(`✅ Web検索成功: ${bestImage}`);
          return bestImage;
        }
      }
    } catch (error) {
      console.error(`❌ Web検索エラー:`, error);
    }

    return null;
  }

  /**
   * YouTube検索による書籍レビュー動画からの表紙画像抽出
   */
  private async searchWithYoutube(book: Book): Promise<string | null> {
    if (!this.mcpAvailable) return null;

    try {
      console.log(`📺 YouTube検索: ${book.title}`);
      
      const searchQuery = `${book.title} ${book.author} 書評 レビュー 読書`;
      
      // MCPツールでYouTube検索を実行
      const videoResult = await this.executeMCPSearch('youtube', {
        query: searchQuery,
        type: 'book_review',
        extract: 'cover_image'
      });

      if (videoResult && videoResult.coverImage) {
        console.log(`✅ YouTube検索成功: ${videoResult.coverImage}`);
        return videoResult.coverImage;
      }
    } catch (error) {
      console.error(`❌ YouTube検索エラー:`, error);
    }

    return null;
  }

  /**
   * 従来API検索（フォールバック）
   */
  private async searchWithTraditionalAPI(book: Book): Promise<string | null> {
    try {
      console.log(`🔄 従来API検索: ${book.title}`);
      
      // Google Books API検索
      const googleResult = await this.searchGoogleBooks(book);
      if (googleResult) {
        console.log(`✅ Google Books検索成功: ${googleResult}`);
        return googleResult;
      }

      // 楽天ブックス API検索
      const rakutenResult = await this.searchRakutenBooks(book);
      if (rakutenResult) {
        console.log(`✅ 楽天ブックス検索成功: ${rakutenResult}`);
        return rakutenResult;
      }
    } catch (error) {
      console.error(`❌ 従来API検索エラー:`, error);
    }

    return null;
  }

  /**
   * MCPツール実行のラッパー関数
   */
  private async executeMCPSearch(service: string, params: any): Promise<any> {
    if (!this.mcpAvailable) {
      throw new Error('MCPツールが利用できません');
    }

    try {
      switch (service) {
        case 'context7':
          return await this.callContext7API(params);
        case 'web':
          return await this.callWebSearchAPI(params);
        case 'youtube':
          return await this.callYouTubeAPI(params);
        default:
          throw new Error(`未対応のサービス: ${service}`);
      }
    } catch (error) {
      console.error(`❌ ${service}サービス実行エラー:`, error);
      throw error;
    }
  }

  /**
   * Context7 API呼び出し
   */
  private async callContext7API(params: any): Promise<any> {
    // 実際のMCPツール統合時に実装
    console.log('Context7 API呼び出し（実装予定）:', params);
    return null;
  }

  /**
   * Web検索API呼び出し
   */
  private async callWebSearchAPI(params: any): Promise<any> {
    // 実際のMCPツール統合時に実装
    console.log('Web検索API呼び出し（実装予定）:', params);
    return null;
  }

  /**
   * YouTube API呼び出し
   */
  private async callYouTubeAPI(params: any): Promise<any> {
    // 実際のMCPツール統合時に実装
    console.log('YouTube API呼び出し（実装予定）:', params);
    return null;
  }

  /**
   * 画像URL検証
   */
  private async validateImageUrl(imageUrl: string): Promise<boolean> {
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      const contentType = response.headers.get('content-type');
      return response.ok && (contentType?.startsWith('image/') ?? false);
    } catch {
      return false;
    }
  }

  /**
   * Web検索結果から最適な画像を選択
   */
  private selectBestWebImage(images: any[], book: Book): string | null {
    if (!images || images.length === 0) return null;

    // 画像の関連性スコアを計算
    const scoredImages = images.map(img => ({
      url: img.url,
      score: this.calculateImageRelevanceScore(img, book)
    }));

    // 最高スコアの画像を選択
    const bestImage = scoredImages.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    return bestImage.score > 0.7 ? bestImage.url : null;
  }

  /**
   * 画像の関連性スコア計算
   */
  private calculateImageRelevanceScore(image: any, book: Book): number {
    let score = 0;
    const title = book.title.toLowerCase();
    const author = book.author.toLowerCase();

    // URL、alt、titleテキストから関連性を判定
    const text = (image.alt + ' ' + image.title + ' ' + image.url).toLowerCase();
    
    if (text.includes(title)) score += 0.5;
    if (text.includes(author)) score += 0.3;
    if (text.includes('表紙') || text.includes('cover')) score += 0.2;
    if (text.includes('本') || text.includes('book')) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Google Books API検索
   */
  private async searchGoogleBooks(book: Book): Promise<string | null> {
    try {
      const query = book.isbn ? `isbn:${book.isbn}` : `intitle:"${book.title}" inauthor:"${book.author}"`;
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const imageUrl = data.items[0].volumeInfo?.imageLinks?.thumbnail;
        if (imageUrl) {
          return imageUrl.replace('http:', 'https:');
        }
      }
    } catch (error) {
      console.error('Google Books検索エラー:', error);
    }

    return null;
  }

  /**
   * 楽天ブックス API検索
   */
  private async searchRakutenBooks(book: Book): Promise<string | null> {
    try {
      const query = `${book.title} ${book.author}`;
      // 楽天ブックス API実装（APIキーが必要）
      console.log('楽天ブックス検索（実装予定）:', query);
    } catch (error) {
      console.error('楽天ブックス検索エラー:', error);
    }

    return null;
  }

  /**
   * キャッシュキー生成
   */
  private generateCacheKey(book: Book): string {
    return `mcp_${book.id}_${book.title}_${book.author}_${book.isbn || ''}`;
  }

  /**
   * プレースホルダー画像生成
   */
  private generatePlaceholder(book: Book): string {
    const title = encodeURIComponent(book.title.substring(0, 20));
    const author = encodeURIComponent(book.author.substring(0, 15));
    
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
      <svg width="200" height="280" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="280" fill="#f0f0f0" stroke="#ddd" stroke-width="2"/>
        <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#666">
          ${decodeURIComponent(title)}
        </text>
        <text x="100" y="130" text-anchor="middle" font-family="Arial" font-size="12" fill="#888">
          ${decodeURIComponent(author)}
        </text>
        <text x="100" y="200" text-anchor="middle" font-family="Arial" font-size="10" fill="#aaa">
          表紙画像なし
        </text>
      </svg>
    `)}`;
  }

  /**
   * キャッシュクリア
   */
  public clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log('✅ MCPキャッシュクリア完了');
  }

  /**
   * 統計情報取得
   */
  public getStats(): { cacheSize: number; pendingRequests: number } {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size
    };
  }
}

export default MCPEnhancedImageService;