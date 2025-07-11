/**
 * 書籍データのインポート機能
 * CSV/TSV形式からの一括インポート
 */
import { Book } from '../types/Book';

export interface ImportResult {
  success: boolean;
  addedBooks: number;
  updatedBooks: number;
  errors: string[];
  importedBooks: Book[];
}

export interface ImportOptions {
  format: 'csv' | 'tsv' | 'auto';
  skipFirstRow: boolean;
  updateExisting: boolean;
}

/**
 * TSV/CSV文字列から書籍データをパース
 */
export const parseBooksFromText = (content: string, options: ImportOptions = { format: 'auto', skipFirstRow: true, updateExisting: true }): Book[] => {
  const lines = content.trim().split('\n');
  
  if (lines.length === 0) {
    throw new Error('インポートデータが空です');
  }

  // 区切り文字を自動判定
  let delimiter = '\t';
  if (options.format === 'csv') {
    delimiter = ',';
  } else if (options.format === 'auto') {
    const firstLine = lines[0];
    delimiter = firstLine.includes('\t') ? '\t' : ',';
  }

  // ヘッダー行をスキップ
  const dataLines = options.skipFirstRow ? lines.slice(1) : lines;
  
  // 期待される列インデックス
  const COLUMN_MAPPING = {
    id: 0,
    title: 1,
    author: 2,
    publisher: 3,
    publishedDate: 4,
    ageRangeMin: 5,
    ageRangeMax: 6,
    readingLevel: 7,
    vocabularyLevel: 8,
    categories: 9,
    interests: 10,
    rating: 11,
    pageCount: 12,
    isbn: 13,
    description: 14,
    coverImage: 15,
    amazonUrl: 16,
    libraryUrl: 17,
    lastUpdated: 18,
    source: 19
  };

  const books: Book[] = [];
  
  dataLines.forEach((line, index) => {
    try {
      const columns = parseCSVLine(line, delimiter);
      
      if (columns.length < 10) {
        console.warn(`行 ${index + 1}: 列数が不足しています (${columns.length}列)`);
        return;
      }

      const book: Book = {
        id: columns[COLUMN_MAPPING.id] || `imported_${Date.now()}_${index}`,
        title: columns[COLUMN_MAPPING.title] || '',
        author: columns[COLUMN_MAPPING.author] || '',
        publisher: columns[COLUMN_MAPPING.publisher] || '',
        publishedDate: columns[COLUMN_MAPPING.publishedDate] || '',
        ageRange: {
          min: parseInt(columns[COLUMN_MAPPING.ageRangeMin]) || 6,
          max: parseInt(columns[COLUMN_MAPPING.ageRangeMax]) || 15
        },
        readingLevel: (columns[COLUMN_MAPPING.readingLevel] || '小学校中学年') as any,
        vocabularyLevel: parseInt(columns[COLUMN_MAPPING.vocabularyLevel]) || 5,
        categories: parseArrayField(columns[COLUMN_MAPPING.categories]),
        interests: parseArrayField(columns[COLUMN_MAPPING.interests]),
        rating: parseFloat(columns[COLUMN_MAPPING.rating]) || 3.0,
        pageCount: parseInt(columns[COLUMN_MAPPING.pageCount]) || undefined,
        isbn: columns[COLUMN_MAPPING.isbn] || undefined,
        description: columns[COLUMN_MAPPING.description] || '',
        coverImage: columns[COLUMN_MAPPING.coverImage] || '',
        amazonUrl: columns[COLUMN_MAPPING.amazonUrl] || '',
        libraryUrl: columns[COLUMN_MAPPING.libraryUrl] || '',
        lastUpdated: columns[COLUMN_MAPPING.lastUpdated] || new Date().toISOString().split('T')[0],
        source: (columns[COLUMN_MAPPING.source] || 'manual') as any
      };

      // 必須フィールドの検証
      if (!book.title || !book.author) {
        console.warn(`行 ${index + 1}: タイトルまたは著者が空です`);
        return;
      }

      books.push(book);
    } catch (error) {
      console.error(`行 ${index + 1} パースエラー:`, error);
    }
  });

  return books;
};

/**
 * CSV行をパース（引用符対応）
 */
const parseCSVLine = (line: string, delimiter: string): string[] => {
  if (delimiter === '\t') {
    // TSVの場合はシンプルに分割
    return line.split('\t').map(cell => cell.trim());
  }

  // CSVの場合は引用符を考慮
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // エスケープされた引用符
        current += '"';
        i += 2;
      } else {
        // 引用符の開始/終了
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === delimiter && !inQuotes) {
      // 区切り文字
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  result.push(current.trim());
  return result;
};

/**
 * 配列フィールドをパース（セミコロン区切り）
 */
const parseArrayField = (value: string): string[] => {
  if (!value || value.trim() === '') {
    return [];
  }
  return value.split(';').map(item => item.trim()).filter(item => item !== '');
};

/**
 * TSVからのインポート（互換性用）
 */
export const importBooksFromTSV = async (tsvContent: string): Promise<ImportResult> => {
  try {
    const importedBooks = parseBooksFromText(tsvContent, { format: 'tsv', skipFirstRow: true, updateExisting: true });
    
    const result: ImportResult = {
      success: true,
      addedBooks: importedBooks.length,
      updatedBooks: 0,
      errors: [],
      importedBooks
    };

    return result;
  } catch (error) {
    return {
      success: false,
      addedBooks: 0,
      updatedBooks: 0,
      errors: [error instanceof Error ? error.message : '未知のエラー'],
      importedBooks: []
    };
  }
};

/**
 * ファイルからのインポート
 */
export const importBooksFromFile = (file: File): Promise<ImportResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const format = file.name.endsWith('.csv') ? 'csv' : 'tsv';
        const result = await importBooksFromTSV(content);
        resolve(result);
      } catch (error) {
        resolve({
          success: false,
          addedBooks: 0,
          updatedBooks: 0,
          errors: [error instanceof Error ? error.message : 'ファイル読み込みエラー'],
          importedBooks: []
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        addedBooks: 0,
        updatedBooks: 0,
        errors: ['ファイル読み込みに失敗しました'],
        importedBooks: []
      });
    };

    reader.readAsText(file, 'UTF-8');
  });
};

/**
 * 書籍データの検証
 */
export const validateBookData = (book: Book): string[] => {
  const errors: string[] = [];

  if (!book.title || book.title.trim() === '') {
    errors.push('タイトルが空です');
  }

  if (!book.author || book.author.trim() === '') {
    errors.push('著者が空です');
  }

  if (book.ageRange.min < 0 || book.ageRange.max < 0) {
    errors.push('対象年齢は0以上である必要があります');
  }

  if (book.ageRange.min > book.ageRange.max) {
    errors.push('対象年齢の最小値が最大値より大きいです');
  }

  const validReadingLevels = ['小学校低学年', '小学校中学年', '中学受験〜中1・2年', '高校受験レベル'];
  if (!validReadingLevels.includes(book.readingLevel)) {
    errors.push(`読書レベルが無効です: ${book.readingLevel}`);
  }

  if (book.rating && (book.rating < 0 || book.rating > 5)) {
    errors.push('評価は0-5の範囲である必要があります');
  }

  return errors;
};