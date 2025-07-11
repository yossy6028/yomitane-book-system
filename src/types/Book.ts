export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  coverImage?: string;
  publisher: string;
  publishedDate: string;
  categories: string[];
  ageRange: {
    min: number;
    max: number;
  };
  readingLevel: '小学校低学年' | '小学校中学年' | '小学校高学年〜中学1・2年' | '高校受験レベル';
  vocabularyLevel: number; // 1-10 scale
  interests: string[]; // スポーツ、音楽、科学など
  rating: number; // 1-5 stars
  pageCount?: number;
  isbn?: string;
  amazonUrl?: string;
  libraryUrl?: string;
  lastUpdated: string;
  source: 'google_books' | 'rakuten' | 'manual';
  examSources?: ExamSource[]; // 受験出典情報
}

export interface ExamSource {
  year: number; // 出題年度
  school: string; // 学校名
  examType: '国語' | '高校受験';
  subject?: string; // 科目（国語、現代文など）
  verified: boolean; // 情報の確認済みフラグ
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
}

export interface BookFilter {
  ageRange?: {
    min: number;
    max: number;
  };
  interests?: string[];
  readingLevel?: string[];
  categories?: string[];
  searchTerm?: string;
}