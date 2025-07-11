import { Book } from '../types/Book';

// 標準興味分野（UI提供項目）
export const STANDARD_INTERESTS = [
  'スポーツ', '成長', '自然', '日常', '動物', '科学', '料理', '冒険',
  '読書', 'ユーモア', '社会', '歴史', 'アニメ・まんが', '文学',
  'せかいの国ぐに', 'なぞとき', 'ファンタジー', '友情・恋愛', 
  '友情', '家族', '学校生活'
];

// 拡張興味分野（専門項目）
export const EXTENDED_INTERESTS = [
  '哲学', '教育', '古典', '音楽', '芸術', '宇宙・天体',
  '工作・手芸', '絵を描く', 'プログラミング', '心理学',
  '推理・謎解き', '旅行・地理', '感動', '魔法', '楽しさ'
];

// 全興味分野
export const ALL_INTERESTS = [...STANDARD_INTERESTS, ...EXTENDED_INTERESTS];

// 標準読書レベル
export const STANDARD_READING_LEVELS = [
  '小学校低学年',
  '小学校中学年',
  '中学受験〜中1・2年',
  '高校受験レベル'
];

// バリデーション結果の型定義
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
  recommendations: string[];
}

// 一括バリデーション結果の型定義
export interface BulkValidationResult {
  totalBooks: number;
  validBooks: number;
  invalidBooks: Array<{
    index: number;
    book: Partial<Book>;
    validation: ValidationResult;
  }>;
  warningBooks: Array<{
    index: number;
    book: Partial<Book>;
    validation: ValidationResult;
  }>;
  canProceed: boolean;
}

const NG_KEYWORDS = [
  'アダルト', '性描写', '暴力', '薬物', 'ギャンブル', 'ポルノ', '残酷', '殺人', '自殺', 'explicit', '18+', 'R18', '官能', 'レイプ', '虐待', '過激な性', '過激な暴力',
  '麻薬', 'SEX', 'ドラッグ'
];
const NG_GENRES = [
  'アダルト', '官能', 'ホラー（過激）', '犯罪（過激）', 'ポルノ', 'R18'
];

/**
 * 書籍が未成年にふさわしいか自動判定する
 * @param book Book型
 * @returns true:適切/false:不適切
 */
export function isBookAppropriateForMinors(book: Book): boolean {
  const text = [
    book.title,
    book.description,
    ...(book.categories || []),
    ...(book.interests || [])
  ].join(' ').toLowerCase();

  for (const ng of NG_KEYWORDS) {
    if (text.includes(ng.toLowerCase())) return false;
  }
  for (const genre of NG_GENRES) {
    if ((book.categories || []).map(c => c.toLowerCase()).includes(genre.toLowerCase())) return false;
  }
  // 年齢指定フィールドがあれば判定
  if (book.ageRange && book.ageRange.min >= 18) return false;

  return true;
}

/**
 * 推薦可能性スコアを計算
 */
export function calculateRecommendationScore(book: Partial<Book>): number {
  let score = 0;

  // 1. 年齢適合性チェック (30点満点)
  if (book.ageRange) {
    if (book.ageRange.min >= 6 && book.ageRange.max <= 15) {
      score += 30; // 完全適合
    } else if (book.ageRange.min >= 6 && book.ageRange.max <= 18) {
      score += 25; // 部分適合
    } else if (book.ageRange.max >= 6 && book.ageRange.min <= 15) {
      score += 20; // 重複あり
    }
  }

  // 2. 興味分野適合性 (30点満点)
  if (book.interests && book.interests.length > 0) {
    const standardCount = book.interests.filter(interest => 
      STANDARD_INTERESTS.includes(interest)
    ).length;
    
    if (standardCount >= 3) {
      score += 30; // 標準興味3つ以上
    } else if (standardCount >= 2) {
      score += 25; // 標準興味2つ
    } else if (standardCount >= 1) {
      score += 20; // 標準興味1つ
    } else {
      // 拡張興味分野のみの場合
      const extendedCount = book.interests.filter(interest => 
        EXTENDED_INTERESTS.includes(interest)
      ).length;
      if (extendedCount >= 2) {
        score += 15; // 拡張興味2つ以上
      } else if (extendedCount >= 1) {
        score += 10; // 拡張興味1つ
      }
    }
  }

  // 3. 読書レベル適合性 (20点満点)
  if (book.readingLevel && STANDARD_READING_LEVELS.includes(book.readingLevel)) {
    score += 20;
  }

  // 4. 語彙レベル適合性 (10点満点)
  if (book.vocabularyLevel && book.vocabularyLevel >= 1 && book.vocabularyLevel <= 10) {
    score += 10;
  }

  // 5. 評価加点 (10点満点)
  if (book.rating) {
    if (book.rating >= 4.5) {
      score += 10;
    } else if (book.rating >= 4.0) {
      score += 8;
    } else if (book.rating >= 3.5) {
      score += 5;
    }
  }

  return Math.min(score, 100);
}

/**
 * 新規図書のバリデーション
 */
export function validateNewBook(book: Partial<Book>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // 必須フィールドチェック
  if (!book.title?.trim()) {
    errors.push('タイトルは必須です');
  }

  if (!book.author?.trim()) {
    errors.push('著者名は必須です');
  }

  if (!book.id?.trim()) {
    errors.push('IDは必須です');
  }

  // 年齢範囲チェック
  if (!book.ageRange) {
    errors.push('年齢範囲は必須です');
  } else {
    if (book.ageRange.min < 6) {
      errors.push('年齢範囲の最小値は6歳以上にしてください');
    }
    if (book.ageRange.max > 18) {
      errors.push('年齢範囲の最大値は18歳以下にしてください');
    }
    if (book.ageRange.max > 15) {
      warnings.push('年齢範囲が15歳を超えています（推奨は15歳以下）');
    }
    if (book.ageRange.min >= book.ageRange.max) {
      errors.push('年齢範囲の最小値は最大値より小さくしてください');
    }
  }

  // 読書レベルチェック
  if (!book.readingLevel) {
    errors.push('読書レベルは必須です');
  } else if (!STANDARD_READING_LEVELS.includes(book.readingLevel)) {
    errors.push(`読書レベルは以下から選択してください: ${STANDARD_READING_LEVELS.join(', ')}`);
  }

  // 語彙レベルチェック
  if (book.vocabularyLevel === undefined || book.vocabularyLevel === null) {
    errors.push('語彙レベルは必須です');
  } else if (book.vocabularyLevel < 1 || book.vocabularyLevel > 10) {
    errors.push('語彙レベルは1-10の範囲で設定してください');
  }

  // 興味分野チェック
  if (!book.interests || book.interests.length === 0) {
    errors.push('興味分野は最低1つ設定してください');
  } else {
    const standardCount = book.interests.filter(interest => 
      STANDARD_INTERESTS.includes(interest)
    ).length;
    
    const validInterests = book.interests.filter(interest => 
      ALL_INTERESTS.includes(interest)
    ).length;
    
    if (validInterests !== book.interests.length) {
      const invalidInterests = book.interests.filter(interest => 
        !ALL_INTERESTS.includes(interest)
      );
      warnings.push(`未定義の興味分野があります: ${invalidInterests.join(', ')}`);
    }

    if (standardCount === 0) {
      errors.push('標準興味分野から最低1つ選択してください');
      recommendations.push('推薦されやすくするため、標準興味分野から2-3個選択することを推奨します');
    } else if (standardCount < 2) {
      warnings.push('標準興味分野をもう1-2個追加することを推奨します');
    }

    if (book.interests.length < 3) {
      recommendations.push('興味分野を3個以上設定することで推薦精度が向上します');
    }
  }

  // カテゴリチェック
  if (!book.categories || book.categories.length === 0) {
    errors.push('カテゴリは最低1つ設定してください');
  }

  // 評価チェック
  if (book.rating === undefined || book.rating === null) {
    errors.push('評価は必須です');
  } else if (book.rating < 1.0 || book.rating > 5.0) {
    errors.push('評価は1.0-5.0の範囲で設定してください');
  }

  // 推薦可能性スコア計算
  const score = calculateRecommendationScore(book);

  // スコアに基づく判定
  if (score < 40) {
    errors.push(`推薦可能性スコア ${score}点 - 40点以上必要です`);
    recommendations.push('年齢範囲、興味分野、レベル設定を見直してください');
  } else if (score < 60) {
    warnings.push(`推薦可能性スコア ${score}点 - 改善推奨です`);
    recommendations.push('より多くの標準興味分野を設定することで推薦率が向上します');
  } else if (score < 80) {
    recommendations.push(`推薦可能性スコア ${score}点 - 良好です`);
  }

  // 整合性チェック
  if (book.ageRange && book.readingLevel && book.vocabularyLevel) {
    const ageCenter = (book.ageRange.min + book.ageRange.max) / 2;
    
    // 年齢と語彙レベルの整合性
    if (ageCenter <= 8 && book.vocabularyLevel > 5) {
      warnings.push('低学年にしては語彙レベルが高すぎる可能性があります');
    }
    if (ageCenter >= 14 && book.vocabularyLevel < 6) {
      warnings.push('中学受験〜中学生向けレベルにしては語彙レベルが低すぎる可能性があります');
    }

    // 年齢と読書レベルの整合性
    if (ageCenter <= 8 && !['小学校低学年', '小学校中学年'].includes(book.readingLevel)) {
      warnings.push('年齢に対して読書レベルが高すぎる可能性があります');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score,
    recommendations
  };
}

/**
 * 図書の一括バリデーション
 */
export function validateBulkBooks(books: Partial<Book>[]): BulkValidationResult {
  const results = books.map((book, index) => ({
    index,
    book,
    validation: validateNewBook(book)
  }));

  const invalid = results.filter(r => !r.validation.isValid);
  const warnings = results.filter(r => r.validation.warnings.length > 0);

  return {
    totalBooks: books.length,
    validBooks: books.length - invalid.length,
    invalidBooks: invalid,
    warningBooks: warnings,
    canProceed: invalid.length === 0
  };
}

/**
 * 推薦可能性の改善提案生成
 */
export function generateImprovementSuggestions(book: Partial<Book>): string[] {
  const suggestions: string[] = [];
  const score = calculateRecommendationScore(book);

  if (score < 60) {
    // 年齢範囲の改善提案
    if (!book.ageRange || book.ageRange.min < 6 || book.ageRange.max > 15) {
      suggestions.push('年齢範囲を6-15歳の範囲内に設定してください');
    }

    // 興味分野の改善提案
    if (!book.interests || book.interests.length < 3) {
      suggestions.push('興味分野を3個以上設定してください');
    }

    const standardCount = book.interests?.filter(interest => 
      STANDARD_INTERESTS.includes(interest)
    ).length || 0;

    if (standardCount < 2) {
      suggestions.push('標準興味分野から2-3個選択してください');
      suggestions.push(`推奨: ${STANDARD_INTERESTS.slice(0, 10).join(', ')} など`);
    }

    // レベル設定の改善提案
    if (!book.readingLevel || !STANDARD_READING_LEVELS.includes(book.readingLevel)) {
      suggestions.push('適切な読書レベルを設定してください');
    }

    if (!book.vocabularyLevel || book.vocabularyLevel < 1 || book.vocabularyLevel > 10) {
      suggestions.push('語彙レベルを1-10の範囲で適切に設定してください');
    }
  }

  return suggestions;
}

/**
 * 推薦カバレッジの確認
 */
export function checkRecommendationCoverage(books: Book[]): {
  totalBooks: number;
  recommendableBooks: number;
  coverage: number;
  unrecommendableBooks: Book[];
} {
  const recommendableBooks = books.filter(book => {
    const validation = validateNewBook(book);
    return validation.isValid && validation.score >= 40;
  });

  const unrecommendableBooks = books.filter(book => {
    const validation = validateNewBook(book);
    return !validation.isValid || validation.score < 40;
  });

  return {
    totalBooks: books.length,
    recommendableBooks: recommendableBooks.length,
    coverage: books.length > 0 ? (recommendableBooks.length / books.length) * 100 : 0,
    unrecommendableBooks
  };
}