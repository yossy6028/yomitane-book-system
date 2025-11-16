import axios from 'axios';
import { Book, BookFilter, BookUpdateLog } from '../types/Book';
import { rawBooks } from '../data/initialBooks';
import { validateNewBook } from '../utils/bookValidation';

class BookService {
  private books: Book[] = [];
  private updateLogs: BookUpdateLog[] = [];

  constructor() {
    this.initializeBooks();
  }

  // 初期データの読み込み（クリーンアップ版）
  private initializeBooks() {
    // 既存データをクリアして初期データのみ使用（表紙画像は自動適用済み）
    this.books = [...rawBooks] as Book[];
    this.saveBooks();
    console.log(`📚 ${this.books.length}冊の書籍データを読み込み完了（表紙画像付き）`);
  }

  // ローカルストレージに保存
  private saveBooks() {
    localStorage.setItem('bookRecommendationBooks', JSON.stringify(this.books));
  }

  // 更新ログの保存
  private saveUpdateLogs() {
    localStorage.setItem('bookUpdateLogs', JSON.stringify(this.updateLogs));
  }

  // 全図書取得（初期データのみ、不適切図書完全除外）
  getAllBooks(): Book[] {
    // 重複を除去するためにIDでユニークにする
    const uniqueBooks = new Map<string, Book>();
    this.books.forEach(book => {
      if (this.isAppropriateForChildren(book)) {
        uniqueBooks.set(book.id, book);
      }
    });
    
    return Array.from(uniqueBooks.values())
      .sort((a, b) => {
        // 初期データ（manual）を優先表示
        if (a.source === 'manual' && b.source !== 'manual') return -1;
        if (a.source !== 'manual' && b.source === 'manual') return 1;
        return b.rating - a.rating;
      });
  }

  // フィルタリング機能（適切な図書のみ）
  filterBooks(filter: BookFilter): Book[] {
    return this.getFilteredBooks(filter);
  }

  // 既存のgetFilteredBooksメソッド（内部使用）
  private getFilteredBooks(filter: BookFilter): Book[] {
    // まず重複を除去
    const uniqueBooks = this.getAllBooks();
    
    return uniqueBooks.filter(book => {
      // 年齢範囲フィルタ（新旧両方に対応）
      if (filter.ageRange) {
        const overlap = !(book.ageRange.max < filter.ageRange.min || book.ageRange.min > filter.ageRange.max);
        if (!overlap) return false;
      }
      
      // minAge/maxAgeでのフィルタリング
      if (filter.minAge !== undefined && book.ageRange.max < filter.minAge) return false;
      if (filter.maxAge !== undefined && book.ageRange.min > filter.maxAge) return false;

      // 興味分野フィルタ（新3軸システム対応）
      if (filter.interests && filter.interests.length > 0) {
        const allTags = [
          ...(book.categories || []),
          ...(book.interests || []),
          ...(book.interest_tags || []),
          ...(book.theme_tags || [])
        ];
        const hasMatchingInterest = filter.interests.some(interest => 
          allTags.includes(interest)
        );
        if (!hasMatchingInterest) return false;
      }
      
      // interest_tagsフィルタ
      if (filter.interestTags && filter.interestTags.length > 0) {
        const hasMatchingTag = filter.interestTags.some(tag => 
          book.interest_tags?.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }
      
      // theme_tagsフィルタ
      if (filter.themeTags && filter.themeTags.length > 0) {
        const hasMatchingTag = filter.themeTags.some(tag => 
          book.theme_tags?.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }

      // 24段階読書レベルフィルタ（優先）
      if (filter.readingLevel24 && filter.readingLevel24.length > 0) {
        if (!book.reading_level_24) return false;
        // 範囲チェック（[min, max]形式）の場合
        if (filter.readingLevel24.length === 2 && typeof filter.readingLevel24[0] === 'number' && typeof filter.readingLevel24[1] === 'number') {
          const [min, max] = filter.readingLevel24;
          if (book.reading_level_24 < min || book.reading_level_24 > max) {
            return false;
          }
        } else {
          // 配列チェック（[1, 2, 3]など個別のレベル指定）
          if (!filter.readingLevel24.includes(book.reading_level_24)) {
            return false;
          }
        }
      }
      
      // 旧読書レベルフィルタ（後方互換性のため）
      if (filter.readingLevel && filter.readingLevel.length > 0) {
        const readingLevels = filter.readingLevel.map(level => level.toString());
        // まずreading_level_24をチェック（優先）
        if (book.reading_level_24) {
          const bookLevel = book.reading_level_24.toString();
          if (!readingLevels.includes(bookLevel)) return false;
        } else {
          // フォールバック: 旧フィールドをチェック
          const bookLevel = book.reading_level?.toString() || book.readingLevel?.toString();
          if (!bookLevel || !readingLevels.includes(bookLevel)) return false;
        }
      }

      // カテゴリフィルタ
      if (filter.categories && filter.categories.length > 0) {
        const hasMatchingCategory = filter.categories.some(category => 
          book.categories.includes(category)
        );
        if (!hasMatchingCategory) return false;
      }

      // 検索語フィルタ
      const searchKeyword = filter.searchKeyword || filter.searchTerm;
      if (searchKeyword) {
        const searchLower = searchKeyword.toLowerCase();
        const matchesSearch = 
          book.title.toLowerCase().includes(searchLower) ||
          book.author.toLowerCase().includes(searchLower) ||
          book.description.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }

  // ID指定で図書取得
  getBookById(id: string): Book | undefined {
    return this.books.find(book => book.id === id);
  }

  // Google Books APIから図書データ取得
  async fetchFromGoogleBooks(query: string, maxResults: number = 20): Promise<Book[]> {
    try {
      const apiKey = process.env.REACT_APP_GOOGLE_BOOKS_API_KEY;
      const baseUrl = process.env.REACT_APP_GOOGLE_BOOKS_BASE_URL;
      
      if (!apiKey || !baseUrl) {
        throw new Error('Google Books API設定が不完全です');
      }

      const response = await axios.get(`${baseUrl}/volumes`, {
        params: {
          q: query,
          maxResults,
          key: apiKey,
          langRestrict: 'ja'
        }
      });

      const items = response.data.items || [];
      const mappedBooks = items.map((item: any) => this.mapGoogleBookToBook(item));
      
      // 子ども向け適切性チェックでフィルタリング
      return mappedBooks.filter((book: Book) => this.isAppropriateForChildren(book));
    } catch (error) {
      console.error('Google Books API エラー:', error);
      throw error;
    }
  }

  // 子ども向け適切性チェック（厳格版）
  private isAppropriateForChildren(book: Book): boolean {
    // 初期データは全て適切
    if (book.source === 'manual') return true;
    
    // Google Books API由来のデータは現在完全除外（品質問題のため）
    if (book.source === 'google_books') return false;
    
    // 雑誌・定期刊行物を除外
    const magazineKeywords = [
      '雑誌', 'magazine', '月刊', '週刊', '日刊', '年刊',
      'Casa BRUTUS', 'カーサ', 'ブルータス',
      '毎日新聞', '朝日新聞', '読売新聞', '日経',
      'Annual', '年次', '年報', '報告書'
    ];
    
    const titleAndPublisher = (book.title + ' ' + book.publisher).toLowerCase();
    if (magazineKeywords.some(keyword => titleAndPublisher.includes(keyword.toLowerCase()))) {
      return false;
    }
    
    // 学術書・研究書・教育書（教員向け）を除外
    const academicKeywords = [
      '研究', '論文', '学会', '学習指導', '教育法',
      '教師', '教員', '指導書', '指導法', '授業',
      '心理学', '社会学', '哲学', '経済学', '政治学',
      '社会階層', '調査研究', '資料集', '統計',
      '内向の世代', '自我体験', '独我論', '現代日本',
      '発達心理', '教育心理', '学習心理', 'カウンセリング',
      '音楽療法', '療法', 'リハビリ', 'まちづくり',
      '都市計画', '地域研究', '市史', '町史', '村史'
    ];
    
    const fullText = (book.title + ' ' + book.description + ' ' + book.author + ' ' + book.publisher).toLowerCase();
    if (academicKeywords.some(keyword => fullText.includes(keyword.toLowerCase()))) {
      return false;
    }
    
    // 大学出版系・学術出版社を除外
    const academicPublishers = [
      '大学出版', '大学院', '研究所', '学会',
      '東京大学', '京都大学', '早稲田大学', '慶應義塾',
      '中央公論', '有斉閣', '勁草書房', '日本経済新聞',
      '東洋経済新報', 'マガジンハウス', '河出書房',
      '北大路書房', '新潮社', '文藝春秋', '中央公論社'
    ];
    
    if (academicPublishers.some(pub => book.publisher.includes(pub))) {
      return false;
    }
    
    // 不明な出版社を除外
    if (book.publisher === '不明' || book.publisher === '' || book.author === '不明') {
      return false;
    }
    
    return true;
  }
  
  // Google Books APIレスポンスをBookオブジェクトに変換
  private mapGoogleBookToBook(item: any): Book {
    const volumeInfo = item.volumeInfo;
    
    return {
      id: item.id,
      title: volumeInfo.title || '不明',
      author: volumeInfo.authors ? volumeInfo.authors.join(', ') : '不明',
      description: volumeInfo.description || '',
      coverImage: volumeInfo.imageLinks?.thumbnail || '',
      publisher: volumeInfo.publisher || '不明',
      publishedDate: volumeInfo.publishedDate || '',
      categories: Array.from(new Set(volumeInfo.categories || [])), // 重複除去
      ageRange: this.estimateAgeRange(volumeInfo),
      readingLevel: this.estimateReadingLevel(volumeInfo),
      vocabularyLevel: this.estimateVocabularyLevel(volumeInfo),
      interests: this.extractInterests(volumeInfo),
      rating: volumeInfo.averageRating || 3.0,
      pageCount: volumeInfo.pageCount,
      isbn: volumeInfo.industryIdentifiers?.[0]?.identifier,
      libraryUrl: '',
      lastUpdated: new Date().toISOString().split('T')[0],
      source: 'google_books'
    };
  }

  // 年齢範囲の推定
  private estimateAgeRange(volumeInfo: any): { min: number, max: number } {
    const categories = volumeInfo.categories || [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const title = volumeInfo.title || '';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const description = volumeInfo.description || '';
    
    // カテゴリや内容から年齢を推定
    if (categories.some((cat: string) => cat.includes('Picture Books') || cat.includes('絵本'))) {
      return { min: 3, max: 8 };
    }
    if (categories.some((cat: string) => cat.includes('Juvenile') || cat.includes('児童'))) {
      return { min: 6, max: 12 };
    }
    if (categories.some((cat: string) => cat.includes('Young Adult') || cat.includes('青少年'))) {
      return { min: 12, max: 18 };
    }
    
    // デフォルト
    return { min: 8, max: 14 };
  }

  // 読書レベルの推定
  private estimateReadingLevel(volumeInfo: any): string {
    const pageCount = volumeInfo.pageCount || 0;
    const categories = volumeInfo.categories || [];
    
    // カテゴリを考慮した推定
    if (categories.some((cat: string) => cat.includes('Picture Books') || cat.includes('絵本'))) {
      return '小学校低学年';
    }
    
    // ページ数による推定
    if (pageCount < 100) return '小学校低学年';
    if (pageCount < 200) return '小学校中学年';
    if (pageCount < 350) return '小学校高学年';
    if (pageCount < 500) return '中学生';
    return '高校生';
  }

  // 語彙レベルの推定
  private estimateVocabularyLevel(volumeInfo: any): number {
    const pageCount = volumeInfo.pageCount || 0;
    const categories = volumeInfo.categories || [];
    
    if (categories.some((cat: string) => cat.includes('Picture Books'))) return 2;
    if (pageCount < 50) return 3;
    if (pageCount < 100) return 4;
    if (pageCount < 200) return 5;
    if (pageCount < 300) return 6;
    return 7;
  }

  // 興味分野の抽出
  private extractInterests(volumeInfo: any): string[] {
    const categories = volumeInfo.categories || [];
    const interests: string[] = [];
    
    // カテゴリから興味分野をマッピング
    const interestMapping: { [key: string]: string[] } = {
      'Sports': ['スポーツ'],
      'Music': ['音楽'],
      'Science': ['科学'],
      'Adventure': ['冒険'],
      'Fantasy': ['ファンタジー'],
      'Mystery': ['推理'],
      'Animals': ['動物'],
      'Cooking': ['料理']
    };

    categories.forEach((category: string) => {
      Object.entries(interestMapping).forEach(([key, values]) => {
        if (category.includes(key)) {
          interests.push(...values);
        }
      });
    });

    return Array.from(new Set(interests)); // 重複除去
  }

  // 図書データベース更新
  async updateBookDatabase(): Promise<BookUpdateLog> {
    const updateLog: BookUpdateLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      booksUpdated: 0,
      booksAdded: 0,
      booksRemoved: 0,
      source: 'web_search',
      status: 'success'
    };

    try {
      // 年齢別・カテゴリ別に検索クエリを実行
      const searchQueries = [
        '児童文学 6歳 7歳 8歳',
        '児童文学 9歳 10歳 11歳',
        '児童文学 12歳 13歳 14歳 15歳',
        '科学読み物 子ども',
        'スポーツ 小説 児童',
        '音楽 本 子ども',
        '冒険小説 児童文学',
        '推理小説 子ども向け'
      ];

      const oldBooksCount = this.books.length;
      const newBooks: Book[] = [];

      for (const query of searchQueries) {
        try {
          const books = await this.fetchFromGoogleBooks(query, 10);
          newBooks.push(...books);
          
          // API制限対策：500ms待機
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.warn(`クエリ "${query}" の検索に失敗:`, error);
        }
      }

      // 重複除去（既存の本とIDで比較）
      const existingIds = new Set(this.books.map(book => book.id));
      const uniqueNewBooks = newBooks.filter(book => !existingIds.has(book.id));

      // 新しい本を追加
      this.books.push(...uniqueNewBooks);
      updateLog.booksAdded = uniqueNewBooks.length;
      updateLog.booksUpdated = this.books.length - oldBooksCount;

      // 保存
      this.saveBooks();
      
    } catch (error) {
      updateLog.status = 'error';
      updateLog.errorMessage = error instanceof Error ? error.message : '不明なエラー';
    }

    // ログを保存
    this.updateLogs.unshift(updateLog);
    this.saveUpdateLogs();

    return updateLog;
  }

  // 更新ログ取得
  getUpdateLogs(): BookUpdateLog[] {
    const savedLogs = localStorage.getItem('bookUpdateLogs');
    if (savedLogs) {
      this.updateLogs = JSON.parse(savedLogs);
    }
    return [...this.updateLogs];
  }

  // 手動で図書追加（旧メソッド - 削除済み）
  // 新しいaddBookメソッドを使用してください

  // 図書削除
  removeBook(id: string): boolean {
    const index = this.books.findIndex(book => book.id === id);
    if (index !== -1) {
      this.books.splice(index, 1);
      this.saveBooks();
      return true;
    }
    return false;
  }

  // 書籍の一括追加・更新
  async addOrUpdateBooks(books: Book[]): Promise<{ added: number; updated: number; invalid: number; }> {
    let addedCount = 0;
    let updatedCount = 0;
    let invalidCount = 0;
    for (const book of books) {
      const validation = await validateNewBook(book);
      if (!validation.isValid) {
        invalidCount++;
        continue;
      }
      const existingIndex = this.books.findIndex(existing => existing.id === book.id);
      if (existingIndex >= 0) {
        // 既存の書籍を更新
        this.books[existingIndex] = {
          ...book,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
        updatedCount++;
      } else {
        // 新しい書籍を追加
        this.books.push({
          ...book,
          lastUpdated: new Date().toISOString().split('T')[0]
        });
        addedCount++;
      }
    }
    this.saveBooks();
    return { added: addedCount, updated: updatedCount, invalid: invalidCount };
  }

  // 新規書籍追加
  async addBook(bookData: Partial<Book>): Promise<{ success: boolean; book?: Book; error?: string }> {
    try {
      // 必須フィールドのチェック
      const validationResult = await validateNewBook(bookData);
      if (!validationResult.isValid) {
        return { success: false, error: validationResult.errors.join(', ') };
      }
      
      // IDの生成
      const newBook: Book = {
        ...bookData as Book,
        id: bookData.id || this.generateBookId(),
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      
      // 重複チェック
      const existing = this.books.find(b => 
        b.title === newBook.title && b.author === newBook.author
      );
      if (existing) {
        return { success: false, error: '同じタイトルと著者の本が既に存在します' };
      }
      
      // 追加
      this.books.push(newBook);
      this.saveBooks();
      
      return { success: true, book: newBook };
    } catch (error) {
      console.error('書籍追加エラー:', error);
      return { success: false, error: error instanceof Error ? error.message : '不明なエラー' };
    }
  }
  
  // 書籍情報更新
  async updateBook(id: string, updates: Partial<Book>): Promise<{ success: boolean; book?: Book; error?: string }> {
    try {
      const index = this.books.findIndex(book => book.id === id);
      if (index === -1) {
        return { success: false, error: '書籍が見つかりません' };
      }
      
      // 更新
      this.books[index] = {
        ...this.books[index],
        ...updates,
        id: this.books[index].id, // IDは変更させない
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      
      this.saveBooks();
      return { success: true, book: this.books[index] };
    } catch (error) {
      console.error('書籍更新エラー:', error);
      return { success: false, error: error instanceof Error ? error.message : '不明なエラー' };
    }
  }
  
  // 書籍削除
  deleteBook(id: string): boolean {
    const initialLength = this.books.length;
    this.books = this.books.filter(book => book.id !== id);
    
    if (this.books.length < initialLength) {
      this.saveBooks();
      return true;
    }
    return false;
  }
  
  // 統計情報取得（getStatsメソッド）
  getStats() {
    const books = this.getAllBooks();
    const totalBooks = books.length;
    
    // カテゴリー分布
    const categoryDistribution: Record<string, number> = {};
    books.forEach(book => {
      book.categories.forEach(category => {
        categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
      });
    });
    
    // 年齢分布
    const ageDistribution = {
      '6-8歳': 0,
      '9-11歳': 0,
      '12-15歳': 0
    };
    books.forEach(book => {
      if (book.ageRange.min <= 8) ageDistribution['6-8歳']++;
      if (book.ageRange.min <= 11 && book.ageRange.max >= 9) ageDistribution['9-11歳']++;
      if (book.ageRange.max >= 12) ageDistribution['12-15歳']++;
    });
    
    // 評価分布
    const ratingDistribution: Record<number, number> = {};
    books.forEach(book => {
      const rating = Math.floor(book.rating);
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    });
    
    // 読書レベル分布
    const readingLevelDistribution: Record<number, number> = {};
    books.forEach(book => {
      if (book.reading_level) {
        readingLevelDistribution[book.reading_level] = 
          (readingLevelDistribution[book.reading_level] || 0) + 1;
      }
    });
    
    // 平均評価
    const averageRating = books.length > 0 
      ? books.reduce((sum, book) => sum + book.rating, 0) / books.length 
      : 0;
    
    // 平均ページ数
    const booksWithPages = books.filter(book => book.pageCount);
    const averagePages = booksWithPages.length > 0
      ? booksWithPages.reduce((sum, book) => sum + (book.pageCount || 0), 0) / booksWithPages.length
      : 0;
    
    return {
      totalBooks,
      categoryDistribution,
      ageDistribution,
      ratingDistribution,
      readingLevelDistribution,
      averageRating,
      averagePages
    };
  }
  
  // 統計情報取得（旧メソッド名）
  getStatistics() {
    // 登録図書数は、フィルタリング前の全書籍数（this.books.length）を使用
    // これは実際に登録されている全書籍数を表す
    // 表示可能な書籍数が必要な場合は、getAllBooks().lengthを使用すること
    return {
      totalBooks: this.books.length, // 登録されている全書籍数
      byAgeRange: this.getBooksByAgeRange(),
      byReadingLevel: this.getBooksByReadingLevel(),
      byInterests: this.getBooksByInterests(),
      lastUpdate: this.getLastUpdateDate()
    };
  }

  private getBooksByAgeRange() {
    // getAllBooks()を使用して、実際に表示可能な書籍から年齢範囲分布を取得
    const allBooks = this.getAllBooks();
    const ranges = {
      '6-8歳': 0,
      '9-11歳': 0,
      '12-15歳': 0
    };

    allBooks.forEach(book => {
      if (book.ageRange.min <= 8) ranges['6-8歳']++;
      if (book.ageRange.min <= 11 && book.ageRange.max >= 9) ranges['9-11歳']++;
      if (book.ageRange.max >= 12) ranges['12-15歳']++;
    });

    return ranges;
  }

  private getBooksByReadingLevel() {
    // getAllBooks()を使用して、実際に表示可能な書籍から読書レベル分布を取得
    const allBooks = this.getAllBooks();
    return allBooks.reduce((acc, book) => {
      if (book.readingLevel) {
        acc[book.readingLevel] = (acc[book.readingLevel] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
  }

  private getBooksByInterests() {
    // getAllBooks()を使用して、実際に表示可能な書籍から興味分野分布を取得
    const allBooks = this.getAllBooks();
    const interestCounts: Record<string, number> = {};
    
    allBooks.forEach(book => {
      // 新3軸システム対応
      const allTags = [
        ...(book.interests || []),
        ...(book.interest_tags || []),
        ...(book.theme_tags || [])
      ];
      allTags.forEach(tag => {
        interestCounts[tag] = (interestCounts[tag] || 0) + 1;
      });
    });

    return interestCounts;
  }

  private getLastUpdateDate(): string {
    // 登録されている全書籍から最新の更新日を取得
    // フィルタリング前の全書籍から取得することで、実際のデータ更新日を反映
    if (this.books.length === 0) return '';
    
    return this.books
      .map(book => book.lastUpdated || '')
      .filter(date => date !== '')
      .sort()
      .reverse()[0] || '';
  }
  
  // 書籍ID生成
  private generateBookId(): string {
    return `book-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const bookService = new BookService();