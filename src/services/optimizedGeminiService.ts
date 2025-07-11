/**
 * 最適化されたGemini API サービス
 * Rate Limit対応、インテリジェントキャッシュ、フォールバック機能
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Book } from '../types/Book';
import { UserProfile, RecommendationResult } from './recommendationService';
import { rateLimitManager } from './rateLimitManager';

interface CachedRecommendation {
  result: RecommendationResult[];
  timestamp: number;
  userHash: string; // ユーザープロフィールのハッシュ
}

interface RecommendationCache {
  [key: string]: CachedRecommendation;
}

class OptimizedGeminiService {
  private genAI?: GoogleGenerativeAI;
  private model?: any;
  private cache: RecommendationCache = {};
  private cacheKey = 'gemini_recommendations_cache';
  private cacheTTL = 30 * 60 * 1000; // 30分

  constructor() {
    this.initializeIfConfigured();
    this.loadCache();
  }

  private initializeIfConfigured() {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }
  }

  /**
   * キャッシュの読み込み
   */
  private loadCache(): void {
    const stored = localStorage.getItem(this.cacheKey);
    if (stored) {
      try {
        this.cache = JSON.parse(stored);
        // 期限切れキャッシュを削除
        this.cleanExpiredCache();
      } catch (error) {
        console.error('Cache loading error:', error);
        this.cache = {};
      }
    }
  }

  /**
   * キャッシュの保存
   */
  private saveCache(): void {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(this.cache));
    } catch (error) {
      console.error('Cache saving error:', error);
    }
  }

  /**
   * 期限切れキャッシュの削除
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    Object.keys(this.cache).forEach(key => {
      if (now - this.cache[key].timestamp > this.cacheTTL) {
        delete this.cache[key];
      }
    });
  }

  /**
   * ユーザープロフィールのハッシュ生成
   */
  private generateUserHash(userProfile: UserProfile): string {
    const profileString = JSON.stringify({
      age: userProfile.age,
      interests: userProfile.interests.sort(),
      readingLevel: userProfile.readingLevel,
      vocabularyScore: userProfile.vocabularyScore,
      personalityTraits: userProfile.personalityTraits.sort()
    });
    
    // 簡単なハッシュ生成
    let hash = 0;
    for (let i = 0; i < profileString.length; i++) {
      const char = profileString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer
    }
    return hash.toString();
  }

  /**
   * キャッシュキーの生成
   */
  private generateCacheKey(userHash: string, maxResults: number): string {
    return `${userHash}_${maxResults}`;
  }

  /**
   * 最適化された推薦取得
   */
  async getOptimizedRecommendations(
    userProfile: UserProfile, 
    availableBooks: Book[],
    maxResults: number = 5
  ): Promise<RecommendationResult[]> {
    const userHash = this.generateUserHash(userProfile);
    const cacheKey = this.generateCacheKey(userHash, maxResults);

    // キャッシュチェック
    const cached = this.cache[cacheKey];
    if (cached && (Date.now() - cached.timestamp < this.cacheTTL)) {
      console.log('📦 Using cached recommendations');
      return cached.result;
    }

    // Rate Limitチェック
    if (!rateLimitManager.canMakeRequest()) {
      console.log('⚠️ Rate limit reached, using fallback');
      return this.getFallbackRecommendations(userProfile, availableBooks, maxResults);
    }

    // API設定チェック
    if (!this.isConfigured()) {
      console.log('🔧 API not configured, using fallback');
      return this.getFallbackRecommendations(userProfile, availableBooks, maxResults);
    }

    try {
      // API使用量記録
      rateLimitManager.recordRequest();

      // 効率的な候補絞り込み
      const candidates = this.selectCandidates(availableBooks, userProfile, 30);
      
      const prompt = this.buildOptimizedPrompt(userProfile, candidates, maxResults);
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      try {
        const geminiResponse = JSON.parse(response);
        const recommendations = this.convertToRecommendationResults(
          geminiResponse, candidates
        );

        // キャッシュに保存
        this.cache[cacheKey] = {
          result: recommendations,
          timestamp: Date.now(),
          userHash
        };
        this.saveCache();

        console.log('✅ Successfully got AI recommendations');
        return recommendations;

      } catch (parseError) {
        console.error('Response parsing error:', parseError);
        return this.getFallbackRecommendations(userProfile, availableBooks, maxResults);
      }

    } catch (error) {
      console.error('Gemini API error:', error);
      return this.getFallbackRecommendations(userProfile, availableBooks, maxResults);
    }
  }

  /**
   * 効率的な候補選定
   */
  private selectCandidates(books: Book[], userProfile: UserProfile, limit: number): Book[] {
    return books
      .filter(book => {
        // 年齢範囲チェック（±3歳）
        const ageMatch = Math.abs(
          (book.ageRange.min + book.ageRange.max) / 2 - userProfile.age
        ) <= 3;

        // 興味分野マッチング
        const interestMatch = userProfile.interests.some(interest => 
          book.interests.includes(interest)
        );

        // 高評価本も含める
        const highRated = book.rating >= 4.3;

        // 既読本を除外
        const notRead = !userProfile.previousBooks?.includes(book.id);

        return (ageMatch || interestMatch || highRated) && notRead;
      })
      .sort((a, b) => {
        // 興味マッチ数でソート
        const aMatches = userProfile.interests.filter(i => a.interests.includes(i)).length;
        const bMatches = userProfile.interests.filter(i => b.interests.includes(i)).length;
        if (aMatches !== bMatches) return bMatches - aMatches;
        
        // 評価でソート
        return b.rating - a.rating;
      })
      .slice(0, limit);
  }

  /**
   * 最適化されたプロンプト構築
   */
  private buildOptimizedPrompt(
    userProfile: UserProfile, 
    candidates: Book[], 
    maxResults: number
  ): string {
    // 候補本を簡潔な形式に変換
    const booksSummary = candidates.map((book, index) => 
      `${index + 1}. ${book.title} (${book.author}) - 年齢:${book.ageRange.min}-${book.ageRange.max}歳 評価:${book.rating} 分野:${book.interests.slice(0, 3).join(',')}`
    ).join('\n');

    return `【図書推薦タスク】
ユーザー: ${userProfile.age}歳, 興味:${userProfile.interests.join(',')}, レベル:${userProfile.readingLevel}

候補図書:
${booksSummary}

${maxResults}冊を推薦し、以下のJSON形式で回答:
{
  "recommendations": [
    {
      "bookId": "書籍ID",
      "score": 数値(0-100),
      "reasons": ["理由1", "理由2"]
    }
  ]
}

簡潔で正確な回答をお願いします。`;
  }

  /**
   * レスポンスの変換
   */
  private convertToRecommendationResults(
    response: any, 
    candidates: Book[]
  ): RecommendationResult[] {
    const results: RecommendationResult[] = [];
    
    if (response.recommendations) {
      for (const rec of response.recommendations) {
        const book = candidates.find(b => b.id === rec.bookId);
        if (book) {
          results.push({
            book,
            score: rec.score || 75,
            reasons: rec.reasons || ['AI推薦'],
            matchDetails: {
              ageMatch: true,
              interestMatch: [],
              levelMatch: true,
              vocabularyMatch: true,
              personalityMatch: []
            }
          });
        }
      }
    }
    
    return results;
  }

  /**
   * フォールバック推薦システム
   */
  private getFallbackRecommendations(
    userProfile: UserProfile, 
    books: Book[], 
    maxResults: number
  ): RecommendationResult[] {
    console.log('📚 Using fallback recommendation system');
    
    return books
      .filter(book => {
        const ageMatch = userProfile.age >= book.ageRange.min && 
                       userProfile.age <= book.ageRange.max + 2;
        const notRead = !userProfile.previousBooks?.includes(book.id);
        return ageMatch && notRead;
      })
      .map(book => {
        let score = 50; // ベーススコア
        const reasons: string[] = [];

        // 興味マッチング
        const interestMatches = userProfile.interests.filter(interest => 
          book.interests.includes(interest)
        );
        if (interestMatches.length > 0) {
          score += interestMatches.length * 15;
          reasons.push(`${interestMatches.join('・')}に興味があるあなたにおすすめ`);
        }

        // 評価ボーナス
        if (book.rating >= 4.5) {
          score += 20;
          reasons.push('高評価の人気作品');
        }

        // 年齢適合性
        if (userProfile.age >= book.ageRange.min && userProfile.age <= book.ageRange.max) {
          score += 15;
          reasons.push('年齢にぴったり');
        }

        if (reasons.length === 0) {
          reasons.push('バランスの良い良書');
        }

        return {
          book,
          score,
          reasons,
          matchDetails: {
            ageMatch: true,
            interestMatch: interestMatches,
            levelMatch: true,
            vocabularyMatch: true,
            personalityMatch: []
          }
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * API設定確認
   */
  isConfigured(): boolean {
    return !!this.model;
  }

  /**
   * キャッシュクリア
   */
  clearCache(): void {
    this.cache = {};
    localStorage.removeItem(this.cacheKey);
    console.log('🗑️ Cache cleared');
  }

  /**
   * 統計情報取得
   */
  getStats() {
    return {
      cacheSize: Object.keys(this.cache).length,
      rateLimitStats: rateLimitManager.getUsageStats(),
      isConfigured: this.isConfigured()
    };
  }
}

export const optimizedGeminiService = new OptimizedGeminiService();