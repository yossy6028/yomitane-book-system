/**
 * 表紙画像検索専用のデバッグロガー
 * ログレベルと出力形式を統一
 */
export class DebugLogger {
  private static instance: DebugLogger;
  private isDebugMode: boolean = process.env.NODE_ENV === 'development';

  static getInstance(): DebugLogger {
    if (!this.instance) {
      this.instance = new DebugLogger();
    }
    return this.instance;
  }

  searchStart(title: string, isbn?: string): void {
    if (!this.isDebugMode) return;
    console.group(`🔍 表紙検索開始: "${title}"`);
    console.log(`📋 ISBN: ${isbn || 'なし'}`);
  }

  searchEnd(): void {
    if (!this.isDebugMode) return;
    console.groupEnd();
  }

  isbnSearchSuccess(imageUrl: string): void {
    if (!this.isDebugMode) return;
    console.log(`✅ ISBN検索成功: ${imageUrl}`);
  }

  exactMatch(originalTitle: string, foundTitle: string, imageUrl: string): void {
    if (!this.isDebugMode) return;
    console.log(`✅ 厳密マッチ: "${originalTitle}" ➜ "${foundTitle}" -> ${imageUrl}`);
  }

  titleOnlyMatch(originalTitle: string, foundTitle: string, authors: string[], imageUrl: string): void {
    if (!this.isDebugMode) return;
    console.warn(`⚠️ タイトルのみマッチ（要確認）: "${originalTitle}" ➜ "${foundTitle}" by "${authors.join(', ')}" -> ${imageUrl}`);
  }

  authorMismatch(originalAuthor: string, foundAuthor: string, similarity: number): void {
    if (!this.isDebugMode) return;
    console.log(`❌ 著者不一致: "${originalAuthor}" ≠ "${foundAuthor}" (類似度: ${Math.round(similarity * 100)}%)`);
  }

  noImageFound(title: string, author: string, publisher?: string): void {
    if (!this.isDebugMode) return;
    console.warn(`❌ 画像なし: "${title}" by "${author}" (${publisher || '出版社不明'})`);
  }

  cacheHit(title: string, imageUrl: string): void {
    if (!this.isDebugMode) return;
    console.log(`💾 キャッシュヒット: "${title}" -> ${imageUrl}`);
  }

  error(message: string, error?: Error): void {
    console.error(`❌ ${message}`, error);
  }
}