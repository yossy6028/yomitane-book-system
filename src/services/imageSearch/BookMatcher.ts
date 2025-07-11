/**
 * 書籍マッチング専用クラス
 * タイトルと著者の類似度判定を高精度で実行
 */
export class BookMatcher {
  private static instance: BookMatcher;

  static getInstance(): BookMatcher {
    if (!this.instance) {
      this.instance = new BookMatcher();
    }
    return this.instance;
  }

  /**
   * タイトルの類似度チェック（大幅改善版）
   */
  isSimilarTitle(originalTitle: string, foundTitle: string, strictMode: boolean = false): boolean {
    if (!foundTitle) return false;
    
    const normalize = (str: string) => str.toLowerCase()
      .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
    
    const original = normalize(originalTitle);
    const found = normalize(foundTitle);
    
    // 完全一致
    if (original === found) return true;
    
    // シリーズ物の処理（「ドラゴンたいじ」と「ドラゴンたいじ2」等）
    if (this.isSeriesMatch(original, found)) return true;
    
    // 微細な違いを許容（「暮らし」vs「暮らし方」等）
    if (this.isMinorVariation(original, found)) return true;
    
    // 部分一致（短い方が長い方に含まれる）
    if (this.isPartialMatch(original, found)) return true;
    
    // 段階的な類似度判定（大幅に緩和）
    const similarity = this.calculateSimilarity(original, found);
    
    if (strictMode) {
      // 厳格モード: 70%以上（適切なバランスに調整）
      return similarity >= 0.70;
    } else {
      // 通常モード: 60%以上（新装版等の変種に対応）
      return similarity >= 0.60;
    }
  }

  /**
   * シリーズ物の判定（「ドラゴンたいじ」と「ドラゴンたいじ2」等）
   */
  private isSeriesMatch(original: string, found: string): boolean {
    // 基本タイトルが一致し、数字や短い文字列が追加されているケース
    const baseOriginal = original.replace(/[0-9１-９]+$/, '').trim();
    const baseFound = found.replace(/[0-9１-９]+$/, '').trim();
    
    if (baseOriginal.length > 3 && baseFound.length > 3) {
      const similarity = this.calculateSimilarity(baseOriginal, baseFound);
      if (similarity > 0.9) return true;
    }
    
    return false;
  }

  /**
   * 部分一致の判定
   */
  private isPartialMatch(original: string, found: string): boolean {
    if (original.length < 3 || found.length < 3) return false;
    
    const shorter = original.length < found.length ? original : found;
    const longer = original.length < found.length ? found : original;
    
    // 短い方が長い方に70%以上含まれている
    if (shorter.length >= 4 && longer.includes(shorter)) {
      return true;
    }
    
    return false;
  }

  /**
   * 微細な表記違いの判定
   */
  private isMinorVariation(original: string, found: string): boolean {
    // 短い方が長い方に完全に含まれる場合（「暮らし」→「暮らし方」）
    if (original.length > 3 && found.length > 3) {
      const shorter = original.length < found.length ? original : found;
      const longer = original.length < found.length ? found : original;
      
      if (longer.includes(shorter) && (longer.length - shorter.length) <= 2) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 著者の類似度チェック（多段階マッチング版）
   */
  isSimilarAuthor(originalAuthor: string, foundAuthors: string[] | undefined, strictMode: boolean = false): boolean {
    if (!foundAuthors || foundAuthors.length === 0) return false;
    
    const normalize = (str: string) => str.toLowerCase()
      .replace(/[・\s]/g, '') // 中点とスペースを削除
      .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
    
    const originalNorm = normalize(originalAuthor);
    
    for (const author of foundAuthors) {
      // 翻訳者・編集者の除外
      if (this.isTranslatorOrEditor(author)) {
        continue;
      }
      
      const foundNorm = normalize(author);
      
      // 段階1: 完全一致
      if (originalNorm === foundNorm) {
        console.log(`✅ 著者完全一致: "${originalAuthor}" = "${author}"`);
        return true;
      }
      
      // 段階2: ひらがな・カタカナ読み方対応
      if (this.isSameReading(originalAuthor, author)) {
        console.log(`📝 著者読み方一致: "${originalAuthor}" ≈ "${author}"`);
        return true;
      }
      
      // 段階3: 85%以上の類似度（適切なバランスに調整）
      const similarity = this.calculateSimilarity(originalNorm, foundNorm);
      if (strictMode && similarity >= 0.85) {
        console.log(`🔍 著者高類似度 (${Math.round(similarity * 100)}%): "${originalAuthor}" ≈ "${author}"`);
        return true;
      } else if (!strictMode && similarity >= 0.75) {
        console.log(`🔍 著者類似度 (${Math.round(similarity * 100)}%): "${originalAuthor}" ≈ "${author}"`);
        return true;
      }
      
      // 厳格モードでは姓一致と部分一致をスキップ
      if (!strictMode) {
        // 段階4: 姓のみ一致（2文字以上）
        if (this.isSameFamilyName(originalAuthor, author)) {
          console.log(`👨‍👩‍👧‍👦 著者姓一致: "${originalAuthor}" ≈ "${author}"`);
          return true;
        }
        
        // 段階5: 名前の部分一致（一つの名前が他方に含まれる）
        if (this.isAuthorPartialMatch(originalNorm, foundNorm)) {
          console.log(`🔸 著者部分一致: "${originalAuthor}" ≈ "${author}"`);
          return true;
        }
      }
      
      // 段階6: 削除（表紙不一致問題対応のため低類似度マッチングを無効化）
      // if (similarity > 0.60) {
      //   console.log(`⚡ 著者中類似度 (${Math.round(similarity * 100)}%): "${originalAuthor}" ≈ "${author}"`);
      //   return true;
      // }
    }
    
    return false;
  }

  /**
   * 著者の部分一致判定
   */
  private isAuthorPartialMatch(original: string, found: string): boolean {
    if (original.length < 2 || found.length < 2) return false;
    
    // 一方が他方に含まれる（最小2文字）
    if (original.includes(found) || found.includes(original)) {
      return true;
    }
    
    return false;
  }

  /**
   * 翻訳者・編集者の判定
   */
  private isTranslatorOrEditor(author: string): boolean {
    const patterns = ['訳', '翻訳', '編集', '監修', '編著', '著・訳', '翻案'];
    return patterns.some(pattern => author.includes(pattern));
  }

  /**
   * ひらがな・カタカナ読み方対応判定
   */
  private isSameReading(original: string, found: string): boolean {
    // よくある表記パターンのマッピング
    const readingMap: { [key: string]: string[] } = {
      'なかがわりえこ': ['中川李枝子', 'なかがわりえこ'],
      '中川李枝子': ['なかがわりえこ', '中川李枝子'],
      'エリックカール': ['Eric Carle', 'エリック・カール', 'エリックカール'],
      'Eric Carle': ['エリック・カール', 'エリックカール', 'Eric Carle'],
      'かこさとし': ['加古里子', 'かこ さとし'],
      '加古里子': ['かこさとし', 'かこ さとし'],
      'トロル': ['troll', 'TROLL'],
      'レオレオニ': ['レオ・レオニ', 'Leo Lionni'],
      'レオ・レオニ': ['レオレオニ', 'Leo Lionni'],
      'Leo Lionni': ['レオ・レオニ', 'レオレオニ']
    };
    
    const normalize = (str: string) => str.toLowerCase().replace(/[・\s]/g, '');
    const origNorm = normalize(original);
    const foundNorm = normalize(found);
    
    // 直接マッピングチェック
    if (readingMap[original]?.includes(found) || readingMap[found]?.includes(original)) {
      return true;
    }
    
    // 正規化後のマッピングチェック
    if (readingMap[origNorm]?.some(variant => normalize(variant) === foundNorm)) {
      return true;
    }
    
    return false;
  }

  /**
   * 姓の一致判定（調整版）
   */
  private isSameFamilyName(original: string, found: string): boolean {
    const originalLastName = original.split(/[・\s]/)[0];
    const foundLastName = found.split(/[・\s]/)[0];
    
    // 2文字以上の姓で一致（1文字から緩和調整）
    if (originalLastName.length >= 2 && foundLastName.length >= 2) {
      return originalLastName === foundLastName;
    }
    
    return false;
  }

  /**
   * レーベンシュタイン距離による類似度計算
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * レーベンシュタイン距離計算
   */
  private levenshteinDistance(str1: string, str2: string): number {
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