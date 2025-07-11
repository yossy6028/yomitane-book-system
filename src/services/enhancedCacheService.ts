/**
 * 強化されたキャッシュサービス
 * 多階層キャッシュ、優先度管理、スマートな期限切れ処理
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  priority: 'high' | 'medium' | 'low';
  ttl: number; // 有効期限（ミリ秒）
  tags: string[]; // タグによるグループ化
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
}

class EnhancedCacheService {
  private cache = new Map<string, CacheItem<any>>();
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private storageKey = 'enhanced_cache_v1';

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 200,
      defaultTTL: config.defaultTTL || 30 * 60 * 1000, // 30分
      cleanupInterval: config.cleanupInterval || 5 * 60 * 1000 // 5分
    };

    this.loadFromStorage();
    this.startCleanupTimer();
  }

  /**
   * キャッシュアイテムの保存
   */
  set<T>(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      priority?: 'high' | 'medium' | 'low';
      tags?: string[];
    } = {}
  ): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      accessCount: 0,
      priority: options.priority || 'medium',
      ttl: options.ttl || this.config.defaultTTL,
      tags: options.tags || []
    };

    // キャッシュサイズ制限チェック
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, item);
    this.saveToStorage();
  }

  /**
   * キャッシュアイテムの取得
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // 期限切れチェック
    if (this.isExpired(item)) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }

    // アクセス回数を更新
    item.accessCount++;
    item.timestamp = Date.now(); // LRU更新

    return item.data;
  }

  /**
   * 期限切れチェック
   */
  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  /**
   * 最も使用頻度の低いアイテムを削除
   */
  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let leastScore = Infinity;

    this.cache.forEach((item, key) => {
      // スコア計算（アクセス回数、優先度、古さを考慮）
      const priorityWeights: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
      const priorityWeight = priorityWeights[item.priority] || 1;
      const ageMinutes = (Date.now() - item.timestamp) / (1000 * 60);
      const score = (item.accessCount * priorityWeight) / (1 + ageMinutes / 60);

      if (score < leastScore) {
        leastScore = score;
        leastUsedKey = key;
      }
    });

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      console.log(`🗑️ Evicted cache item: ${leastUsedKey}`);
    }
  }

  /**
   * タグによるキャッシュクリア
   */
  clearByTag(tag: string): number {
    let cleared = 0;
    const keysToDelete: string[] = [];
    
    this.cache.forEach((item, key) => {
      if (item.tags.includes(tag)) {
        keysToDelete.push(key);
        cleared++;
      }
    });
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });
    
    if (cleared > 0) {
      this.saveToStorage();
      console.log(`🗑️ Cleared ${cleared} cache items with tag: ${tag}`);
    }
    
    return cleared;
  }

  /**
   * 期限切れアイテムのクリーンアップ
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((item, key) => {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key);
        cleaned++;
      }
    });

    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });

    if (cleaned > 0) {
      this.saveToStorage();
      console.log(`🧹 Cleaned up ${cleaned} expired cache items`);
    }

    return cleaned;
  }

  /**
   * クリーンアップタイマーの開始
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * LocalStorageからの読み込み
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.cache = new Map(data);
        
        // 読み込み時にクリーンアップ
        this.cleanup();
      }
    } catch (error) {
      console.error('Cache loading error:', error);
      this.cache.clear();
    }
  }

  /**
   * LocalStorageへの保存
   */
  private saveToStorage(): void {
    try {
      const data = Array.from(this.cache.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Cache saving error:', error);
      // ストレージが満杯の場合、古いアイテムを削除
      this.evictLeastUsed();
      try {
        const data = Array.from(this.cache.entries());
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      } catch (retryError) {
        console.error('Cache saving failed even after cleanup:', retryError);
      }
    }
  }

  /**
   * キャッシュ統計の取得
   */
  getStats() {
    const items = Array.from(this.cache.values());
    const now = Date.now();

    return {
      totalItems: this.cache.size,
      maxSize: this.config.maxSize,
      usage: `${Math.round((this.cache.size / this.config.maxSize) * 100)}%`,
      hitRate: this.calculateHitRate(),
      expiredItems: items.filter(item => this.isExpired(item)).length,
      byPriority: {
        high: items.filter(item => item.priority === 'high').length,
        medium: items.filter(item => item.priority === 'medium').length,
        low: items.filter(item => item.priority === 'low').length
      },
      averageAge: items.length > 0 
        ? Math.round(items.reduce((sum, item) => sum + (now - item.timestamp), 0) / items.length / 1000 / 60)
        : 0, // 分単位
      topTags: this.getTopTags()
    };
  }

  /**
   * ヒット率の計算（簡易版）
   */
  private calculateHitRate(): string {
    const items = Array.from(this.cache.values());
    const totalAccess = items.reduce((sum, item) => sum + item.accessCount, 0);
    const hitRate = totalAccess > 0 ? (totalAccess / (totalAccess + items.length)) * 100 : 0;
    return `${Math.round(hitRate)}%`;
  }

  /**
   * よく使われるタグの取得
   */
  private getTopTags(): string[] {
    const tagCounts = new Map<string, number>();
    
    this.cache.forEach((item) => {
      item.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
  }

  /**
   * キーの存在チェック
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    return item !== undefined && !this.isExpired(item);
  }

  /**
   * キャッシュのクリア
   */
  clear(): void {
    this.cache.clear();
    localStorage.removeItem(this.storageKey);
    console.log('🗑️ All cache cleared');
  }

  /**
   * リソースの解放
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.saveToStorage();
  }
}

// シングルトンインスタンス
export const enhancedCache = new EnhancedCacheService({
  maxSize: 150,
  defaultTTL: 20 * 60 * 1000, // 20分
  cleanupInterval: 3 * 60 * 1000 // 3分
});

// 特定用途向けキャッシュ
export const bookDataCache = new EnhancedCacheService({
  maxSize: 100,
  defaultTTL: 60 * 60 * 1000, // 1時間（書籍データは長期保存）
  cleanupInterval: 10 * 60 * 1000 // 10分
});

export const imageCache = new EnhancedCacheService({
  maxSize: 50,
  defaultTTL: 2 * 60 * 60 * 1000, // 2時間（画像は長期保存）
  cleanupInterval: 15 * 60 * 1000 // 15分
});