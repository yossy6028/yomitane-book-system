export interface User {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  age: number;
  readingLevel: '小学校低学年' | '小学校中学年' | '小学校高学年〜中学1・2年' | '高校受験レベル';
  interests: string[];
  vocabularyScore: number;
  personalityTraits: string[];
  createdAt: string;
  lastActiveAt: string;
  isActive: boolean;
  avatar?: string;
  parentEmail?: string; // 保護者連絡先
  schoolGrade?: string; // 学年
  testHistory?: TestResult[];
}

export interface TestResult {
  id: string;
  userId: string;
  testDate: string;
  vocabularyScore: number;
  commonSenseScore: number;
  overallLevel: number;
  testType: 'initial' | 'progress' | 'challenge';
  questions: TestQuestion[];
  answers: TestAnswer[];
  timeSpent: number; // 分
}

export interface TestQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  category: 'vocabulary' | 'common_sense';
  difficulty: number; // 1-5
}

export interface TestAnswer {
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  timeSpent: number; // 秒
}

export interface ReadingRecord {
  id: string;
  userId: string;
  bookId: string;
  startDate: string;
  endDate?: string;
  readingTime: number; // 分
  pagesRead: number;
  totalPages: number;
  status: 'reading' | 'completed' | 'paused' | 'abandoned';
  rating?: number; // 1-5
  notes?: string;
  coachSessions?: CoachSession[];
  comprehensionScore?: number;
  reflection?: string; // 感想
  createdAt: string;
  updatedAt: string;
}

export interface CoachSession {
  id: string;
  recordId: string;
  sessionDate: string;
  questions: CoachQuestion[];
  answers: string[];
  advice: string;
  comprehensionScore: number;
  nextRecommendation?: string;
  sessionType: 'post_reading' | 'progress_check' | 'challenge';
  duration: number; // 分
}

export interface CoachQuestion {
  id: string;
  question: string;
  expectedAnswer?: string;
  category: 'comprehension' | 'reflection' | 'analysis' | 'application';
  difficulty: number;
}

export interface ReadingGoal {
  id: string;
  userId: string;
  type: 'books_per_month' | 'pages_per_day' | 'reading_time_per_day' | 'genres_to_explore';
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string; // '冊', 'ページ', '分', 'ジャンル'
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'paused' | 'failed';
  rewards?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReadingStreak {
  id: string;
  userId: string;
  currentStreak: number; // 現在の連続日数
  longestStreak: number; // 最長連続日数
  lastReadingDate: string;
  streakStartDate: string;
  totalReadingDays: number;
  streakHistory: StreakDay[];
}

export interface StreakDay {
  date: string;
  readingTime: number; // 分
  booksRead: number;
  pagesRead: number;
  achieved: boolean;
}

export interface NotificationSettings {
  userId: string;
  readingReminder: {
    enabled: boolean;
    time: string; // HH:MM format
    frequency: 'daily' | 'weekdays' | 'weekends' | 'custom';
    customDays?: string[]; // ['monday', 'tuesday', ...]
    message?: string;
  };
  goalReminder: {
    enabled: boolean;
    frequency: 'daily' | 'weekly';
    time: string;
  };
  coachSession: {
    enabled: boolean;
    autoStart: boolean;
    reminderTime: string;
  };
  achievements: {
    enabled: boolean;
    celebrateStreaks: boolean;
    celebrateGoals: boolean;
  };
}

// 本部集計用の型定義
export interface UserStats {
  totalUsers: number;
  activeUsers: number; // 過去30日間にアクティブ
  newUsersThisMonth: number;
  averageAge: number;
  readingLevelDistribution: Record<string, number>;
  interestDistribution: Record<string, number>;
  totalBooksRead: number;
  totalReadingTime: number; // 分
  averageReadingTime: number;
  topBooks: BookPopularity[];
  topGenres: GenrePopularity[];
  testScoreDistribution: {
    vocabularyAverage: number;
    commonSenseAverage: number;
    overallAverage: number;
  };
  streakStats: {
    averageStreak: number;
    longestStreak: number;
    activeStreaks: number;
  };
  goalStats: {
    totalGoals: number;
    completedGoals: number;
    completionRate: number;
  };
  coachStats: {
    totalSessions: number;
    averageComprehension: number;
    mostCommonQuestions: string[];
  };
}

export interface BookPopularity {
  bookId: string;
  title: string;
  author: string;
  readCount: number;
  averageRating: number;
  completionRate: number;
  averageReadingTime: number;
  ageGroups: Record<string, number>; // 年齢別読書者数
}

export interface GenrePopularity {
  genre: string;
  readCount: number;
  userCount: number;
  averageRating: number;
  trending: boolean; // 最近人気上昇中
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: 'super_admin' | 'admin' | 'teacher' | 'librarian';
  permissions: AdminPermission[];
  createdAt: string;
  lastLoginAt: string;
  isActive: boolean;
  managedUsers?: string[]; // 管理対象のユーザーID
  department?: string; // 部署・組織
  phone?: string;
  notes?: string;
  passwordHash?: string; // セキュリティ用（実際の実装では適切にハッシュ化）
  twoFactorEnabled?: boolean;
  sessionTimeout?: number; // セッション有効期限（分）
}

export interface AdminPermission {
  resource: 'users' | 'books' | 'stats' | 'system' | 'reports';
  actions: ('read' | 'write' | 'delete' | 'export')[];
}

export interface AdminSession {
  id: string;
  adminId: string;
  createdAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  lastActivity: string;
}

export interface AdminLoginAttempt {
  id: string;
  username: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  timestamp: string;
  failureReason?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: 'login' | 'logout' | 'start_reading' | 'finish_reading' | 'take_test' | 'set_goal' | 'coach_session';
  details: Record<string, any>;
  timestamp: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}