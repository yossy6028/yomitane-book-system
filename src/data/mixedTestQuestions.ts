import { getRandomQuestions } from './vocabularyQuestions';
import { getRandomCommonSenseQuestions } from './commonSenseQuestions';

export interface MixedTestQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  difficulty: number;
  category: string;
  type: 'vocabulary' | 'common_sense';
  explanation?: string;
}

export interface TestResult {
  vocabularyScore: number;
  commonSenseScore: number;
  totalScore: number;
  vocabularyDetails: {
    correct: number;
    total: number;
    categories: { [category: string]: { correct: number; total: number } };
  };
  commonSenseDetails: {
    correct: number;
    total: number;
    categories: { [category: string]: { correct: number; total: number } };
  };
  overallLevel: number; // 1-10のレベル
}

// 語彙問題と常識問題を混合したテストを生成
export function generateMixedTest(age: number, vocabularyCount: number = 5, commonSenseCount: number = 5): MixedTestQuestion[] {
  const vocabularyQuestions = getRandomQuestions(age, vocabularyCount);
  const commonSenseQuestions = getRandomCommonSenseQuestions(age, commonSenseCount);
  
  const mixedQuestions: MixedTestQuestion[] = [
    ...vocabularyQuestions.map(q => ({
      ...q,
      type: 'vocabulary' as const
    })),
    ...commonSenseQuestions.map(q => ({
      ...q,
      type: 'common_sense' as const
    }))
  ];
  
  // 問題をランダムにシャッフル
  return mixedQuestions.sort(() => Math.random() - 0.5);
}

// テスト結果を計算
export function calculateTestResult(
  questions: MixedTestQuestion[], 
  answers: { [questionId: string]: string },
  age: number
): TestResult {
  const vocabularyQuestions = questions.filter(q => q.type === 'vocabulary');
  const commonSenseQuestions = questions.filter(q => q.type === 'common_sense');
  
  // 語彙力スコア計算
  let vocabularyCorrect = 0;
  let vocabularyTotalDifficulty = 0;
  const vocabularyCategories: { [category: string]: { correct: number; total: number } } = {};
  
  vocabularyQuestions.forEach(q => {
    const userAnswer = parseInt(answers[q.id]);
    const isCorrect = userAnswer === q.correct;
    
    if (isCorrect) {
      vocabularyCorrect++;
      vocabularyTotalDifficulty += q.difficulty;
    }
    
    if (!vocabularyCategories[q.category]) {
      vocabularyCategories[q.category] = { correct: 0, total: 0 };
    }
    vocabularyCategories[q.category].total++;
    if (isCorrect) {
      vocabularyCategories[q.category].correct++;
    }
  });
  
  // 常識力スコア計算
  let commonSenseCorrect = 0;
  let commonSenseTotalDifficulty = 0;
  const commonSenseCategories: { [category: string]: { correct: number; total: number } } = {};
  
  commonSenseQuestions.forEach(q => {
    const userAnswer = parseInt(answers[q.id]);
    const isCorrect = userAnswer === q.correct;
    
    if (isCorrect) {
      commonSenseCorrect++;
      commonSenseTotalDifficulty += q.difficulty;
    }
    
    if (!commonSenseCategories[q.category]) {
      commonSenseCategories[q.category] = { correct: 0, total: 0 };
    }
    commonSenseCategories[q.category].total++;
    if (isCorrect) {
      commonSenseCategories[q.category].correct++;
    }
  });
  
  // スコア正規化（年齢と難易度を考慮）
  const vocabularyScore = calculateNormalizedScore(
    vocabularyCorrect, 
    vocabularyTotalDifficulty, 
    vocabularyQuestions.length, 
    age,
    'vocabulary'
  );
  
  const commonSenseScore = calculateNormalizedScore(
    commonSenseCorrect, 
    commonSenseTotalDifficulty, 
    commonSenseQuestions.length, 
    age,
    'common_sense'
  );
  
  // 総合スコア（語彙40% + 常識60%の重み付け）
  const totalScore = Math.round(vocabularyScore * 0.4 + commonSenseScore * 0.6);
  
  // 総合レベル算出（1-10）
  const overallLevel = Math.min(10, Math.max(1, Math.round(totalScore / 10)));
  
  return {
    vocabularyScore,
    commonSenseScore,
    totalScore,
    vocabularyDetails: {
      correct: vocabularyCorrect,
      total: vocabularyQuestions.length,
      categories: vocabularyCategories
    },
    commonSenseDetails: {
      correct: commonSenseCorrect,
      total: commonSenseQuestions.length,
      categories: commonSenseCategories
    },
    overallLevel
  };
}

// 年齢と問題タイプを考慮した正規化スコア計算
function calculateNormalizedScore(
  correct: number, 
  totalDifficulty: number, 
  totalQuestions: number, 
  age: number,
  type: 'vocabulary' | 'common_sense'
): number {
  if (totalQuestions === 0) return 0;
  
  // 基本スコア（正答率）
  const basicScore = (correct / totalQuestions) * 100;
  
  // 難易度ボーナス
  const avgDifficulty = totalDifficulty / correct || 0;
  const difficultyBonus = avgDifficulty * 2;
  
  // 年齢調整係数
  let ageAdjustment = 1.0;
  if (age >= 6 && age <= 8) {
    // 低学年：基本的な問題なので標準
    ageAdjustment = type === 'vocabulary' ? 1.0 : 1.1;
  } else if (age >= 9 && age <= 11) {
    // 中学年：バランス良く
    ageAdjustment = 1.0;
  } else if (age >= 12 && age <= 15) {
    // 高学年：より高度な理解が期待されるため厳しく
    ageAdjustment = type === 'vocabulary' ? 0.9 : 1.0;
  }
  
  const adjustedScore = (basicScore + difficultyBonus) * ageAdjustment;
  
  // 0-100の範囲に正規化
  return Math.min(100, Math.max(0, Math.round(adjustedScore)));
}

// テスト結果の詳細分析
export function analyzeTestPerformance(result: TestResult): {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
} {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  
  // 語彙力分析
  if (result.vocabularyScore >= 80) {
    strengths.push('語彙力が豊富です');
  } else if (result.vocabularyScore <= 50) {
    weaknesses.push('語彙力の向上が必要です');
    recommendations.push('読書量を増やして語彙を豊かにしましょう');
  }
  
  // 常識力分析
  if (result.commonSenseScore >= 80) {
    strengths.push('社会常識や判断力が優れています');
  } else if (result.commonSenseScore <= 50) {
    weaknesses.push('社会常識や判断力の向上が必要です');
    recommendations.push('日常生活での体験を増やし、社会のルールについて学びましょう');
  }
  
  // カテゴリ別分析（語彙）
  Object.entries(result.vocabularyDetails.categories).forEach(([category, stats]) => {
    if (stats.total > 0) {
      const rate = stats.correct / stats.total;
      if (rate >= 0.8) {
        strengths.push(`${category}分野の語彙が得意です`);
      } else if (rate <= 0.4) {
        weaknesses.push(`${category}分野の語彙が苦手です`);
        recommendations.push(`${category}に関する本や資料を読んでみましょう`);
      }
    }
  });
  
  // カテゴリ別分析（常識）
  Object.entries(result.commonSenseDetails.categories).forEach(([category, stats]) => {
    if (stats.total > 0) {
      const rate = stats.correct / stats.total;
      if (rate >= 0.8) {
        strengths.push(`${category}について良く理解しています`);
      } else if (rate <= 0.4) {
        weaknesses.push(`${category}についての理解を深める必要があります`);
        if (category === 'マナー') {
          recommendations.push('日常生活でのマナーを意識して過ごしましょう');
        } else if (category === '安全') {
          recommendations.push('安全に関する知識を身につけましょう');
        } else if (category === '環境') {
          recommendations.push('環境問題について関心を持ちましょう');
        } else {
          recommendations.push(`${category}について詳しく学んでみましょう`);
        }
      }
    }
  });
  
  // 総合レベルに応じたアドバイス
  if (result.overallLevel >= 8) {
    strengths.push('総合的な学習能力が高いです');
    recommendations.push('さらに高度な内容にチャレンジしてみましょう');
  } else if (result.overallLevel <= 4) {
    recommendations.push('基礎的な学習を大切にして、少しずつレベルアップしていきましょう');
  } else {
    recommendations.push('バランスよく学習を続けて、さらなる向上を目指しましょう');
  }
  
  return { strengths, weaknesses, recommendations };
}

// レベル別推奨図書ジャンル
export function getRecommendedGenres(overallLevel: number): string[] {
  if (overallLevel >= 8) {
    return ['推理小説', '科学読み物', '歴史小説', '哲学入門書', 'ノンフィクション'];
  } else if (overallLevel >= 6) {
    return ['冒険小説', 'ファンタジー', '科学読み物', '伝記', '図鑑'];
  } else if (overallLevel >= 4) {
    return ['童話', '絵本', '簡単な物語', '図鑑', '学習漫画'];
  } else {
    return ['絵本', '童話', 'しかけ絵本', '簡単な図鑑', '歌の本'];
  }
}