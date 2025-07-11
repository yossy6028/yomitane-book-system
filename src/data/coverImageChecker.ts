import { initialBooks } from './initialBooks';
import { Book } from '../types/Book';

/**
 * 書籍データベースの表紙画像の整合性をチェックする
 */

interface CoverImageAnalysis {
  totalBooks: number;
  booksWithCoverImage: Book[];
  booksWithoutCoverImage: Book[];
  urlPatterns: {
    googleImages: Book[];
    amazonImages: Book[];
    otherSources: Book[];
  };
  highPriorityBooks: Book[];
  potentialIssues: {
    book: Book;
    issue: string;
    severity: 'low' | 'medium' | 'high';
  }[];
}

/**
 * 重要度の高い書籍を特定する（人気作品・名作）
 */
function isHighPriorityBook(book: Book): boolean {
  const highPriorityKeywords = [
    '芥川龍之介', '夏目漱石', '宮沢賢治', '太宰治', '森鴎外',
    'ハリー・ポッター', 'ナルニア', 'ライオン・キング',
    '赤毛のアン', 'アンデルセン', 'グリム童話',
    'かいけつゾロリ', 'おしりたんてい', 'ノンタン',
    'はらぺこあおむし', 'ぐりとぐら', 'おおきなかぶ',
    'ドラえもん', 'サザエさん', 'ちびまる子ちゃん',
    '坂本龍馬', '織田信長', '徳川家康'
  ];

  const highRating = book.rating >= 4.3;
  const containsKeyword = highPriorityKeywords.some(keyword => 
    book.title.includes(keyword) || book.author.includes(keyword)
  );
  const classicPublisher = ['岩波書店', '新潮社', '偕成社', 'ポプラ社', '講談社', '小学館'].includes(book.publisher);

  return highRating || containsKeyword || classicPublisher;
}

/**
 * URLパターンを分析する
 */
function analyzeUrlPattern(url: string): 'google' | 'amazon' | 'other' {
  if (url.includes('encrypted-tbn0.gstatic.com') || url.includes('googleusercontent.com')) {
    return 'google';
  }
  if (url.includes('amazon.com') || url.includes('amazon.co.jp')) {
    return 'amazon';
  }
  return 'other';
}

/**
 * 潜在的な問題を検出する
 */
function detectPotentialIssues(book: Book): { issue: string; severity: 'low' | 'medium' | 'high' } | null {
  // 表紙画像が設定されていない高優先度の書籍
  if (!book.coverImage && isHighPriorityBook(book)) {
    return {
      issue: '高優先度の書籍だが表紙画像が設定されていない',
      severity: 'high'
    };
  }

  // Google画像のURLが古い形式またはキャッシュされている可能性
  if (book.coverImage && book.coverImage.includes('encrypted-tbn0.gstatic.com')) {
    return {
      issue: 'Google画像のキャッシュURLを使用（将来的にリンク切れの可能性）',
      severity: 'medium'
    };
  }

  // ISBNが設定されているのに表紙画像が空
  if (book.isbn && !book.coverImage) {
    return {
      issue: 'ISBNが設定されているが表紙画像が未設定',
      severity: 'medium'
    };
  }

  // 著者名や出版社の一般的でない表記
  if (book.author.includes('？') || book.publisher.includes('？')) {
    return {
      issue: '著者名または出版社に不明な情報が含まれている',
      severity: 'low'
    };
  }

  return null;
}

/**
 * 表紙画像の整合性チェックを実行
 */
export function analyzeCoverImages(): CoverImageAnalysis {
  const booksWithCoverImage = initialBooks.filter(book => book.coverImage && book.coverImage.trim() !== '');
  const booksWithoutCoverImage = initialBooks.filter(book => !book.coverImage || book.coverImage.trim() === '');
  
  const urlPatterns = {
    googleImages: booksWithCoverImage.filter(book => book.coverImage && analyzeUrlPattern(book.coverImage) === 'google'),
    amazonImages: booksWithCoverImage.filter(book => book.coverImage && analyzeUrlPattern(book.coverImage) === 'amazon'),
    otherSources: booksWithCoverImage.filter(book => book.coverImage && analyzeUrlPattern(book.coverImage) === 'other')
  };

  const highPriorityBooks = initialBooks.filter(isHighPriorityBook);
  
  const potentialIssues = initialBooks
    .map(book => {
      const issue = detectPotentialIssues(book);
      return issue ? { book, issue: issue.issue, severity: issue.severity } : null;
    })
    .filter(item => item !== null) as CoverImageAnalysis['potentialIssues'];

  return {
    totalBooks: initialBooks.length,
    booksWithCoverImage,
    booksWithoutCoverImage,
    urlPatterns,
    highPriorityBooks,
    potentialIssues
  };
}

/**
 * 分析結果をコンソールに出力
 */
export function printAnalysisReport(): void {
  const analysis = analyzeCoverImages();
  
  console.log('=== 書籍データベース表紙画像整合性チェック ===\n');
  
  console.log(`📊 総書籍数: ${analysis.totalBooks}冊`);
  console.log(`🖼️  表紙画像設定済み: ${analysis.booksWithCoverImage.length}冊 (${((analysis.booksWithCoverImage.length / analysis.totalBooks) * 100).toFixed(1)}%)`);
  console.log(`❌ 表紙画像未設定: ${analysis.booksWithoutCoverImage.length}冊 (${((analysis.booksWithoutCoverImage.length / analysis.totalBooks) * 100).toFixed(1)}%)`);
  console.log(`⭐ 高優先度書籍: ${analysis.highPriorityBooks.length}冊\n`);

  console.log('=== URL パターン分析 ===');
  console.log(`🔍 Google画像: ${analysis.urlPatterns.googleImages.length}冊`);
  console.log(`🛒 Amazon画像: ${analysis.urlPatterns.amazonImages.length}冊`);
  console.log(`🌐 その他のソース: ${analysis.urlPatterns.otherSources.length}冊\n`);

  console.log('=== 表紙画像設定済み書籍一覧 ===');
  analysis.booksWithCoverImage.forEach((book, index) => {
    const urlType = book.coverImage ? analyzeUrlPattern(book.coverImage) : 'unknown';
    const priorityMark = isHighPriorityBook(book) ? '⭐' : '';
    console.log(`${index + 1}. ${priorityMark}${book.title} (${book.author}) - ${urlType} - Rating: ${book.rating}`);
  });

  console.log('\n=== 高優先度書籍で表紙画像未設定 ===');
  const highPriorityWithoutCover = analysis.highPriorityBooks.filter(book => !book.coverImage || book.coverImage.trim() === '');
  highPriorityWithoutCover.forEach((book, index) => {
    console.log(`${index + 1}. ${book.title} (${book.author}) - ${book.publisher} - Rating: ${book.rating}`);
  });

  console.log('\n=== 潜在的な問題 ===');
  const groupedIssues = {
    high: analysis.potentialIssues.filter(issue => issue.severity === 'high'),
    medium: analysis.potentialIssues.filter(issue => issue.severity === 'medium'),
    low: analysis.potentialIssues.filter(issue => issue.severity === 'low')
  };

  console.log(`🔴 高優先度の問題: ${groupedIssues.high.length}件`);
  groupedIssues.high.forEach((issue, index) => {
    console.log(`  ${index + 1}. ${issue.book.title} (${issue.book.author}) - ${issue.issue}`);
  });

  console.log(`🟡 中優先度の問題: ${groupedIssues.medium.length}件`);
  groupedIssues.medium.slice(0, 10).forEach((issue, index) => {
    console.log(`  ${index + 1}. ${issue.book.title} (${issue.book.author}) - ${issue.issue}`);
  });
  if (groupedIssues.medium.length > 10) {
    console.log(`  ... 他${groupedIssues.medium.length - 10}件`);
  }

  console.log(`🔵 低優先度の問題: ${groupedIssues.low.length}件`);

  console.log('\n=== 推奨アクション ===');
  console.log('1. 高優先度書籍の表紙画像を優先的に設定');
  console.log('2. Google画像のキャッシュURLを公式な画像URLに変更');
  console.log('3. ISBN情報を活用して自動的に表紙画像を取得する仕組みを構築');
  console.log('4. 著者名・出版社情報の正確性を確認');
  console.log('5. 定期的にリンク切れをチェックするシステムを導入');
}

/**
 * 表紙画像のURL検証（実際のURLアクセスチェック）
 */
export async function validateCoverImageUrls(): Promise<{
  validUrls: string[];
  invalidUrls: string[];
  timeoutUrls: string[];
}> {
  const analysis = analyzeCoverImages();
  const validUrls: string[] = [];
  const invalidUrls: string[] = [];
  const timeoutUrls: string[] = [];

  console.log('🔍 表紙画像URLの検証を開始...');

  for (const book of analysis.booksWithCoverImage) {
    if (!book.coverImage) continue;
    
    try {
      const response = await fetch(book.coverImage, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        validUrls.push(book.coverImage);
        console.log(`✅ ${book.title}: OK`);
      } else {
        invalidUrls.push(book.coverImage);
        console.log(`❌ ${book.title}: ${response.status}`);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        timeoutUrls.push(book.coverImage);
        console.log(`⏰ ${book.title}: Timeout`);
      } else {
        invalidUrls.push(book.coverImage);
        console.log(`❌ ${book.title}: Error`);
      }
    }
  }

  return { validUrls, invalidUrls, timeoutUrls };
}

// メイン実行部分
if (require.main === module) {
  printAnalysisReport();
}