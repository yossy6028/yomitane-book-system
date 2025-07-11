/**
 * 統合画像検索サービス
 * SimplifiedImageSearchService + GeminiVisionImageService の組み合わせ
 * フォールバック戦略でより確実な画像取得を実現
 */

import { Book } from '../../types/Book';
import { SimplifiedImageSearchService } from './SimplifiedImageSearchService';
import { GeminiVisionImageService } from './GeminiVisionImageService';

interface SearchAttempt {
  method: string;
  result: string;
  success: boolean;
  timestamp: number;
  details?: any;
}

export class IntegratedImageSearchService {
  private static instance: IntegratedImageSearchService;
  private simplifiedService: SimplifiedImageSearchService;
  private visionService: GeminiVisionImageService;
  private searchHistory = new Map<string, SearchAttempt[]>();

  constructor() {
    this.simplifiedService = SimplifiedImageSearchService.getInstance();
    this.visionService = GeminiVisionImageService.getInstance();
  }

  static getInstance(): IntegratedImageSearchService {
    if (!this.instance) {
      this.instance = new IntegratedImageSearchService();
    }
    return this.instance;
  }

  /**
   * 統合画像検索のメインメソッド
   * 1. Vision API 優先検索（Gemini利用可能時）
   * 2. 従来検索フォールバック
   * 3. プレースホルダー生成
   */
  async getImageForBook(book: Book): Promise<string> {
    console.group(`🚀 [統合検索] "${book.title}" by "${book.author}"`);
    
    const bookKey = `${book.id}_${book.title}_${book.author}`;
    const attempts: SearchAttempt[] = [];

    try {
      // 🔍 方法1: Gemini Vision API 検索（最優先）
      if (this.visionService.isAvailable()) {
        console.log('🎯 方法1: Gemini Vision API による高精度検索...');
        
        try {
          const visionResult = await this.visionService.getVerifiedImageForBook(book);
          
          if (visionResult && !this.isPlaceholder(visionResult)) {
            attempts.push({
              method: 'Gemini Vision API',
              result: visionResult,
              success: true,
              timestamp: Date.now(),
              details: { verified: true, confidence: 'high' }
            });
            
            console.log('✅ Vision API検索成功！信頼度の高い画像を取得');
            this.recordSearchHistory(bookKey, attempts);
            console.groupEnd();
            return visionResult;
          } else {
            attempts.push({
              method: 'Gemini Vision API',
              result: visionResult,
              success: false,
              timestamp: Date.now(),
              details: { reason: 'no_verified_match' }
            });
            console.log('⚠️ Vision API: 信頼できる画像が見つかりませんでした');
          }
        } catch (visionError) {
          console.error('❌ Vision API エラー:', visionError);
          attempts.push({
            method: 'Gemini Vision API',
            result: '',
            success: false,
            timestamp: Date.now(),
            details: { error: visionError instanceof Error ? visionError.message : 'Unknown error' }
          });
        }
      } else {
        console.log('⚠️ Gemini Vision API利用不可（APIキー未設定）');
      }

      // 🔍 方法2: 従来の厳格検索（フォールバック）
      console.log('🔍 方法2: 従来の厳格検索（著者一致必須）...');
      
      try {
        const simplifiedResult = await this.simplifiedService.getImageForBook(book);
        
        if (simplifiedResult && !this.isPlaceholder(simplifiedResult)) {
          attempts.push({
            method: 'Simplified Search (strict)',
            result: simplifiedResult,
            success: true,
            timestamp: Date.now(),
            details: { authorMatching: 'strict' }
          });
          
          console.log('✅ 厳格検索成功！著者一致確認済み画像を取得');
          this.recordSearchHistory(bookKey, attempts);
          console.groupEnd();
          return simplifiedResult;
        } else {
          attempts.push({
            method: 'Simplified Search (strict)',
            result: simplifiedResult,
            success: false,
            timestamp: Date.now(),
            details: { reason: 'author_mismatch_or_not_found' }
          });
          console.log('⚠️ 厳格検索: 著者一致する画像が見つかりませんでした');
        }
      } catch (simplifiedError) {
        console.error('❌ 厳格検索エラー:', simplifiedError);
        attempts.push({
          method: 'Simplified Search (strict)',
          result: '',
          success: false,
          timestamp: Date.now(),
          details: { error: simplifiedError instanceof Error ? simplifiedError.message : 'Unknown error' }
        });
      }

      // 🔍 方法3: 最終フォールバック - プレースホルダー
      console.log('📋 方法3: 適切な画像が見つからないため、情報豊富なプレースホルダーを生成');
      
      const placeholderResult = this.generateEnhancedPlaceholder(book, attempts);
      attempts.push({
        method: 'Enhanced Placeholder',
        result: placeholderResult,
        success: true,
        timestamp: Date.now(),
        details: { type: 'fallback', searchAttempts: attempts.length - 1 }
      });
      
      this.recordSearchHistory(bookKey, attempts);
      console.log('✅ 情報豊富なプレースホルダーを生成');
      console.groupEnd();
      return placeholderResult;

    } catch (error) {
      console.error('❌ 統合検索で予期しないエラー:', error);
      
      const errorPlaceholder = this.generateErrorPlaceholder(book);
      attempts.push({
        method: 'Error Placeholder',
        result: errorPlaceholder,
        success: false,
        timestamp: Date.now(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      
      this.recordSearchHistory(bookKey, attempts);
      console.groupEnd();
      return errorPlaceholder;
    }
  }

  /**
   * プレースホルダーかどうかを判定
   */
  private isPlaceholder(imageUrl: string): boolean {
    return imageUrl.startsWith('data:image/svg+xml') || 
           imageUrl.includes('placeholder') ||
           imageUrl.includes('NO IMAGE') ||
           imageUrl.includes('NO MATCH');
  }

  /**
   * 拡張プレースホルダー生成（検索結果情報付き）
   */
  private generateEnhancedPlaceholder(book: Book, attempts: SearchAttempt[]): string {
    const attemptCount = attempts.length;
    const hasVisionAttempt = attempts.some(a => a.method.includes('Vision'));
    const hasStrictAttempt = attempts.some(a => a.method.includes('Simplified'));
    
    const svgContent = `<svg width="80" height="100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="enhancedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f8f9fa;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e9ecef;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="80" height="100" fill="url(#enhancedGrad)" stroke="#6c757d" stroke-width="1"/>
        <text x="40" y="15" text-anchor="middle" font-family="Arial" font-size="8" font-weight="bold" fill="#495057">SEARCHED</text>
        <text x="40" y="30" text-anchor="middle" font-family="Arial" font-size="24" fill="#6c757d">📖</text>
        <text x="40" y="45" text-anchor="middle" font-family="Arial" font-size="7" fill="#6c757d">${hasVisionAttempt ? 'Vision✓' : 'Vision✗'}</text>
        <text x="40" y="55" text-anchor="middle" font-family="Arial" font-size="7" fill="#6c757d">${hasStrictAttempt ? 'Strict✓' : 'Strict✗'}</text>
        <text x="40" y="70" text-anchor="middle" font-family="Arial" font-size="7" fill="#868e96">NO MATCH</text>
        <text x="40" y="80" text-anchor="middle" font-family="Arial" font-size="6" fill="#adb5bd">${attemptCount} attempts</text>
        <text x="40" y="90" text-anchor="middle" font-family="Arial" font-size="5" fill="#ced4da">ID: ${book.id}</text>
      </svg>`;
    
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
  }

  /**
   * エラープレースホルダー生成
   */
  private generateErrorPlaceholder(book: Book): string {
    const svgContent = `<svg width="80" height="100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="errorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#fff5f5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#fed7d7;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="80" height="100" fill="url(#errorGrad)" stroke="#fc8181" stroke-width="1"/>
        <text x="40" y="20" text-anchor="middle" font-family="Arial" font-size="8" font-weight="bold" fill="#c53030">ERROR</text>
        <text x="40" y="40" text-anchor="middle" font-family="Arial" font-size="20" fill="#e53e3e">⚠️</text>
        <text x="40" y="60" text-anchor="middle" font-family="Arial" font-size="7" fill="#c53030">SEARCH</text>
        <text x="40" y="70" text-anchor="middle" font-family="Arial" font-size="7" fill="#c53030">FAILED</text>
        <text x="40" y="85" text-anchor="middle" font-family="Arial" font-size="5" fill="#fc8181">ID: ${book.id}</text>
      </svg>`;
    
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
  }

  /**
   * 検索履歴を記録
   */
  private recordSearchHistory(bookKey: string, attempts: SearchAttempt[]): void {
    this.searchHistory.set(bookKey, attempts);
    
    // 履歴サイズを制限（最新100件）
    if (this.searchHistory.size > 100) {
      const oldestKey = this.searchHistory.keys().next().value;
      this.searchHistory.delete(oldestKey);
    }
  }

  /**
   * 書籍の検索履歴を取得
   */
  getSearchHistory(book: Book): SearchAttempt[] {
    const bookKey = `${book.id}_${book.title}_${book.author}`;
    return this.searchHistory.get(bookKey) || [];
  }

  /**
   * 統計情報取得
   */
  getSearchStatistics() {
    const allAttempts = Array.from(this.searchHistory.values()).flat();
    const totalSearches = this.searchHistory.size;
    const visionSuccesses = allAttempts.filter(a => 
      a.method.includes('Vision') && a.success
    ).length;
    const strictSuccesses = allAttempts.filter(a => 
      a.method.includes('Simplified') && a.success
    ).length;
    const placeholderCount = allAttempts.filter(a => 
      a.method.includes('Placeholder')
    ).length;

    return {
      totalSearches,
      visionSuccessRate: totalSearches > 0 ? (visionSuccesses / totalSearches * 100).toFixed(1) + '%' : '0%',
      strictSuccessRate: totalSearches > 0 ? (strictSuccesses / totalSearches * 100).toFixed(1) + '%' : '0%',
      placeholderRate: totalSearches > 0 ? (placeholderCount / totalSearches * 100).toFixed(1) + '%' : '0%',
      visionAvailable: this.visionService.isAvailable(),
      lastUpdate: Date.now()
    };
  }

  /**
   * キャッシュクリア
   */
  clearCache(): void {
    this.simplifiedService.clearCache();
    this.visionService.clearCache();
    this.searchHistory.clear();
    console.log('🗑️ 統合サービスの全キャッシュをクリア');
  }

  /**
   * 特定書籍のキャッシュクリア
   */
  clearCacheForBook(book: Book): void {
    this.simplifiedService.clearCacheForBook(book.title, book.author, book.isbn);
    const bookKey = `${book.id}_${book.title}_${book.author}`;
    this.searchHistory.delete(bookKey);
    console.log(`🗑️ "${book.title}" のキャッシュをクリア`);
  }

  /**
   * キャッシュ統計情報取得（互換性のため）
   */
  getCacheStats(): { cacheSize: number; pendingRequests: number } {
    return this.simplifiedService.getCacheStats();
  }
}