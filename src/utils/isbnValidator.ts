/**
 * ISBN検証ユーティリティ
 * 書籍データの正確性を確保するためのツール
 */
export class ISBNValidator {
  private static readonly GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

  /**
   * ISBN形式の基本チェック
   */
  static isValidISBN(isbn: string): boolean {
    // ISBNの基本的なフォーマットチェック
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    return /^97[89]\d{10}$/.test(cleanISBN);
  }

  /**
   * ISBNとタイトル・著者の整合性をチェック
   */
  static async validateISBNMatch(isbn: string, expectedTitle: string, expectedAuthor: string): Promise<{
    isValid: boolean;
    actualTitle?: string;
    actualAuthor?: string;
    message: string;
  }> {
    if (!this.isValidISBN(isbn)) {
      return {
        isValid: false,
        message: 'ISBNの形式が正しくありません'
      };
    }

    try {
      const response = await fetch(`${this.GOOGLE_BOOKS_API}?q=isbn:${isbn}`);
      
      if (!response.ok) {
        return {
          isValid: false,
          message: 'API呼び出しに失敗しました'
        };
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return {
          isValid: false,
          message: 'ISBNに対応する書籍が見つかりません'
        };
      }

      const volumeInfo = data.items[0].volumeInfo;
      const actualTitle = volumeInfo.title || '';
      const actualAuthor = volumeInfo.authors?.join(', ') || '';

      // タイトルの類似度チェック
      const titleSimilarity = this.calculateSimilarity(
        this.normalize(expectedTitle), 
        this.normalize(actualTitle)
      );

      // 著者の類似度チェック
      const authorSimilarity = this.calculateSimilarity(
        this.normalize(expectedAuthor), 
        this.normalize(actualAuthor)
      );

      const isValid = titleSimilarity > 0.7 && authorSimilarity > 0.7;

      return {
        isValid,
        actualTitle,
        actualAuthor,
        message: isValid 
          ? '正しいISBNです' 
          : `不一致: タイトル類似度${Math.round(titleSimilarity * 100)}%, 著者類似度${Math.round(authorSimilarity * 100)}%`
      };

    } catch (error) {
      return {
        isValid: false,
        message: `検証エラー: ${error}`
      };
    }
  }

  /**
   * 文字列の正規化
   */
  private static normalize(str: string): string {
    return str.toLowerCase()
      .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
  }

  /**
   * 類似度計算
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * レーベンシュタイン距離
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}