import { Book } from '../../types/Book';

/**
 * MCP Real-Time Image Service
 * 実際のMCPツール（Context7、WebSearch、YouTube）を活用した
 * リアルタイム高精度表紙画像検索システム
 */
export class MCPRealTimeService {
  private static instance: MCPRealTimeService;
  private cache = new Map<string, string>();
  private pendingRequests = new Map<string, Promise<string>>();
  
  // 実際のMCPツール利用フラグ
  private readonly USE_REAL_MCP = true;
  
  static getInstance(): MCPRealTimeService {
    if (!this.instance) {
      this.instance = new MCPRealTimeService();
    }
    return this.instance;
  }

  /**
   * 実際のMCPツールを使用した表紙画像検索
   */
  async getImageForBook(book: Book): Promise<string> {
    console.group(`🔍 [MCP-Real] 表紙検索開始: "${book.title}" by "${book.author}"`);
    
    const cacheKey = this.generateCacheKey(book);
    
    // キャッシュチェック
    if (this.cache.has(cacheKey)) {
      const cachedResult = this.cache.get(cacheKey)!;
      console.log(`💾 キャッシュヒット: ${cachedResult}`);
      console.groupEnd();
      return cachedResult;
    }

    // 重複リクエスト防止
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`⏳ 検索中のリクエストを待機...`);
      const result = await this.pendingRequests.get(cacheKey)!;
      console.groupEnd();
      return result;
    }

    // 新しい検索実行
    const searchPromise = this.performRealMCPSearch(book);
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
   * 実際のMCPツールを使用した並列検索
   */
  private async performRealMCPSearch(book: Book): Promise<string> {
    console.log(`🚀 実際のMCPツール検索開始...`);
    
    // MCPツールが利用可能かチェック
    if (!this.USE_REAL_MCP) {
      console.log(`⚠️ MCPツール無効 - フォールバック検索使用`);
      return this.performFallbackSearch(book);
    }

    try {
      // 1. Context7検索を試行
      const context7Result = await this.searchWithRealContext7(book);
      if (context7Result) {
        return context7Result;
      }

      // 2. Web検索を試行
      const webSearchResult = await this.searchWithRealWebSearch(book);
      if (webSearchResult) {
        return webSearchResult;
      }

      // 3. YouTube検索を試行
      const youtubeResult = await this.searchWithRealYouTube(book);
      if (youtubeResult) {
        return youtubeResult;
      }

      // 4. 全て失敗した場合はフォールバック
      console.log(`⚠️ 全MCP検索失敗 - フォールバック検索使用`);
      return this.performFallbackSearch(book);

    } catch (error) {
      console.error(`❌ MCP検索エラー:`, error);
      return this.performFallbackSearch(book);
    }
  }

  /**
   * 実際のContext7 MCPツールを使用した検索
   */
  private async searchWithRealContext7(book: Book): Promise<string | null> {
    console.log(`📚 Context7 MCP検索: ${book.title}`);
    
    try {
      // Context7ライブラリID解決
      const libraryQuery = `${book.title} ${book.author}`;
      
      // 実際のMCPツール呼び出し（フロントエンドからバックエンドへの通信）
      const response = await fetch('/api/mcp-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: 'context7',
          action: 'resolve-library-id',
          params: {
            libraryName: libraryQuery
          }
        })
      });

      if (!response.ok) {
        console.error(`❌ Context7 API応答エラー: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (data.success && data.libraryId) {
        // ライブラリIDを使用してドキュメント取得
        const docsResponse = await fetch('/api/mcp-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            service: 'context7',
            action: 'get-library-docs',
            params: {
              context7CompatibleLibraryID: data.libraryId,
              topic: 'book cover image',
              tokens: 5000
            }
          })
        });

        if (docsResponse.ok) {
          const docsData = await docsResponse.json();
          const imageUrl = this.extractImageFromContext7Docs(docsData.docs);
          
          if (imageUrl) {
            console.log(`✅ Context7検索成功: ${imageUrl}`);
            return imageUrl;
          }
        }
      }

      console.log(`⚠️ Context7検索結果なし`);
      return null;

    } catch (error) {
      console.error(`❌ Context7検索エラー:`, error);
      return null;
    }
  }

  /**
   * 実際のWeb検索MCPツールを使用した検索
   */
  private async searchWithRealWebSearch(book: Book): Promise<string | null> {
    console.log(`🌐 Web検索MCP: ${book.title}`);
    
    try {
      const searchQuery = `"${book.title}" "${book.author}" 表紙 book cover`;
      
      // 実際のMCPツール呼び出し
      const response = await fetch('/api/mcp-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: 'web-search',
          action: 'search',
          params: {
            query: searchQuery,
            allowed_domains: ['amazon.co.jp', 'rakuten.co.jp', 'honto.jp', 'tsutaya.co.jp']
          }
        })
      });

      if (!response.ok) {
        console.error(`❌ Web検索API応答エラー: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (data.success && data.results && data.results.length > 0) {
        const imageUrl = this.extractImageFromWebResults(data.results, book);
        
        if (imageUrl) {
          console.log(`✅ Web検索成功: ${imageUrl}`);
          return imageUrl;
        }
      }

      console.log(`⚠️ Web検索結果なし`);
      return null;

    } catch (error) {
      console.error(`❌ Web検索エラー:`, error);
      return null;
    }
  }

  /**
   * 実際のYouTube MCPツールを使用した検索
   */
  private async searchWithRealYouTube(book: Book): Promise<string | null> {
    console.log(`📺 YouTube MCP検索: ${book.title}`);
    
    try {
      const searchQuery = `${book.title} ${book.author} 書評 レビュー`;
      
      // YouTube検索でブックレビュー動画を取得
      const response = await fetch('/api/mcp-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: 'youtube',
          action: 'search',
          params: {
            query: searchQuery,
            maxResults: 5
          }
        })
      });

      if (!response.ok) {
        console.error(`❌ YouTube API応答エラー: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (data.success && data.videos && data.videos.length > 0) {
        // 動画のサムネイルから表紙画像を抽出
        const imageUrl = this.extractImageFromYouTubeVideos(data.videos, book);
        
        if (imageUrl) {
          console.log(`✅ YouTube検索成功: ${imageUrl}`);
          return imageUrl;
        }
      }

      console.log(`⚠️ YouTube検索結果なし`);
      return null;

    } catch (error) {
      console.error(`❌ YouTube検索エラー:`, error);
      return null;
    }
  }

  /**
   * Context7ドキュメントから画像URLを抽出
   */
  private extractImageFromContext7Docs(docs: string): string | null {
    if (!docs) return null;

    try {
      // ドキュメント内のマークダウンや画像URLを検索
      const imageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/gi;
      const matches = docs.match(imageRegex);
      
      if (matches && matches.length > 0) {
        // 最初に見つかった画像URLを返す
        let imageUrl = matches[0];
        
        // マークダウン形式の場合はURL部分を抽出
        const markdownMatch = imageUrl.match(/\((https?:\/\/[^)]+)\)/);
        if (markdownMatch) {
          imageUrl = markdownMatch[1];
        }
        
        return imageUrl;
      }
    } catch (error) {
      console.error('Context7ドキュメント解析エラー:', error);
    }

    return null;
  }

  /**
   * Web検索結果から画像URLを抽出
   */
  private extractImageFromWebResults(results: any[], book: Book): string | null {
    if (!results || results.length === 0) return null;

    try {
      // 書籍販売サイトからの結果を優先
      const bookSiteResults = results.filter(result => {
        const url = result.url?.toLowerCase() || '';
        return url.includes('amazon') || url.includes('rakuten') || 
               url.includes('honto') || url.includes('tsutaya');
      });

      const targetResults = bookSiteResults.length > 0 ? bookSiteResults : results;

      for (const result of targetResults) {
        // 結果の中から画像URLを抽出
        const content = result.content || result.snippet || '';
        const imageMatch = content.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i);
        
        if (imageMatch) {
          return imageMatch[0];
        }
      }
    } catch (error) {
      console.error('Web検索結果解析エラー:', error);
    }

    return null;
  }

  /**
   * YouTube動画から表紙画像を抽出
   */
  private extractImageFromYouTubeVideos(videos: any[], book: Book): string | null {
    if (!videos || videos.length === 0) return null;

    try {
      for (const video of videos) {
        // 動画のサムネイルを確認
        const thumbnail = video.thumbnail || video.thumbnails?.high?.url || video.thumbnails?.medium?.url;
        
        if (thumbnail) {
          // サムネイルが表紙画像として適切かチェック
          const title = video.title?.toLowerCase() || '';
          const bookTitle = book.title.toLowerCase();
          
          if (title.includes(bookTitle) || title.includes('表紙') || title.includes('レビュー')) {
            return thumbnail;
          }
        }
      }
    } catch (error) {
      console.error('YouTube動画解析エラー:', error);
    }

    return null;
  }

  /**
   * フォールバック検索（従来API）
   */
  private async performFallbackSearch(book: Book): Promise<string> {
    console.log(`🔄 フォールバック検索実行...`);
    
    try {
      // Google Books API検索
      if (book.isbn) {
        const googleResult = await this.searchGoogleBooks(book.isbn);
        if (googleResult) {
          return googleResult;
        }
      }

      // タイトル+著者検索
      const titleAuthorResult = await this.searchGoogleBooksByTitle(book.title, book.author);
      if (titleAuthorResult) {
        return titleAuthorResult;
      }

    } catch (error) {
      console.error('フォールバック検索エラー:', error);
    }

    // 最終的にプレースホルダー画像を生成
    return this.generatePlaceholder(book);
  }

  /**
   * Google Books ISBN検索
   */
  private async searchGoogleBooks(isbn: string): Promise<string | null> {
    try {
      const query = `isbn:${isbn}`;
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const imageUrl = data.items[0].volumeInfo?.imageLinks?.thumbnail;
        if (imageUrl) {
          return imageUrl.replace('http:', 'https:');
        }
      }
    } catch (error) {
      console.error('Google Books ISBN検索エラー:', error);
    }

    return null;
  }

  /**
   * Google Books タイトル+著者検索
   */
  private async searchGoogleBooksByTitle(title: string, author: string): Promise<string | null> {
    try {
      const query = `intitle:"${title}" inauthor:"${author}"`;
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const imageUrl = data.items[0].volumeInfo?.imageLinks?.thumbnail;
        if (imageUrl) {
          return imageUrl.replace('http:', 'https:');
        }
      }
    } catch (error) {
      console.error('Google Books タイトル検索エラー:', error);
    }

    return null;
  }

  /**
   * キャッシュキー生成
   */
  private generateCacheKey(book: Book): string {
    return `mcp_real_${book.id}_${book.title}_${book.author}_${book.isbn || ''}`;
  }

  /**
   * プレースホルダー画像生成
   */
  private generatePlaceholder(book: Book): string {
    const title = book.title.substring(0, 20);
    const author = book.author.substring(0, 15);
    
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
      <svg width="200" height="280" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#e3f2fd;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#bbdefb;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="200" height="280" fill="url(#grad)" stroke="#90caf9" stroke-width="2" rx="8"/>
        <text x="100" y="80" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#1976d2">
          ${title}
        </text>
        <text x="100" y="110" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#1976d2">
          ${author}
        </text>
        <circle cx="100" cy="160" r="30" fill="#e1f5fe" stroke="#4fc3f7" stroke-width="2"/>
        <text x="100" y="170" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#0288d1">
          📚
        </text>
        <text x="100" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#666">
          表紙画像を検索中...
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
    console.log('✅ MCP Real-Timeキャッシュクリア完了');
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

export default MCPRealTimeService;