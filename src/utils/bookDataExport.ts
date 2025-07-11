/**
 * 書籍データのエクスポート機能
 * CSV/TSV形式でスプレッドシート連携を実現
 */
import { Book, ExamSource } from '../types/Book';

export interface ExportFormat {
  format: 'csv' | 'tsv';
  includeHeaders: boolean;
}

/**
 * 受験出典情報をフォーマット
 */
const formatExamSources = (examSources: ExamSource[]): string => {
  if (!examSources || examSources.length === 0) {
    return '';
  }

  return examSources
    .map(source => `${source.year}年度${source.school}${source.examType}`)
    .join(';');
};

/**
 * 書籍データをCSV/TSV形式に変換
 */
export const exportBooksToSpreadsheet = (books: Book[], options: ExportFormat = { format: 'tsv', includeHeaders: true }): string => {
  const delimiter = options.format === 'csv' ? ',' : '\t';
  
  // スプレッドシート用ヘッダー
  const headers = [
    'ID',
    'タイトル',
    '著者', 
    '出版社',
    '出版日',
    '対象年齢（最小）',
    '対象年齢（最大）',
    '読書レベル',
    '語彙レベル',
    'ジャンル',
    '興味分野',
    '評価',
    'ページ数',
    'ISBN',
    'あらすじ',
    '表紙画像URL',
    'AmazonURL',
    '図書館URL',
    '更新日',
    'データソース',
    '受験出典情報'
  ];

  // データ行を生成
  const rows = books.map(book => [
    book.id,
    book.title,
    book.author,
    book.publisher,
    book.publishedDate,
    book.ageRange.min.toString(),
    book.ageRange.max.toString(),
    book.readingLevel,
    book.vocabularyLevel?.toString() || '',
    Array.isArray(book.categories) ? book.categories.join(';') : book.categories,
    Array.isArray(book.interests) ? book.interests.join(';') : book.interests,
    book.rating?.toString() || '',
    book.pageCount?.toString() || '',
    book.isbn || '',
    book.description,
    book.coverImage,
    book.amazonUrl || '',
    book.libraryUrl || '',
    book.lastUpdated,
    book.source || 'manual',
    formatExamSources(book.examSources || [])
  ]);

  // CSVエスケープ処理
  const escapeValue = (value: string): string => {
    if (options.format === 'csv') {
      // CSV: ダブルクォートで囲み、内部のダブルクォートをエスケープ
      return `"${value.replace(/"/g, '""')}"`;
    } else {
      // TSV: タブと改行をエスケープ
      return value.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '');
    }
  };

  // ヘッダーとデータを結合
  const lines: string[] = [];
  
  if (options.includeHeaders) {
    lines.push(headers.map(h => escapeValue(h)).join(delimiter));
  }
  
  rows.forEach(row => {
    lines.push(row.map(cell => escapeValue(cell || '')).join(delimiter));
  });

  return lines.join('\n');
};

/**
 * スプレッドシート用テンプレートを生成
 */
export const generateSpreadsheetTemplate = (): string => {
  const templateData = {
    title: '新しい書籍',
    author: '著者名',
    publisher: '出版社',
    publishedDate: '2024',
    ageRangeMin: '8',
    ageRangeMax: '12',
    readingLevel: '小学校中学年',
    vocabularyLevel: '5',
    categories: '物語;冒険',
    interests: '冒険;友情',
    rating: '4.0',
    pageCount: '200',
    isbn: '',
    description: 'あらすじを入力してください',
    coverImage: '',
    amazonUrl: '',
    libraryUrl: '',
    source: 'manual'
  };

  const headers = [
    'ID', 'タイトル', '著者', '出版社', '出版日',
    '対象年齢（最小）', '対象年齢（最大）', '読書レベル', '語彙レベル',
    'ジャンル', '興味分野', '評価', 'ページ数', 'ISBN', 'あらすじ',
    '表紙画像URL', 'AmazonURL', '図書館URL', '更新日', 'データソース'
  ];

  const templateRow = [
    'new_' + Date.now(),
    templateData.title,
    templateData.author,
    templateData.publisher,
    templateData.publishedDate,
    templateData.ageRangeMin,
    templateData.ageRangeMax,
    templateData.readingLevel,
    templateData.vocabularyLevel,
    templateData.categories,
    templateData.interests,
    templateData.rating,
    templateData.pageCount,
    templateData.isbn,
    templateData.description,
    templateData.coverImage,
    templateData.amazonUrl,
    templateData.libraryUrl,
    new Date().toISOString().split('T')[0],
    templateData.source
  ];

  return [headers.join('\t'), templateRow.join('\t')].join('\n');
};

/**
 * ブラウザでファイルダウンロード
 */
export const downloadAsFile = (content: string, filename: string, mimeType: string = 'text/plain'): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * クリップボードにコピー
 */
export const copyToClipboard = async (content: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    console.error('クリップボードコピーエラー:', error);
    return false;
  }
};

/**
 * 書籍データをCSVファイルとしてダウンロード（互換性用）
 */
export const downloadBooksAsCSV = (books: Book[]): void => {
  const csvContent = exportBooksToSpreadsheet(books, { format: 'csv', includeHeaders: true });
  const filename = `books_export_${new Date().toISOString().split('T')[0]}.csv`;
  downloadAsFile(csvContent, filename, 'text/csv');
};

/**
 * 書籍データをクリップボードにコピー（互換性用）
 */
export const copyBooksToClipboard = async (books: Book[]): Promise<boolean> => {
  const tsvContent = exportBooksToSpreadsheet(books, { format: 'tsv', includeHeaders: true });
  return await copyToClipboard(tsvContent);
};

/**
 * 書籍統計情報を取得
 */
export const getBookStatistics = (books: Book[]) => {
  const stats = {
    total: books.length,
    totalBooks: books.length,
    byReadingLevel: {} as Record<string, number>,
    byAgeRange: {} as Record<string, number>,
    bySource: {} as Record<string, number>,
    withCoverImage: 0,
    withoutCoverImage: 0,
    withISBN: 0,
    withoutISBN: 0,
    averageRating: 0
  };

  let totalRating = 0;
  let ratedBooks = 0;

  books.forEach(book => {
    // 読書レベル別
    stats.byReadingLevel[book.readingLevel] = (stats.byReadingLevel[book.readingLevel] || 0) + 1;
    
    // 年齢範囲別
    const ageKey = `${book.ageRange.min}-${book.ageRange.max}歳`;
    stats.byAgeRange[ageKey] = (stats.byAgeRange[ageKey] || 0) + 1;
    
    // データソース別
    const source = book.source || 'manual';
    stats.bySource[source] = (stats.bySource[source] || 0) + 1;
    
    // 表紙画像有無
    if (book.coverImage && book.coverImage.trim() !== '') {
      stats.withCoverImage++;
    } else {
      stats.withoutCoverImage++;
    }
    
    // ISBN有無
    if (book.isbn && book.isbn.trim() !== '') {
      stats.withISBN++;
    } else {
      stats.withoutISBN++;
    }
    
    // 評価
    if (book.rating && book.rating > 0) {
      totalRating += book.rating;
      ratedBooks++;
    }
  });

  stats.averageRating = ratedBooks > 0 ? totalRating / ratedBooks : 0;

  return stats;
};