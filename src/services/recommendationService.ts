import { Book } from '../types/Book';
import { bookService } from './bookService';
import { geminiRecommendationService } from './geminiRecommendationService';
import { TestResult } from '../data/mixedTestQuestions';
import { GradeInfo } from '../utils/gradeCalculator';

export interface UserProfile {
  age: number;
  interests: string[];
  readingLevel: '小学校低学年' | '小学校中学年' | '小学校高学年〜中学1・2年' | '高校受験レベル';
  vocabularyScore: number; // 1-10 (総合レベル)
  personalityTraits: string[]; // 勇敢、優しい、好奇心旺盛など
  previousBooks?: string[]; // 読んだことがある本のID
  testResult?: TestResult; // 詳細なテスト結果
  testAnalysis?: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  }; // テスト結果分析
  gradeInfo?: GradeInfo; // 学年情報
}

export interface RecommendationResult {
  book: Book;
  score: number;
  reasons: string[];
  matchDetails: {
    ageMatch: boolean;
    interestMatch: string[];
    levelMatch: boolean;
    vocabularyMatch: boolean;
    personalityMatch: string[];
  };
}

class RecommendationService {
  
  // メイン推薦機能（Gemini API優先、フォールバック付き）
  async getRecommendations(userProfile: UserProfile, maxResults: number = 5): Promise<RecommendationResult[]> {
    // Gemini APIが利用可能な場合は優先使用
    if (geminiRecommendationService.isConfigured()) {
      try {
        return await geminiRecommendationService.getRecommendations(userProfile, maxResults);
      } catch (error) {
        console.warn('Gemini API failed, falling back to local recommendation:', error);
        // フォールバック: ローカル推薦システムを使用
        return this.getLocalRecommendations(userProfile, maxResults);
      }
    } else {
      // Gemini APIが設定されていない場合はローカル推薦システムを使用
      return this.getLocalRecommendations(userProfile, maxResults);
    }
  }

  // ローカル推薦システム（興味分野最低1冊保証対応）
  getLocalRecommendations(userProfile: UserProfile, maxResults: number = 5): RecommendationResult[] {
    const allBooks = bookService.getAllBooks();
    const minResults = Math.max(4, maxResults); // 最低4件保証
    
    // 【重要】第0段階: 興味分野最低1冊保証システム
    const guaranteedBooks = this.getInterestGuaranteedBooks(allBooks, userProfile);
    console.log(`興味分野保証: ${guaranteedBooks.length}件の本を確保`);
    
    // 第1段階: 厳密な条件での推薦
    let scoredBooks = this.getStrictRecommendations(allBooks, userProfile);
    
    // 興味分野保証本を最優先でマージ
    const mergedBooks = this.mergeGuaranteedBooks(guaranteedBooks, scoredBooks);
    
    // 第2段階: 結果が少ない場合の条件緩和
    if (mergedBooks.length < minResults) {
      console.log(`現在${mergedBooks.length}件。目標${minResults}件まで条件を緩和します...`);
      const relaxedBooks = this.getRelaxedRecommendations(allBooks, userProfile, minResults, mergedBooks);
      scoredBooks = relaxedBooks;
    } else {
      scoredBooks = mergedBooks;
    }

    // 重複除去（既読本を除外）
    const filteredBooks = scoredBooks.filter(rec => 
      !userProfile.previousBooks?.includes(rec.book.id)
    );

    return filteredBooks.slice(0, maxResults);
  }

  // 厳密な条件での推薦
  private getStrictRecommendations(allBooks: Book[], userProfile: UserProfile): RecommendationResult[] {
    const scoredBooks: RecommendationResult[] = [];

    allBooks.forEach(book => {
      const recommendation = this.scoreBook(book, userProfile);
      if (recommendation.score > 50) { // 厳密な閾値
        scoredBooks.push(recommendation);
      }
    });

    return scoredBooks.sort((a, b) => b.score - a.score);
  }

  // 興味分野最低1冊保証システム
  private getInterestGuaranteedBooks(allBooks: Book[], userProfile: UserProfile): RecommendationResult[] {
    const guaranteedBooks: RecommendationResult[] = [];
    const usedBookIds = new Set<string>();
    
    // ユーザーが選択した各興味分野について最低1冊ずつ確保
    userProfile.interests.forEach(selectedInterest => {
      const matchingBooks = allBooks.filter(book => {
        // 年齢適合性チェック（±2歳の緩和許可）
        const ageMatch = this.isAgeCompatible(book, userProfile.age, 2);
        
        // 興味分野マッチングチェック（直接マッチまたはカテゴリマッチ）
        const interestMatch = 
          book.interests.includes(selectedInterest) || 
          this.hasRelatedInterest(book, selectedInterest) ||
          this.hasCategoryMatch(book, selectedInterest);
        
        return ageMatch && interestMatch && !usedBookIds.has(book.id);
      });
      
      if (matchingBooks.length > 0) {
        // 最高評価の本を選択
        const bestBook = matchingBooks.sort((a, b) => b.rating - a.rating)[0];
        const recommendation = this.scoreBook(bestBook, userProfile);
        
        // 興味分野マッチボーナスを追加（確実に上位に来るように）
        recommendation.score += 50; // 興味分野保証ボーナス
        recommendation.reasons.unshift(`✨ 「${selectedInterest}」の要求にお応えした推薦`);
        
        guaranteedBooks.push(recommendation);
        usedBookIds.add(bestBook.id);
        
        console.log(`興味「${selectedInterest}」: 「${bestBook.title}」を保証`);
      } else {
        console.warn(`⚠️ 興味「${selectedInterest}」に対応する${userProfile.age}歳向けの本が見つかりません`);
      }
    });
    
    return guaranteedBooks;
  }
  
  // 保証本と通常推薦本をマージ
  private mergeGuaranteedBooks(guaranteedBooks: RecommendationResult[], regularBooks: RecommendationResult[]): RecommendationResult[] {
    const usedBookIds = new Set(guaranteedBooks.map(book => book.book.id));
    
    // 重複を除いた通常推薦本
    const uniqueRegularBooks = regularBooks.filter(rec => !usedBookIds.has(rec.book.id));
    
    // 保証本を最優先で配置し、通常推薦本を続ける
    const mergedBooks = [...guaranteedBooks, ...uniqueRegularBooks];
    
    return mergedBooks.sort((a, b) => b.score - a.score);
  }
  
  // 年齢互換性チェック（緩和オプション付き）
  private isAgeCompatible(book: Book, userAge: number, tolerance: number = 0): boolean {
    const minAge = book.ageRange.min - tolerance;
    const maxAge = book.ageRange.max + tolerance;
    return userAge >= minAge && userAge <= maxAge;
  }
  
  // 関連興味チェック
  private hasRelatedInterest(book: Book, userInterest: string): boolean {
    const relatedMap: Record<string, string[]> = {
      'スポーツ・運動（からだをうごかす）': ['スポーツ', '競技', '運動', '冒険'],
      '科学': ['宇宙・天体', '自然', '実験', '学習'],
      'ファンタジー': ['魔法', '冒険', '不思議'],
      '動物': ['自然', 'ペット', '生き物'],
      '友情・恋愛': ['友情', '学校生活', '成長'],
      '冒険': ['ファンタジー', '旅行・地理', '探検'],
      '推理・謎解き': ['ミステリー', '論理的', '謎'],
      '歴史': ['社会', '文学', '古典'],
      '音楽': ['芸術', '創作'],
      '絵を描く': ['芸術', '創作', '工作・手芸'],
      '料理': ['家族', '日常', '食べ物'],
      '乗り物': ['冒険', '技術', '機械']
    };
    
    const relatedInterests = relatedMap[userInterest] || [];
    return relatedInterests.some(related => book.interests.includes(related));
  }
  
  // カテゴリマッチチェック
  private hasCategoryMatch(book: Book, userInterest: string): boolean {
    const categoryMap: Record<string, string[]> = {
      'スポーツ・運動（からだをうごかす）': ['スポーツ', '競技', '運動'],
      '科学': ['科学', 'サイエンス', '実験'],
      '音楽': ['音楽', '楽器'],
      '動物': ['動物', '生き物'],
      'ファンタジー': ['ファンタジー', '魔法'],
      '推理・謎解き': ['推理', 'ミステリー'],
      '歴史': ['歴史', '時代'],
      '料理': ['料理', '食べ物'],
      '工作・手芸': ['工作', '手芸'],
      '映画・アニメ': ['映画', 'アニメ'],
      '旅行・地理': ['旅行', '地理'],
      '宇宙・天体': ['宇宙', '天体', '星'],
      '乗り物': ['車', '電車', '飛行機']
    };
    
    const keywords = categoryMap[userInterest] || [userInterest];
    return keywords.some(keyword => 
      book.categories.some(category => category.includes(keyword))
    );
  }

  // 条件緩和での推薦
  private getRelaxedRecommendations(
    allBooks: Book[], 
    userProfile: UserProfile, 
    minResults: number, 
    existingResults: RecommendationResult[]
  ): RecommendationResult[] {
    const relaxedBooks: RecommendationResult[] = [...existingResults];
    const usedBookIds = new Set(existingResults.map(r => r.book.id));

    // 段階的に条件を緩和（高校受験レベル対応強化）
    const relaxationSteps = [
      { threshold: 25, label: "レベル緩和" },
      { threshold: 15, label: "興味分野拡張" },
      { threshold: 8, label: "年齢範囲拡張" },
      { threshold: 3, label: "最低品質保証" },
      { threshold: 1, label: "全候補確保" } // 高校受験レベル用の追加段階
    ];

    for (const step of relaxationSteps) {
      if (relaxedBooks.length >= minResults) break;

      allBooks.forEach(book => {
        if (usedBookIds.has(book.id) || relaxedBooks.length >= minResults) return;

        const recommendation = this.scoreBookRelaxed(book, userProfile, step.threshold);
        if (recommendation.score >= step.threshold) {
          relaxedBooks.push(recommendation);
          usedBookIds.add(book.id);
        }
      });

      console.log(`${step.label}: ${relaxedBooks.length}件の推薦を確保`);
    }

    return relaxedBooks.sort((a, b) => b.score - a.score);
  }

  // 図書スコアリング（適応的・テスト結果考慮版）
  private scoreBook(book: Book, profile: UserProfile): RecommendationResult {
    let score = 0;
    const reasons: string[] = [];
    const matchDetails = {
      ageMatch: false,
      interestMatch: [] as string[],
      levelMatch: false,
      vocabularyMatch: false,
      personalityMatch: [] as string[]
    };

    // テスト結果による適応的調整
    const testBonus = this.calculateTestBasedBonus(book, profile);
    score += testBonus.score;
    if (testBonus.reason) {
      reasons.push(testBonus.reason);
    }

    // 高校受験レベル特別ボーナス（条件緩和）
    if (profile.readingLevel === '高校受験レベル') {
      const highSchoolBonus = this.calculateHighSchoolBonus(book, profile);
      score += highSchoolBonus.score;
      if (highSchoolBonus.reason) {
        reasons.push(highSchoolBonus.reason);
      }
    }

    // 1. 年齢適合性チェック (30点満点)
    const ageScore = this.calculateAgeScore(book, profile.age);
    score += ageScore;
    if (ageScore > 15) {
      matchDetails.ageMatch = true;
      reasons.push(`${profile.age}歳の${this.getAgeGroup(profile.age)}にぴったりの内容`);
    } else if (ageScore > 0) {
      reasons.push(`年齢的に少し挑戦的な内容`);
    }

    // 2. 興味分野マッチング (25点満点)
    const interestScore = this.calculateInterestScore(book, profile.interests);
    score += interestScore.score;
    matchDetails.interestMatch = interestScore.matches;
    interestScore.matches.forEach(interest => {
      reasons.push(`${interest}が好きなきみにおすすめ`);
    });

    // 3. 読書レベル適合性 (20点満点)
    const levelScore = this.calculateLevelScore(book, profile.readingLevel);
    score += levelScore;
    if (levelScore > 10) {
      matchDetails.levelMatch = true;
      reasons.push(`きみの読書レベルにちょうど良い`);
    }

    // 4. 語彙力適合性 (15点満点)
    const vocabularyScore = this.calculateVocabularyScore(book, profile.vocabularyScore);
    score += vocabularyScore;
    if (vocabularyScore > 7) {
      matchDetails.vocabularyMatch = true;
      reasons.push(`きみの語彙力で楽しく読める`);
    }

    // 5. 性格特性マッチング (10点満点)
    const personalityScore = this.calculatePersonalityScore(book, profile.personalityTraits);
    score += personalityScore.score;
    matchDetails.personalityMatch = personalityScore.matches;
    personalityScore.matches.forEach(trait => {
      reasons.push(`${trait}なきみの性格にマッチ`);
    });

    // 理由が少ない場合は本の特徴に基づいた理由を追加
    if (reasons.length === 0) {
      reasons.push(this.generateFallbackReason(book, profile));
    }

    return {
      book,
      score,
      reasons,
      matchDetails
    };
  }

  // 条件緩和版スコアリング
  private scoreBookRelaxed(book: Book, profile: UserProfile, threshold: number): RecommendationResult {
    let score = 0;
    const reasons: string[] = [];
    const matchDetails = {
      ageMatch: false,
      interestMatch: [] as string[],
      levelMatch: false,
      vocabularyMatch: false,
      personalityMatch: [] as string[]
    };

    // 緩和された年齢スコア（±3歳まで許容）
    const relaxedAgeScore = this.calculateRelaxedAgeScore(book, profile.age);
    score += relaxedAgeScore;
    if (relaxedAgeScore > 0) {
      matchDetails.ageMatch = true;
      if (relaxedAgeScore < 15) reasons.push("年齢的に少し背伸びした本");
    }

    // 緩和された興味マッチング（部分一致で高評価）
    const relaxedInterestScore = this.calculateRelaxedInterestScore(book, profile.interests);
    score += relaxedInterestScore.score;
    matchDetails.interestMatch = relaxedInterestScore.matches;
    if (relaxedInterestScore.matches.length > 0) {
      reasons.push(`「${relaxedInterestScore.matches.join('・')}」に関連`);
    }

    // 緩和されたレベルマッチング（±2レベル差まで許容）
    const relaxedLevelScore = this.calculateRelaxedLevelScore(book, profile.readingLevel);
    score += relaxedLevelScore;
    if (relaxedLevelScore > 5) {
      matchDetails.levelMatch = true;
      reasons.push("読書レベルに適している");
    }

    // 基本品質スコア（評価とページ数）
    const qualityScore = Math.min(book.rating * 5, 25);
    score += qualityScore;

    // 最低スコア保証
    if (score < threshold && book.rating >= 4.0) {
      score = threshold + 5; // 高評価本は強制的に閾値を超える
      reasons.push("高評価・人気作品");
    }

    if (reasons.length === 0) {
      reasons.push(this.generateFallbackReason(book, profile));
    }

    return {
      book,
      score,
      reasons,
      matchDetails
    };
  }

  // 緩和された年齢スコア（±3歳まで許容）
  private calculateRelaxedAgeScore(book: Book, userAge: number): number {
    const bookMinAge = book.ageRange.min;
    const bookMaxAge = book.ageRange.max;
    
    // 完全一致
    if (userAge >= bookMinAge && userAge <= bookMaxAge) {
      return 25;
    }
    
    // ±3歳以内の緩和
    const ageDifference = Math.min(
      Math.abs(userAge - bookMinAge),
      Math.abs(userAge - bookMaxAge)
    );
    
    if (ageDifference <= 3) {
      return Math.max(15 - ageDifference * 3, 5);
    }
    
    return 0;
  }

  // 緩和された興味スコア（部分一致・関連語検索）
  private calculateRelaxedInterestScore(book: Book, userInterests: string[]): { score: number, matches: string[] } {
    const matches: string[] = [];
    let score = 0;

    // 直接マッチ
    userInterests.forEach(interest => {
      if (book.interests.includes(interest)) {
        matches.push(interest);
        score += 15;
      }
    });

    // 関連語マッチング
    const relatedMatches = this.findRelatedInterests(book, userInterests);
    relatedMatches.forEach(match => {
      if (!matches.includes(match)) {
        matches.push(match);
        score += 8;
      }
    });

    // カテゴリベースマッチング
    const categoryMatches = this.findCategoryInterestMatches(book, userInterests);
    categoryMatches.forEach(match => {
      if (!matches.includes(match)) {
        matches.push(match);
        score += 5;
      }
    });

    return { score: Math.min(score, 30), matches };
  }

  // 関連興味分野の検索
  private findRelatedInterests(book: Book, userInterests: string[]): string[] {
    const relatedMap: Record<string, string[]> = {
      'スポーツ': ['冒険', '成長', '友情'],
      '自然': ['動物', '科学', '冒険'],
      '科学': ['宇宙・天体', '自然', '読書'],
      'ファンタジー': ['魔法', '冒険', '友情・恋愛'],
      '歴史': ['社会', '文学', '古典'],
      '友情・恋愛': ['友情', '学校生活', '成長'],
      '動物': ['自然', '家族', '友情']
    };

    const matches: string[] = [];
    userInterests.forEach(interest => {
      const related = relatedMap[interest] || [];
      related.forEach(relatedInterest => {
        if (book.interests.includes(relatedInterest)) {
          matches.push(relatedInterest);
        }
      });
    });

    return matches;
  }

  // カテゴリベース興味マッチング
  private findCategoryInterestMatches(book: Book, userInterests: string[]): string[] {
    const matches: string[] = [];
    
    // カテゴリと興味の対応
    userInterests.forEach(interest => {
      book.categories.forEach(category => {
        if (
          (interest === 'スポーツ' && category.includes('スポーツ')) ||
          (interest === '冒険' && (category.includes('冒険') || category.includes('ファンタジー'))) ||
          (interest === '科学' && category.includes('科学')) ||
          (interest === '動物' && category.includes('動物')) ||
          (interest === '歴史' && category.includes('歴史'))
        ) {
          matches.push(interest);
        }
      });
    });

    return matches;
  }

  // 緩和されたレベルスコア（±2レベル差まで許容）
  private calculateRelaxedLevelScore(book: Book, userLevel: string): number {
    const levelPoints = { 
      '小学校低学年': 1,
      '小学校中学年': 2, 
      '小学校高学年〜中学1・2年': 3,
      '高校受験レベル': 4
    };
    
    const userPoints = levelPoints[userLevel as keyof typeof levelPoints];
    const bookPoints = levelPoints[book.readingLevel as keyof typeof levelPoints] || 3;

    const levelDifference = Math.abs(userPoints - bookPoints);
    
    if (levelDifference === 0) return 20;
    if (levelDifference === 1) return 15;
    if (levelDifference === 2) return 10;
    if (levelDifference === 3) return 5;
    
    return 0;
  }

  // 年齢スコア計算（強化版）
  private calculateAgeScore(book: Book, userAge: number): number {
    const bookMinAge = book.ageRange.min;
    const bookMaxAge = book.ageRange.max;
    
    if (userAge >= bookMinAge && userAge <= bookMaxAge) {
      // 完全にレンジ内 - 年齢によってさらに細かく調整
      const ageCenter = (bookMinAge + bookMaxAge) / 2;
      const distanceFromCenter = Math.abs(userAge - ageCenter);
      const maxDistance = (bookMaxAge - bookMinAge) / 2;
      
      if (distanceFromCenter === 0) {
        return 30; // 中央値なら最高点
      } else {
        return Math.max(25, 30 - (distanceFromCenter / maxDistance) * 5);
      }
    } else if (userAge === bookMinAge - 1 || userAge === bookMaxAge + 1) {
      // 1歳差
      return 18;
    } else if (userAge === bookMinAge - 2 || userAge === bookMaxAge + 2) {
      // 2歳差
      return 8;
    } else if (userAge === bookMinAge - 3 || userAge === bookMaxAge + 3) {
      // 3歳差
      return 3;
    } else {
      // それ以上の差
      return 0;
    }
  }

  // 興味分野スコア計算
  private calculateInterestScore(book: Book, userInterests: string[]): { score: number, matches: string[] } {
    const matches: string[] = [];
    let score = 0;

    userInterests.forEach(userInterest => {
      if (book.interests.includes(userInterest)) {
        matches.push(userInterest);
        score += 8; // 一致する興味ごとに8点
      }
    });

    // カテゴリとの部分マッチもチェック
    const categoryMatches = this.findCategoryMatches(book.categories, userInterests);
    categoryMatches.forEach(match => {
      if (!matches.includes(match)) {
        matches.push(match);
        score += 3; // カテゴリマッチは3点
      }
    });

    return { score: Math.min(score, 25), matches }; // 最大25点
  }

  // カテゴリマッチング
  private findCategoryMatches(categories: string[], userInterests: string[]): string[] {
    const matches: string[] = [];
    const categoryMapping: { [key: string]: string[] } = {
      'スポーツ': ['スポーツ', '競技', '運動'],
      '音楽': ['音楽', '楽器', '歌'],
      '絵を描く': ['絵', '美術', 'アート'],
      'ゲーム': ['ゲーム', '遊び'],
      '動物': ['動物', '生き物', 'ペット'],
      '科学': ['科学', 'サイエンス', '実験', '学習'],
      '料理': ['料理', '食べ物', '食事'],
      '冒険': ['冒険', 'アドベンチャー', '旅'],
      '読書': ['読書', '本', '文学'],
      '映画・アニメ': ['映画', 'アニメ', '映像'],
      '工作・手芸': ['工作', '手芸', '作る'],
      '歴史': ['歴史', '昔', '時代'],
      '宇宙・天体': ['宇宙', '星', '天体', '惑星'],
      '乗り物': ['車', '電車', '飛行機', '船'],
      '旅行・地理': ['旅行', '地理', '世界', '国'],
      '推理・謎解き': ['推理', 'ミステリー', '謎解き'],
      'ファンタジー': ['ファンタジー', '魔法', '不思議'],
      '友情・恋愛': ['友情', '恋愛', '友達'],
      '家族': ['家族', '親', '兄弟'],
      '学校生活': ['学校', '教室', '先生', '勉強'],
      'ユーモア': ['ユーモア', '笑い', '面白い']
    };

    userInterests.forEach(interest => {
      categories.forEach(category => {
        const keywords = categoryMapping[interest] || [interest];
        if (keywords.some(keyword => category.includes(keyword))) {
          matches.push(interest);
        }
      });
    });

    return matches;
  }

  // 読書レベルスコア計算（緩和版・幅広い提案対応）
  private calculateLevelScore(book: Book, userLevel: '小学校低学年' | '小学校中学年' | '小学校高学年〜中学1・2年' | '高校受験レベル'): number {
    const levelPoints = { 
      '小学校低学年': 1,
      '小学校中学年': 2, 
      '小学校高学年〜中学1・2年': 3,
      '高校受験レベル': 4
    };
    const userPoints = levelPoints[userLevel];
    const bookPoints = levelPoints[book.readingLevel as keyof typeof levelPoints] || 3;

    if (userPoints === bookPoints) {
      return 20; // 完全一致
    } else if (Math.abs(userPoints - bookPoints) === 1) {
      return 15; // 1レベル差（緩和）
    } else if (Math.abs(userPoints - bookPoints) === 2) {
      return 10; // 2レベル差（緩和）
    } else if (Math.abs(userPoints - bookPoints) === 3) {
      return 5; // 3レベル差（新規追加）
    } else {
      return 2; // 4レベル差以上
    }
  }

  // 語彙力スコア計算（緩和版・テスト結果重視）
  private calculateVocabularyScore(book: Book, userVocabularyScore: number): number {
    const difference = Math.abs(book.vocabularyLevel - userVocabularyScore);
    
    if (difference === 0) {
      return 15; // 完全一致
    } else if (difference === 1) {
      return 13; // 1差（緩和）
    } else if (difference === 2) {
      return 10; // 2差（緩和）
    } else if (difference === 3) {
      return 7; // 3差（緩和）
    } else if (difference === 4) {
      return 4; // 4差（新規追加）
    } else {
      return 1; // 5差以上（完全除外から緩和）
    }
  }

  // 性格特性スコア計算
  private calculatePersonalityScore(book: Book, userTraits: string[]): { score: number, matches: string[] } {
    const matches: string[] = [];
    let score = 0;

    // 本の興味分野と性格特性のマッピング
    const traitMapping: { [key: string]: string[] } = {
      '勇敢': ['冒険', '戦い', 'ヒーロー'],
      '優しい': ['友情・恋愛', '家族', '愛情', '動物'],
      '好奇心旺盛': ['科学', '学習', '発見', '探検', '宇宙・天体'],
      '活発': ['スポーツ', '運動', '競技', '冒険'],
      '芸術的': ['音楽', '絵を描く', '創作', '工作・手芸'],
      '思いやり': ['動物', 'ペット', '友情・恋愛', '家族'],
      '論理的': ['推理・謎解き', '科学', '歴史'],
      'ユーモア好き': ['ユーモア', '笑い', 'コメディ'],
      '慎重': ['推理・謎解き', '歴史', '読書'],
      '社交的': ['友情・恋愛', '学校生活', 'スポーツ'],
      '内向的': ['読書', '絵を描く', '音楽', '工作・手芸'],
      '創造的': ['絵を描く', '音楽', '工作・手芸', 'ファンタジー'],
      '責任感が強い': ['家族', '学校生活', '歴史'],
      '自立している': ['冒険', '旅行・地理', '科学'],
      '協調性がある': ['友情・恋愛', '学校生活', 'スポーツ'],
      'リーダーシップがある': ['冒険', 'スポーツ', '学校生活'],
      '感受性が豊か': ['音楽', '絵を描く', '映画・アニメ', 'ファンタジー'],
      '集中力がある': ['読書', '推理・謎解き', '科学', 'ゲーム'],
      '冒険好き': ['冒険', '旅行・地理', '宇宙・天体'],
      '平和主義': ['家族', '友情・恋愛', '動物', '自然']
    };

    userTraits.forEach(trait => {
      const relatedInterests = traitMapping[trait] || [];
      const hasMatch = relatedInterests.some(interest => 
        book.interests.some(bookInterest => bookInterest.includes(interest))
      );
      
      if (hasMatch) {
        matches.push(trait);
        score += 5;
      }
    });

    return { score: Math.min(score, 10), matches };
  }

  // 年齢別おすすめ図書（Gemini API対応）
  async getAgeBasedRecommendations(age: number): Promise<Book[]> {
    if (geminiRecommendationService.isConfigured()) {
      try {
        return await geminiRecommendationService.getAgeBasedRecommendations(age, 3);
      } catch (error) {
        console.warn('Gemini API failed for age-based recommendations, using local method:', error);
      }
    }
    
    // フォールバック: ローカル処理
    const allBooks = bookService.getAllBooks();
    return allBooks
      .filter(book => age >= book.ageRange.min && age <= book.ageRange.max)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
  }

  // 興味別おすすめ図書（Gemini API対応）
  async getInterestBasedRecommendations(interests: string[]): Promise<Book[]> {
    if (geminiRecommendationService.isConfigured()) {
      try {
        return await geminiRecommendationService.getInterestBasedRecommendations(interests, 3);
      } catch (error) {
        console.warn('Gemini API failed for interest-based recommendations, using local method:', error);
      }
    }
    
    // フォールバック: ローカル処理
    const allBooks = bookService.getAllBooks();
    const scoredBooks = allBooks.map(book => {
      const matchCount = interests.filter(interest => 
        book.interests.includes(interest)
      ).length;
      return { book, score: matchCount };
    });

    return scoredBooks
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.book)
      .slice(0, 3);
  }

  // フォールバック理由生成（本の特徴に基づく）
  private generateFallbackReason(book: Book, profile: UserProfile): string {
    const fallbackReasons = [
      `${book.author}さんの人気作品`,
      `評価${book.rating}点の良書`,
      `${book.categories[0]}ジャンルの代表作`,
      `読み応えのある物語`,
      `${book.ageRange.min}-${book.ageRange.max}歳に人気の一冊`,
      '読書の幅が広がる良い作品',
      '新しいジャンルへの入門書として最適',
      'じっくり楽しめる作品',
      '心に残る素敵なお話'
    ];
    
    // 本のIDとユーザー年齢に基づいて決定論的に選択（一貫性を保ちつつ多様性確保）
    const reasonIndex = (book.id.charCodeAt(0) + profile.age) % fallbackReasons.length;
    return fallbackReasons[reasonIndex];
  }

  // 年齢グループ取得ヘルパー
  private getAgeGroup(age: number): string {
    if (age <= 8) return '小さなお子様';
    if (age <= 12) return 'しょうがくせい';
    if (age <= 15) return 'ちゅうがくせい';
    return 'こうこうせい';
  }

  // テスト結果によるボーナススコア計算
  private calculateTestBasedBonus(book: Book, profile: UserProfile): { score: number, reason?: string } {
    if (!profile.testResult) {
      return { score: 0 };
    }

    const { vocabularyScore, commonSenseScore, overallLevel } = profile.testResult;
    let bonusScore = 0;
    let reason = '';

    // 語彙力が低い場合は読みやすい本にボーナス
    if (vocabularyScore < 60 && book.vocabularyLevel <= 5) {
      bonusScore += 5;
      reason = '語彙力を無理なく伸ばせる本';
    }

    // 語彙力が高い場合は挑戦的な本にボーナス
    if (vocabularyScore >= 80 && book.vocabularyLevel >= 7) {
      bonusScore += 5;
      reason = '語彙力をさらに向上させる挑戦的な本';
    }

    // 常識力が低い場合は学べる要素のある本にボーナス
    if (commonSenseScore < 60 && (book.categories.includes('学習') || book.categories.includes('教育') || book.categories.includes('道徳'))) {
      bonusScore += 5;
      reason = '常識力を楽しく学べる本';
    }

    // バランス良好な場合は幅広い選択肢にボーナス
    if (Math.abs(vocabularyScore - commonSenseScore) <= 20 && overallLevel >= 6) {
      bonusScore += 3;
      reason = 'バランスの良い成長をサポート';
    }

    return { score: bonusScore, reason: reason || undefined };
  }

  // 推薦理由の詳細生成
  generateDetailedReason(recommendation: RecommendationResult, userProfile: UserProfile): string {
    const { book, matchDetails } = recommendation;
    let detailedReason = `「${book.title}」があなたにおすすめの理由：\n\n`;

    // 年齢適合性
    if (matchDetails.ageMatch) {
      detailedReason += `✅ ${userProfile.age}歳のきみにぴったりの内容レベル\n`;
    }

    // 興味マッチ
    if (matchDetails.interestMatch.length > 0) {
      detailedReason += `🎯 きみが好きな「${matchDetails.interestMatch.join('・')}」の要素が含まれている\n`;
    }

    // 読書レベル
    if (matchDetails.levelMatch) {
      const levelLabels = {
        '小学校低学年': '小学校低学年向け',
        '小学校中学年': '小学校中学年向け',
        '小学校高学年〜中学1・2年': '小学校高学年〜中学1・2年向け',
        '高校受験レベル': '高校受験レベル'
      };
      detailedReason += `📚 「${levelLabels[userProfile.readingLevel]}」レベルで楽しく読める\n`;
    }

    // 性格特性
    if (matchDetails.personalityMatch.length > 0) {
      detailedReason += `💪 「${matchDetails.personalityMatch.join('・')}」なきみの性格によく合う\n`;
    }

    // 本の詳細情報
    detailedReason += `\n📖 本の情報：\n`;
    detailedReason += `著者：${book.author}\n`;
    detailedReason += `評価：${'⭐'.repeat(Math.floor(book.rating))} (${book.rating})\n`;
    if (book.pageCount) {
      detailedReason += `ページ数：約${book.pageCount}ページ\n`;
    }

    return detailedReason;
  }

  // 高校受験レベル特別ボーナス（推薦候補確保）
  private calculateHighSchoolBonus(book: Book, profile: UserProfile): { score: number, reason?: string } {
    let bonus = 0;
    let reason = '';

    // 古典・文学作品にボーナス
    if (book.categories.some(cat => 
      ['文学', '古典', '名作', '世界文学', '日本文学'].includes(cat)
    )) {
      bonus += 10;
      reason = '高校受験で出題される文学作品';
    }

    // 社会・歴史・科学系の本にボーナス
    if (book.categories.some(cat => 
      ['歴史', '社会', '科学', '自然', 'せかいの国ぐに'].includes(cat)
    )) {
      bonus += 8;
      if (reason) reason += '・知識を深める内容';
      else reason = '高校受験に役立つ知識が身につく';
    }

    // 読解力向上につながる本にボーナス
    if (book.interests.some(interest => 
      ['読書', '文学', '論理的', '思考力'].includes(interest)
    )) {
      bonus += 6;
      if (reason) reason += '・読解力向上に効果的';
      else reason = '読解力・思考力を鍛える';
    }

    // 高評価本への追加ボーナス
    if (book.rating >= 4.5) {
      bonus += 5;
    }

    return { score: bonus, reason: reason || undefined };
  }
}

export const recommendationService = new RecommendationService();