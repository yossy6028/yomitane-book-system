/**
 * Rate Limit管理サービス
 * MAXプラン範囲内でのAPI使用量制御
 */

interface ApiUsageStats {
  daily: number;
  hourly: number;
  lastReset: number;
  hourlyReset: number;
}

interface RateLimitConfig {
  maxDailyRequests: number;
  maxHourlyRequests: number;
  cacheTTL: number; // キャッシュ有効期限（分）
}

class RateLimitManager {
  private usage: ApiUsageStats;
  private config: RateLimitConfig;
  private cacheKey = 'api_usage_stats';

  constructor() {
    this.config = {
      maxDailyRequests: parseInt(process.env.REACT_APP_MAX_DAILY_REQUESTS || '1000'),
      maxHourlyRequests: parseInt(process.env.REACT_APP_MAX_HOURLY_REQUESTS || '100'),
      cacheTTL: parseInt(process.env.REACT_APP_CACHE_TTL_MINUTES || '30')
    };

    this.usage = this.loadUsageStats();
  }

  /**
   * 使用量統計の読み込み
   */
  private loadUsageStats(): ApiUsageStats {
    const stored = localStorage.getItem(this.cacheKey);
    if (stored) {
      const stats = JSON.parse(stored);
      const now = Date.now();
      
      // 日次リセット（24時間経過）
      if (now - stats.lastReset > 24 * 60 * 60 * 1000) {
        stats.daily = 0;
        stats.lastReset = now;
      }
      
      // 時間リセット（1時間経過）
      if (now - stats.hourlyReset > 60 * 60 * 1000) {
        stats.hourly = 0;
        stats.hourlyReset = now;
      }
      
      return stats;
    }

    const now = Date.now();
    return {
      daily: 0,
      hourly: 0,
      lastReset: now,
      hourlyReset: now
    };
  }

  /**
   * 使用量統計の保存
   */
  private saveUsageStats(): void {
    localStorage.setItem(this.cacheKey, JSON.stringify(this.usage));
  }

  /**
   * API使用可能かチェック
   */
  canMakeRequest(): boolean {
    return this.usage.daily < this.config.maxDailyRequests && 
           this.usage.hourly < this.config.maxHourlyRequests;
  }

  /**
   * API使用量記録
   */
  recordRequest(): void {
    this.usage.daily++;
    this.usage.hourly++;
    this.saveUsageStats();
  }

  /**
   * 残り使用可能回数取得
   */
  getRemainingRequests(): { daily: number; hourly: number } {
    return {
      daily: Math.max(0, this.config.maxDailyRequests - this.usage.daily),
      hourly: Math.max(0, this.config.maxHourlyRequests - this.usage.hourly)
    };
  }

  /**
   * 次回リセット時刻取得
   */
  getNextResetTime(): { daily: Date; hourly: Date } {
    return {
      daily: new Date(this.usage.lastReset + 24 * 60 * 60 * 1000),
      hourly: new Date(this.usage.hourlyReset + 60 * 60 * 1000)
    };
  }

  /**
   * 使用量統計取得
   */
  getUsageStats(): ApiUsageStats & { remaining: { daily: number; hourly: number } } {
    return {
      ...this.usage,
      remaining: this.getRemainingRequests()
    };
  }

  /**
   * 強制リセット（デバッグ用）
   */
  reset(): void {
    const now = Date.now();
    this.usage = {
      daily: 0,
      hourly: 0,
      lastReset: now,
      hourlyReset: now
    };
    this.saveUsageStats();
  }
}

export const rateLimitManager = new RateLimitManager();