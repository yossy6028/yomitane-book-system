/**
 * 表紙画像キャッシュ管理
 * メモリ効率とリクエスト重複防止
 */
export class ImageCache {
  private static instance: ImageCache;
  private imageCache = new Map<string, string>();
  private pendingRequests = new Map<string, Promise<string>>();
  private readonly MAX_CACHE_SIZE = 500; // 最大キャッシュ数

  static getInstance(): ImageCache {
    if (!this.instance) {
      this.instance = new ImageCache();
    }
    return this.instance;
  }

  /**
   * キャッシュキーを生成（ISBN優先）
   */
  private generateCacheKey(title: string, author: string, isbn?: string): string {
    if (isbn) {
      return `isbn:${isbn}`;
    }
    return `title:${title}|author:${author}`;
  }

  /**
   * キャッシュから画像URLを取得
   */
  get(title: string, author: string, isbn?: string): string | null {
    const key = this.generateCacheKey(title, author, isbn);
    return this.imageCache.get(key) || null;
  }

  /**
   * キャッシュに画像URLを保存
   */
  set(title: string, author: string, imageUrl: string, isbn?: string): void {
    const key = this.generateCacheKey(title, author, isbn);
    
    // キャッシュサイズ制限
    if (this.imageCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.imageCache.keys().next().value;
      this.imageCache.delete(firstKey);
    }
    
    this.imageCache.set(key, imageUrl);
  }

  /**
   * 同じリクエストの重複実行を防止
   */
  getPendingRequest(title: string, author: string, isbn?: string): Promise<string> | null {
    const key = this.generateCacheKey(title, author, isbn);
    return this.pendingRequests.get(key) || null;
  }

  /**
   * 実行中リクエストを登録
   */
  setPendingRequest(title: string, author: string, promise: Promise<string>, isbn?: string): void {
    const key = this.generateCacheKey(title, author, isbn);
    this.pendingRequests.set(key, promise);
  }

  /**
   * 実行中リクエストを削除
   */
  removePendingRequest(title: string, author: string, isbn?: string): void {
    const key = this.generateCacheKey(title, author, isbn);
    this.pendingRequests.delete(key);
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.imageCache.clear();
    this.pendingRequests.clear();
  }

  /**
   * 特定の書籍のキャッシュをクリア
   */
  clearBookCache(title: string, author: string, isbn?: string): void {
    const key = this.generateCacheKey(title, author, isbn);
    this.imageCache.delete(key);
    this.pendingRequests.delete(key);
  }

  /**
   * キャッシュ統計情報
   */
  getStats(): { cacheSize: number; pendingRequests: number } {
    return {
      cacheSize: this.imageCache.size,
      pendingRequests: this.pendingRequests.size
    };
  }
}