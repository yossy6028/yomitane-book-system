export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  coverImage?: string;
  publisher: string;
  publishedDate?: string;
  publishedYear?: number | null;
  categories: string[];
  ageRange: {
    min: number;
    max: number;
  };
  minAge?: number; // テスト互換性のため
  maxAge?: number; // テスト互換性のため
  
  // 読書レベル関連フィールド
  reading_level_24?: number; // 24段階の難易度レベル（1-24）- PRIMARY FIELD
  readingLevel?: string; // @deprecated - use reading_level_24 instead
  reading_level?: number; // @deprecated - use reading_level_24 instead
  vocabularyLevel?: number; // 1-10 scale
  
  rating: number; // 1-5 stars
  pageCount?: number; // 統一されたページ数フィールド
  isbn?: string;
  amazonUrl?: string;
  libraryUrl?: string;
  lastUpdated?: string;
  source?: 'google_books' | 'rakuten' | 'manual';
  examSources?: string[]; // 受験出典情報（学校名）
  examSource?: ExamSourceData; // 新しい受験出典情報
  notes?: string; // 備考・注記
  
  // タグシステムのフィールド（非推奨）
  primaryCategory?: string; // @deprecated - use categories instead
  genres?: string[]; // @deprecated - use categories instead
  themes?: string[]; // @deprecated - use theme_tags instead
  targetAudience?: string[]; // @deprecated - use ageRange instead
  interests?: string[]; // @deprecated - use interest_tags instead
  
  // 新しい3軸分類システム（CURRENT STANDARD）
  subject_areas?: string[]; // 学問領域（biology, physics等）
  interest_tags?: string[]; // 具体的な興味（動物、魔法、学校等）- PRIMARY FIELD
  theme_tags?: string[]; // 抽象的なテーマ（友情、成長物語等）- PRIMARY FIELD
}

export interface ExamSourceData {
  year: number;
  schoolCount: number;
  priority: string;
  source: string;
}

export interface ExamSource {
  year: number; // 出題年度
  rank: number; // ランキング順位
  schools: number; // 出題校数
  genre: string; // ジャンル（物語文、説明文など）
}

export interface BookUpdateLog {
  id: string;
  timestamp: string;
  booksUpdated: number;
  booksAdded: number;
  booksRemoved: number;
  source: string;
  status: 'success' | 'error' | 'partial';
  errorMessage?: string;
  action?: string;
  bookTitle?: string;
}

export interface BookFilter {
  ageRange?: {
    min: number;
    max: number;
  };
  minAge?: number;
  maxAge?: number;
  interests?: string[];
  readingLevel?: string[] | number[];
  readingLevel24?: number[];
  categories?: string[];
  searchTerm?: string;
  searchKeyword?: string;
  interestTags?: string[];
  themeTags?: string[];
  testResultFilter?: {
    enabled: boolean;
  };
}