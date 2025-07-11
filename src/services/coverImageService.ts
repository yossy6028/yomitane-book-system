import { Book } from '../types/Book';
import { IntegratedImageSearchService } from './imageSearch/IntegratedImageSearchService';
import { MCPRealTimeService } from './imageSearch/MCPRealTimeService';

/**
 * 表紙画像取得サービス（MCP統合版）
 * MCPツール + Vision API + 厳格検索 + フォールバックによる高精度画像取得
 */
class CoverImageService {
  private imageSearchService = IntegratedImageSearchService.getInstance();
  private mcpRealTimeService = MCPRealTimeService.getInstance();
  
  // MCP優先モードフラグ
  private readonly USE_MCP_PRIORITY = true;

  /**
   * 書籍の表紙画像URLを取得
   * @deprecated 代わりに getImageForBook を使用してください
   */
  async getCoverImageUrl(book: Book): Promise<string> {
    return this.imageSearchService.getImageForBook(book);
  }

  /**
   * 書籍の表紙画像URLを取得（MCP統合版）
   * MCPツール優先 + バックエンドAPI + フォールバック
   */
  async getImageForBook(book: Book): Promise<string> {
    console.log(`🔍 [MCP統合] 表紙画像取得開始: "${book.title}" by "${book.author}"`);

    // MCP優先モードの場合、MCPツールを最初に試行
    if (this.USE_MCP_PRIORITY) {
      try {
        console.log(`🚀 MCP優先検索実行...`);
        const mcpResult = await this.mcpRealTimeService.getImageForBook(book);
        
        if (mcpResult && !mcpResult.startsWith('data:image/svg+xml')) {
          console.log(`✅ MCP検索成功: ${mcpResult.substring(0, 50)}...`);
          return mcpResult;
        } else {
          console.log(`⚠️ MCP検索結果はプレースホルダー - バックエンドAPIへフォールバック`);
        }
      } catch (error) {
        console.error(`❌ MCP検索エラー - バックエンドAPIへフォールバック:`, error);
      }
    }

    // バックエンドAPI呼び出し
    try {
      console.log(`🔍 バックエンドAPI呼び出し...`);
      
      const response = await fetch('http://localhost:3001/api/book-cover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          isbn: book.isbn || '',
          publisher: book.publisher || '',
          publishYear: book.publishedDate ? book.publishedDate.substring(0, 4) : '',
          useVisionValidation: true, // Vision検証を有効化
          accuracyMode: 'mcp-multi-source' // MCPツール群統合検索システムを使用
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.imageUrl) {
        console.log(`✅ バックエンドAPI成功: ${data.imageUrl.substring(0, 50)}...`);
        return data.imageUrl;
      } else {
        console.log(`❌ バックエンドAPI失敗: ${book.title}`);
      }
    } catch (error) {
      console.error('バックエンドAPI呼び出しエラー:', error);
    }

    // 最終フォールバック - 統合サービス
    try {
      console.log(`🔄 最終フォールバック - 統合サービス`);
      const fallbackResult = await this.imageSearchService.getImageForBook(book);
      console.log(`✅ フォールバック成功: ${fallbackResult.substring(0, 50)}...`);
      return fallbackResult;
    } catch (error) {
      console.error('フォールバック検索エラー:', error);
      return this.generateFinalPlaceholder(book);
    }
  }

  /**
   * 書籍リスト全体の画像を一括取得
   */
  async enrichBooksWithCoverImages(books: Book[]): Promise<Book[]> {
    console.log(`🖼️ ${books.length}冊の表紙画像を取得中...`);
    
    const enrichedBooks = await Promise.all(
      books.map(async (book, index) => {
        const coverImageUrl = await this.getImageForBook(book);
        
        if (index % 10 === 0) {
          console.log(`📚 処理中: ${index + 1}/${books.length} 冊`);
        }
        
        return {
          ...book,
          coverImage: coverImageUrl
        };
      })
    );

    console.log('✅ 全書籍の表紙画像取得完了');
    return enrichedBooks;
  }

  /**
   * キャッシュ統計情報を取得（MCP統合版）
   */
  getCacheStats(): { cacheSize: number; pendingRequests: number; mcpStats?: any } {
    const baseStats = this.imageSearchService.getCacheStats();
    const mcpStats = this.mcpRealTimeService.getStats();
    
    return {
      ...baseStats,
      mcpStats
    };
  }

  /**
   * キャッシュをクリア（MCP統合版）
   */
  clearCache(): void {
    this.imageSearchService.clearCache();
    this.mcpRealTimeService.clearCache();
    console.log('✅ 全キャッシュクリア完了（MCP含む）');
  }

  /**
   * 最終プレースホルダー画像生成
   */
  private generateFinalPlaceholder(book: Book): string {
    const title = book.title.substring(0, 20);
    const author = book.author.substring(0, 15);
    
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
      <svg width="200" height="280" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ffcdd2;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f8bbd9;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="200" height="280" fill="url(#grad)" stroke="#e91e63" stroke-width="2" rx="8"/>
        <text x="100" y="80" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#c2185b">
          ${title}
        </text>
        <text x="100" y="110" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#c2185b">
          ${author}
        </text>
        <circle cx="100" cy="160" r="25" fill="#fce4ec" stroke="#f48fb1" stroke-width="2"/>
        <text x="100" y="170" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#e91e63">
          ❌
        </text>
        <text x="100" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#666">
          画像取得失敗
        </text>
      </svg>
    `)}`;
  }
}

export const coverImageService = new CoverImageService();