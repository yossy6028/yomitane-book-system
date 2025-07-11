import { Book } from '../../types/Book';

/**
 * バックエンドAPI経由の画像取得サービス
 * 確実で高速な画像取得を実現
 */
export class BackendImageService {
  private static instance: BackendImageService;
  private readonly BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
  private cache = new Map<string, string>();
  private pendingRequests = new Map<string, Promise<string>>();

  static getInstance(): BackendImageService {
    if (!this.instance) {
      this.instance = new BackendImageService();
    }
    return this.instance;
  }

  /**
   * 書籍の表紙画像URLを取得（バックエンド経由）
   */
  async getImageForBook(book: Book): Promise<string> {
    console.group(`🔍 [${book.id}] バックエンド経由表紙検索: "${book.title}" by "${book.author}"`);
    console.log(`📋 ISBN: ${book.isbn || 'なし'}`);
    console.log(`⏰ 検索開始時刻: ${new Date().toLocaleTimeString()}`);
    
    try {
      // 既存の画像チェック（Vision検証強化により無効化）
      // 🚨 緊急修正: 既存画像を無視してVision検証を強制実行
      const IGNORE_EXISTING_IMAGES = true;
      
      if (!IGNORE_EXISTING_IMAGES && book.coverImage && book.coverImage.trim() !== '') {
        console.log(`✅ 既存画像使用: ${book.coverImage}`);
        console.groupEnd();
        return book.coverImage;
      } else if (book.coverImage && book.coverImage.trim() !== '') {
        console.log(`🧹 既存画像を無視してVision検証で新しい画像を取得: ${book.coverImage.substring(0, 60)}...`);
      }

      // キャッシュチェック（Vision検証強化により一時的に無効化）
      const cacheKey = `${book.id}_${book.title}_${book.author}_${book.isbn || ''}`;
      console.log(`🔑 キャッシュキー: ${cacheKey}`);
      
      // 🚨 緊急対応: Vision検証が強化されたためキャッシュを無効化
      // ユーザー報告の不適切な画像表示問題を解決するため
      const FORCE_BYPASS_CACHE = true;
      
      if (!FORCE_BYPASS_CACHE) {
        const cachedUrl = this.cache.get(cacheKey);
        if (cachedUrl) {
          console.log(`💾 キャッシュヒット: ${cachedUrl}`);
          console.log(`📊 現在のキャッシュサイズ: ${this.cache.size}`);
          console.groupEnd();
          return cachedUrl;
        }
      } else {
        console.log(`🧹 キャッシュバイパス: Vision検証強化により新しい画像を取得`);
        this.cache.delete(cacheKey); // 古いキャッシュを削除
      }

      // 重複リクエスト防止
      const pendingRequest = this.pendingRequests.get(cacheKey);
      if (pendingRequest) {
        console.log(`⏳ バックエンド検索中のリクエストを待機...`);
        const result = await pendingRequest;
        console.groupEnd();
        return result;
      }

      // バックエンドAPIで検索
      console.log(`🚀 バックエンドAPIで検索開始...`);
      const searchPromise = this.searchViaBackend(book);
      this.pendingRequests.set(cacheKey, searchPromise);

      try {
        const result = await searchPromise;
        this.pendingRequests.delete(cacheKey);
        this.cache.set(cacheKey, result);
        console.log(`✅ バックエンド検索完了・キャッシュ保存: ${result}`);
        console.log(`📊 更新後キャッシュサイズ: ${this.cache.size}`);
        console.groupEnd();
        return result;
      } catch (error) {
        this.pendingRequests.delete(cacheKey);
        throw error;
      }

    } catch (error) {
      console.error(`❌ バックエンド画像検索エラー: ${book.title}`, error);
      const fallbackImage = this.generatePlaceholder(book);
      console.log(`🔄 プレースホルダー生成: ${fallbackImage}`);
      console.groupEnd();
      return fallbackImage;
    }
  }

  /**
   * バックエンドAPI経由での検索
   */
  private async searchViaBackend(book: Book): Promise<string> {
    try {
      console.log(`📡 バックエンドAPIリクエスト: ${this.BACKEND_URL}/api/book-cover`);
      
      const response = await fetch(`${this.BACKEND_URL}/api/book-cover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          isbn: book.isbn || '',
          genre: book.categories?.join(', ') || '',
          useVisionValidation: true // 🤖 Vision検証を有効化
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }

      const result = await response.json();
      console.log(`📊 バックエンドレスポンス:`, {
        success: result.success,
        source: result.source,
        searchMethod: result.searchMethod,
        visionValidationUsed: result.visionValidationUsed
      });

      if (result.success && result.imageUrl) {
        // HTTPSに変換
        const httpsUrl = result.imageUrl.replace('http:', 'https:');
        console.log(`✅ バックエンド検索成功: ${httpsUrl.substring(0, 50)}...`);
        console.log(`📊 検索方法: ${result.searchMethod || '不明'}`);
        console.log(`🤖 Vision検証: ${result.visionValidationUsed ? '✅ 使用済み' : '❌ 未使用'}`);
        return httpsUrl;
      } else {
        console.log(`❌ バックエンド検索失敗: ${result.error || '画像URL取得失敗'}`);
        return this.generatePlaceholder(book);
      }

    } catch (error) {
      console.error('バックエンドAPI通信エラー:', error);
      // フォールバック: プレースホルダー生成
      return this.generatePlaceholder(book);
    }
  }

  /**
   * プレースホルダー画像の生成
   */
  private generatePlaceholder(book: Book): string {
    try {
      const title = book.title.substring(0, 20);
      const author = book.author.substring(0, 15);
      
      const svg = `
        <svg width="120" height="160" xmlns="http://www.w3.org/2000/svg">
          <rect width="120" height="160" fill="#f3f4f6"/>
          <rect x="10" y="10" width="100" height="140" fill="#e5e7eb" stroke="#d1d5db"/>
          <text x="60" y="30" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#6b7280">📚</text>
          <foreignObject x="15" y="40" width="90" height="80">
            <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial; font-size: 8px; color: #374151; text-align: center; line-height: 1.2;">
              <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
              <div>${author}</div>
            </div>
          </foreignObject>
          <text x="60" y="140" text-anchor="middle" font-family="Arial, sans-serif" font-size="6" fill="#9ca3af">画像なし</text>
        </svg>
      `;
      
      return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    } catch (error) {
      console.error('プレースホルダー生成エラー:', error);
      // 最小限のフォールバック
      return `data:image/svg+xml;base64,${btoa('<svg width="120" height="160" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="160" fill="#f3f4f6"/><text x="60" y="80" text-anchor="middle" font-family="Arial" font-size="12" fill="#6b7280">📚</text></svg>')}`;
    }
  }

  /**
   * キャッシュ統計情報を取得
   */
  getCacheStats(): { cacheSize: number; pendingRequests: number } {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size
    };
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log('🗑️ バックエンド画像サービスキャッシュクリア完了');
  }
}