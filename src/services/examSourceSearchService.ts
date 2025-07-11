/**
 * 受験出典情報検索サービス
 * Web検索を使用して書籍の中学受験・高校受験での出題情報を調査
 */
import { ExamSource } from '../types/Book';

export interface ExamSearchResult {
  sources: ExamSource[];
  searchQuery: string;
  totalResults: number;
}

class ExamSourceSearchService {
  private readonly searchDelay = 1000; // 1秒間隔でリクエスト制限

  /**
   * 書籍の受験出典情報を検索
   */
  async searchExamSources(title: string, author: string): Promise<ExamSearchResult> {
    const result: ExamSearchResult = {
      sources: [],
      searchQuery: '',
      totalResults: 0
    };

    try {
      // 中学受験での出題を検索
      const juniorHighSources = await this.searchJuniorHighExams(title, author);
      result.sources.push(...juniorHighSources);

      // 少し待機してから高校受験を検索
      await this.delay(this.searchDelay);

      // 高校受験での出題を検索
      const seniorHighSources = await this.searchSeniorHighExams(title, author);
      result.sources.push(...seniorHighSources);

      result.totalResults = result.sources.length;
      result.searchQuery = `「${title}」${author} 受験 出典`;

      console.log(`📚 ${title} の受験出典検索完了: ${result.sources.length}件発見`);
      
      return result;
    } catch (error) {
      console.error(`受験出典検索エラー (${title}):`, error);
      return result;
    }
  }

  /**
   * 中学受験での出題を検索
   */
  private async searchJuniorHighExams(title: string, author: string): Promise<ExamSource[]> {
    const queries = [
      `「${title}」${author} 中学受験 出典`,
      `「${title}」${author} 中学受験 国語`,
      `「${title}」${author} 入試問題 中学`,
      `${title} ${author} 中学受験 過去問`
    ];

    const sources: ExamSource[] = [];

    for (const query of queries) {
      try {
        const searchResults = await this.performWebSearch(query);
        const extractedSources = this.extractExamSourcesFromResults(searchResults, '国語');
        sources.push(...extractedSources);
        
        // API制限対策
        await this.delay(500);
      } catch (error) {
        console.warn(`中学受験検索エラー: ${query}`, error);
      }
    }

    // 重複除去
    return this.deduplicateSources(sources);
  }

  /**
   * 高校受験での出題を検索
   */
  private async searchSeniorHighExams(title: string, author: string): Promise<ExamSource[]> {
    const queries = [
      `「${title}」${author} 高校受験 出典`,
      `「${title}」${author} 高校受験 国語`,
      `「${title}」${author} 入試問題 高校`,
      `${title} ${author} 高校受験 過去問`
    ];

    const sources: ExamSource[] = [];

    for (const query of queries) {
      try {
        const searchResults = await this.performWebSearch(query);
        const extractedSources = this.extractExamSourcesFromResults(searchResults, '高校受験');
        sources.push(...extractedSources);
        
        // API制限対策
        await this.delay(500);
      } catch (error) {
        console.warn(`高校受験検索エラー: ${query}`, error);
      }
    }

    // 重複除去
    return this.deduplicateSources(sources);
  }

  /**
   * Web検索を実行
   */
  private async performWebSearch(query: string): Promise<string[]> {
    console.log(`🔍 検索中: ${query}`);
    
    try {
      // WebSearchツールを使用（MCPツール）
      const searchResults = await this.callWebSearchTool(query);
      return searchResults;
    } catch (error) {
      console.error('Web検索エラー:', error);
      return [];
    }
  }

  /**
   * WebSearchツールを呼び出し（プレースホルダー）
   */
  private async callWebSearchTool(query: string): Promise<string[]> {
    // この関数は実際にはWebSearchツールを呼び出すために
    // 外部から注入される必要がある
    // 現在はモックデータを返す
    
    // 模擬的な検索結果
    const mockResults = [
      `${query} に関する検索結果...`,
      `2023年度開成中学校入試問題で出題`,
      `2022年麻布中学校国語出典`,
      `筑波大学附属駒場中学校 2021年度入試`
    ];
    
    return mockResults;
  }

  /**
   * 検索結果から受験出典情報を抽出
   */
  private extractExamSourcesFromResults(results: string[], examType: '国語' | '高校受験'): ExamSource[] {
    const sources: ExamSource[] = [];

    for (const result of results) {
      // 年度と学校名を抽出するパターン
      const patterns = [
        /(\d{4})年度?\s*([^「」\s]+(?:中学|高校|学園|学院|学校))/g,
        /([^「」\s]+(?:中学|高校|学園|学院|学校))\s*(\d{4})年度?/g,
        /令和(\d{1,2})年度?\s*([^「」\s]+(?:中学|高校|学園|学院|学校))/g,
        /平成(\d{1,2})年度?\s*([^「」\s]+(?:中学|高校|学園|学院|学校))/g
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(result)) !== null) {
          const year = this.normalizeYear(match[1] || match[2]);
          const school = this.normalizeSchoolName(match[2] || match[1]);

          if (year && school && year >= 2000 && year <= new Date().getFullYear()) {
            sources.push({
              year,
              school,
              examType,
              verified: false // 自動抽出なので未検証
            });
          }
        }
      }
    }

    return sources;
  }

  /**
   * 年度を正規化
   */
  private normalizeYear(yearStr: string): number {
    const year = parseInt(yearStr);
    
    // 令和年号を西暦に変換
    if (yearStr.includes('令和')) {
      const reiwaYear = parseInt(yearStr.replace(/[^0-9]/g, ''));
      return 2018 + reiwaYear;
    }
    
    // 平成年号を西暦に変換
    if (yearStr.includes('平成')) {
      const heiseiYear = parseInt(yearStr.replace(/[^0-9]/g, ''));
      return 1988 + heiseiYear;
    }
    
    return year;
  }

  /**
   * 学校名を正規化
   */
  private normalizeSchoolName(school: string): string {
    return school
      .replace(/\s+/g, '')
      .replace(/[「」『』【】]/g, '')
      .trim();
  }

  /**
   * 重複する出典情報を除去
   */
  private deduplicateSources(sources: ExamSource[]): ExamSource[] {
    const uniqueSources = new Map<string, ExamSource>();

    for (const source of sources) {
      const key = `${source.year}-${source.school}-${source.examType}`;
      if (!uniqueSources.has(key)) {
        uniqueSources.set(key, source);
      }
    }

    return Array.from(uniqueSources.values());
  }

  /**
   * 指定時間待機
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 書籍のバッチ検索
   */
  async searchMultipleBooks(books: Array<{title: string, author: string, id: string}>): Promise<Map<string, ExamSource[]>> {
    const results = new Map<string, ExamSource[]>();
    
    console.log(`📚 ${books.length}冊の受験出典情報を検索開始...`);
    
    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      console.log(`進行状況: ${i + 1}/${books.length} - 「${book.title}」`);
      
      try {
        const searchResult = await this.searchExamSources(book.title, book.author);
        if (searchResult.sources.length > 0) {
          results.set(book.id, searchResult.sources);
          console.log(`✅ 「${book.title}」: ${searchResult.sources.length}件の出典情報を発見`);
        } else {
          console.log(`ℹ️ 「${book.title}」: 出典情報なし`);
        }
      } catch (error) {
        console.error(`❌ 「${book.title}」の検索でエラー:`, error);
      }
      
      // レート制限対策
      if (i < books.length - 1) {
        await this.delay(this.searchDelay);
      }
    }
    
    console.log(`🎯 検索完了: ${results.size}冊で出典情報を発見`);
    return results;
  }
}

export const examSourceSearchService = new ExamSourceSearchService();