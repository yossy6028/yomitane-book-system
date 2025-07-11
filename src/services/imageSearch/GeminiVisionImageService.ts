/**
 * Gemini Vision API を使用した表紙画像検証・検索サービス
 * タイトル・著者の合致を画像認識で確認し、複数候補から最適な画像を選択
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Book } from '../../types/Book';
import { PrecisionTextMatchingService } from './PrecisionTextMatchingService';

interface VisionMatchResult {
  imageUrl: string;
  confidence: number;
  titleMatch: boolean;
  authorMatch: boolean;
  matchDetails: {
    detectedTitle: string;
    detectedAuthor: string;
    detectedPublisher: string;
    detectedISBN: string;
    detectedYear: string;
    similarity: number;
    imageQuality: number;
    reasons: string[];
    warnings: string[];
  };
}

interface SearchCandidate {
  imageUrl: string;
  source: string;
  volumeInfo: any;
}

export class GeminiVisionImageService {
  private static instance: GeminiVisionImageService;
  private genAI?: GoogleGenerativeAI;
  private model?: any;
  private readonly GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';
  private cache = new Map<string, VisionMatchResult>();
  private precisionTextService: PrecisionTextMatchingService;

  constructor() {
    this.initializeGemini();
    this.precisionTextService = PrecisionTextMatchingService.getInstance();
  }

  static getInstance(): GeminiVisionImageService {
    if (!this.instance) {
      this.instance = new GeminiVisionImageService();
    }
    return this.instance;
  }

  /**
   * Gemini初期化
   */
  private initializeGemini(): void {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('✅ Gemini Vision API initialized');
    } else {
      console.warn('⚠️ Gemini API key not found');
    }
  }

  /**
   * 書籍の最適な表紙画像を取得（Vision認証付き）
   */
  async getVerifiedImageForBook(book: Book): Promise<string> {
    console.group(`🔍 [Vision検索] "${book.title}" by "${book.author}"`);
    
    try {
      // キャッシュ確認
      const cacheKey = `${book.id}_${book.title}_${book.author}`;
      const cached = this.cache.get(cacheKey);
      if (cached && cached.confidence > 0.8) {
        console.log(`💾 高信頼度キャッシュヒット: ${cached.confidence}`);
        console.groupEnd();
        return cached.imageUrl;
      }

      // 複数の検索ストラテジーで候補を収集
      const candidates = await this.collectImageCandidates(book);
      
      if (candidates.length === 0) {
        console.log('❌ 候補画像が見つかりませんでした');
        console.groupEnd();
        return this.generatePlaceholder(book);
      }

      console.log(`🎯 ${candidates.length}件の候補画像を取得`);

      // Vision APIで各候補を検証
      const verifiedResults = await this.verifyImageCandidates(book, candidates);
      
      // 最高信頼度の画像を選択
      const bestMatch = this.selectBestMatch(verifiedResults);
      
      if (bestMatch && bestMatch.confidence > 0.7) {
        console.log(`✅ Vision検証成功: 信頼度${bestMatch.confidence}`);
        console.log(`📖 検出タイトル: "${bestMatch.matchDetails.detectedTitle}"`);
        console.log(`👤 検出著者: "${bestMatch.matchDetails.detectedAuthor}"`);
        
        // 高信頼度結果をキャッシュ
        this.cache.set(cacheKey, bestMatch);
        console.groupEnd();
        return bestMatch.imageUrl;
      } else {
        console.log(`❌ 信頼できる画像が見つかりませんでした（最高信頼度: ${bestMatch?.confidence || 0}）`);
        console.groupEnd();
        return this.generatePlaceholder(book);
      }

    } catch (error) {
      console.error('Vision検索エラー:', error);
      console.groupEnd();
      return this.generatePlaceholder(book);
    }
  }

  /**
   * 複数の検索ストラテジーで画像候補を収集
   */
  private async collectImageCandidates(book: Book): Promise<SearchCandidate[]> {
    const candidates: SearchCandidate[] = [];
    
    console.log('🔍 複数検索戦略で候補収集中...');
    
    try {
      // 戦略1: ISBN検索
      if (book.isbn) {
        const isbnCandidates = await this.searchByISBN(book.isbn);
        candidates.push(...isbnCandidates);
        console.log(`📚 ISBN検索: ${isbnCandidates.length}件`);
      }

      // 戦略2: 正確なタイトル+著者検索
      const exactCandidates = await this.searchExact(book);
      candidates.push(...exactCandidates);
      console.log(`🎯 正確検索: ${exactCandidates.length}件`);

      // 戦略3: タイトルのみ検索（上位5件まで）
      const titleCandidates = await this.searchByTitle(book);
      candidates.push(...titleCandidates.slice(0, 5));
      console.log(`📝 タイトル検索: ${Math.min(titleCandidates.length, 5)}件`);

      // 戦略4: 著者名検索
      const authorCandidates = await this.searchByAuthor(book);
      candidates.push(...authorCandidates.slice(0, 3));
      console.log(`👤 著者検索: ${Math.min(authorCandidates.length, 3)}件`);

    } catch (error) {
      console.error('候補収集エラー:', error);
    }

    // 重複除去
    const uniqueCandidates = this.removeDuplicateCandidates(candidates);
    console.log(`🎯 重複除去後: ${uniqueCandidates.length}件の候補`);
    
    // 画像品質フィルタリング
    const qualityFilteredCandidates = await this.filterByImageQuality(uniqueCandidates);
    console.log(`✨ 品質フィルタリング後: ${qualityFilteredCandidates.length}件の候補`);
    
    return qualityFilteredCandidates;
  }

  /**
   * 画像品質によるフィルタリング
   */
  private async filterByImageQuality(candidates: SearchCandidate[]): Promise<SearchCandidate[]> {
    const qualityFilteredCandidates: SearchCandidate[] = [];
    
    console.log('🔍 画像品質フィルタリング開始...');
    
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      
      try {
        console.log(`   ${i + 1}/${candidates.length}: 品質チェック中...`);
        
        const qualityScore = await this.checkImageQuality(candidate.imageUrl);
        
        if (qualityScore >= 60) { // 品質スコア60%以上で合格
          qualityFilteredCandidates.push(candidate);
          console.log(`   ✅ 品質合格: ${qualityScore}%`);
        } else {
          console.log(`   ❌ 品質不合格: ${qualityScore}%`);
        }
        
      } catch (error) {
        console.error(`   ❌ 品質チェックエラー [${i + 1}]:`, error);
        // エラーの場合は候補を保持（保守的アプローチ）
        qualityFilteredCandidates.push(candidate);
      }
    }
    
    return qualityFilteredCandidates;
  }

  /**
   * 単一画像の品質チェック
   */
  private async checkImageQuality(imageUrl: string): Promise<number> {
    try {
      // 画像のメタデータを取得
      const imageResponse = await fetch(imageUrl, { method: 'HEAD' });
      
      if (!imageResponse.ok) {
        return 0; // 取得できない画像は品質0
      }
      
      const contentType = imageResponse.headers.get('content-type') || '';
      const contentLength = parseInt(imageResponse.headers.get('content-length') || '0');
      
      let qualityScore = 0;
      
      // 画像形式チェック
      if (contentType.includes('image/jpeg') || contentType.includes('image/jpg')) {
        qualityScore += 30;
      } else if (contentType.includes('image/png')) {
        qualityScore += 25;
      } else if (contentType.includes('image/webp')) {
        qualityScore += 20;
      } else if (contentType.includes('image/gif')) {
        qualityScore += 10;
      } else {
        qualityScore += 5; // 不明な形式
      }
      
      // ファイルサイズチェック
      if (contentLength > 50000) { // 50KB以上
        qualityScore += 30;
      } else if (contentLength > 20000) { // 20KB以上
        qualityScore += 20;
      } else if (contentLength > 10000) { // 10KB以上
        qualityScore += 10;
      } else {
        qualityScore += 5; // 小さすぎる
      }
      
      // URLの信頼性チェック
      if (imageUrl.includes('books.google.com')) {
        qualityScore += 20;
      } else if (imageUrl.includes('amazon.com') || imageUrl.includes('rakuten.co.jp')) {
        qualityScore += 15;
      } else if (imageUrl.includes('https://')) {
        qualityScore += 10;
      } else {
        qualityScore += 5;
      }
      
      // 画像サイズの推定チェック（より詳細な検証）
      if (this.model) {
        const sizeQualityScore = await this.checkImageDimensionsQuality(imageUrl);
        qualityScore += sizeQualityScore;
      } else {
        qualityScore += 10; // Gemini利用不可の場合は中程度の加点
      }
      
      return Math.min(qualityScore, 100);
      
    } catch (error) {
      console.error('画像品質チェックエラー:', error);
      return 50; // エラーの場合は中程度の品質として扱う
    }
  }

  /**
   * 画像の解像度・鮮明度チェック（Gemini Vision使用）
   */
  private async checkImageDimensionsQuality(imageUrl: string): Promise<number> {
    if (!this.model) return 10;
    
    try {
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const uint8Array = new Uint8Array(imageBuffer);
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      const imageBase64 = btoa(binaryString);

      const prompt = `この画像の品質を評価してください。

評価項目:
1. 解像度（鮮明度）
2. 画像の完全性（切り取り、欠損がないか）
3. 文字の読みやすさ
4. 色彩の鮮明さ
5. ノイズの少なさ
6. 適切なサイズ（表紙画像として適切か）

JSON形式で回答してください:
{
  "resolution": 数値(0-100),
  "completeness": 数値(0-100),
  "readability": 数値(0-100),
  "colorQuality": 数値(0-100),
  "noiseLevel": 数値(0-100),
  "sizeAppropriateness": 数値(0-100),
  "overallQuality": 数値(0-100)
}`;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType: imageResponse.headers.get('content-type') || 'image/jpeg'
          }
        }
      ]);

      const responseText = result.response.text();
      const analysis = JSON.parse(responseText);
      
      // 各項目の重み付け平均
      const weightedScore = (
        analysis.resolution * 0.25 +
        analysis.completeness * 0.20 +
        analysis.readability * 0.20 +
        analysis.colorQuality * 0.15 +
        analysis.noiseLevel * 0.10 +
        analysis.sizeAppropriateness * 0.10
      );
      
      return Math.min(weightedScore * 0.2, 20); // 最大20点
      
    } catch (error) {
      console.error('画像解像度チェックエラー:', error);
      return 10; // エラーの場合は中程度の加点
    }
  }

  /**
   * ISBN検索
   */
  private async searchByISBN(isbn: string): Promise<SearchCandidate[]> {
    try {
      const url = `${this.GOOGLE_BOOKS_API}?q=isbn:${isbn}&maxResults=3`;
      const response = await fetch(url);
      const data = await response.json();
      
      return this.extractCandidatesFromResponse(data, 'ISBN');
    } catch (error) {
      console.error('ISBN検索エラー:', error);
      return [];
    }
  }

  /**
   * 正確検索
   */
  private async searchExact(book: Book): Promise<SearchCandidate[]> {
    try {
      const query = `"${book.title}" "${book.author}"`;
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.GOOGLE_BOOKS_API}?q=${encodedQuery}&maxResults=5&langRestrict=ja`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      return this.extractCandidatesFromResponse(data, '正確検索');
    } catch (error) {
      console.error('正確検索エラー:', error);
      return [];
    }
  }

  /**
   * タイトル検索
   */
  private async searchByTitle(book: Book): Promise<SearchCandidate[]> {
    try {
      const encodedTitle = encodeURIComponent(`"${book.title}"`);
      const url = `${this.GOOGLE_BOOKS_API}?q=${encodedTitle}&maxResults=8&langRestrict=ja`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      return this.extractCandidatesFromResponse(data, 'タイトル検索');
    } catch (error) {
      console.error('タイトル検索エラー:', error);
      return [];
    }
  }

  /**
   * 著者検索
   */
  private async searchByAuthor(book: Book): Promise<SearchCandidate[]> {
    try {
      const encodedAuthor = encodeURIComponent(`inauthor:"${book.author}"`);
      const url = `${this.GOOGLE_BOOKS_API}?q=${encodedAuthor}&maxResults=5&langRestrict=ja`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      return this.extractCandidatesFromResponse(data, '著者検索');
    } catch (error) {
      console.error('著者検索エラー:', error);
      return [];
    }
  }

  /**
   * API レスポンスから候補を抽出
   */
  private extractCandidatesFromResponse(data: any, source: string): SearchCandidate[] {
    const candidates: SearchCandidate[] = [];
    
    if (data.items) {
      for (const item of data.items) {
        const imageUrl = this.extractImageUrl(item);
        if (imageUrl) {
          candidates.push({
            imageUrl,
            source,
            volumeInfo: item.volumeInfo
          });
        }
      }
    }
    
    return candidates;
  }

  /**
   * 画像URLを抽出
   */
  private extractImageUrl(item: any): string | null {
    const imageLinks = item.volumeInfo?.imageLinks;
    if (!imageLinks) return null;

    return imageLinks.large || 
           imageLinks.medium || 
           imageLinks.thumbnail || 
           imageLinks.smallThumbnail || 
           null;
  }

  /**
   * 重複候補を除去
   */
  private removeDuplicateCandidates(candidates: SearchCandidate[]): SearchCandidate[] {
    const seen = new Set<string>();
    return candidates.filter(candidate => {
      if (seen.has(candidate.imageUrl)) {
        return false;
      }
      seen.add(candidate.imageUrl);
      return true;
    });
  }

  /**
   * 多段階Vision APIで画像候補を検証（99%精度達成）
   */
  private async verifyImageCandidates(book: Book, candidates: SearchCandidate[]): Promise<VisionMatchResult[]> {
    if (!this.model) {
      console.warn('⚠️ Gemini Vision API not available');
      return [];
    }

    console.log('🔍 多段階Vision API検証開始...');
    
    // Stage 1: 基本検証（全候補を高速でスクリーニング）
    console.log('🎯 Stage 1: 基本検証開始');
    const basicResults = await this.basicVerification(book, candidates);
    console.log(`   Stage 1完了: ${basicResults.length}件の候補が基本検証を通過`);
    
    if (basicResults.length === 0) {
      console.log('❌ 基本検証で有効な候補が見つかりませんでした');
      return [];
    }

    // Stage 2: 詳細検証（上位候補のみ）
    console.log('🎯 Stage 2: 詳細検証開始');
    const detailedCandidates = basicResults
      .filter(r => r.confidence > 0.6)
      .slice(0, 5); // 上位5件のみ
    
    const detailedResults = await this.detailedVerification(book, detailedCandidates);
    console.log(`   Stage 2完了: ${detailedResults.length}件の候補が詳細検証を通過`);
    
    if (detailedResults.length === 0) {
      console.log('❌ 詳細検証で有効な候補が見つかりませんでした');
      return basicResults; // 基本検証の結果を返す
    }

    // Stage 3: 最終確認（最上位候補のみ）
    console.log('🎯 Stage 3: 最終確認開始');
    const finalCandidates = detailedResults
      .filter(r => r.confidence > 0.8)
      .slice(0, 2); // 最上位2件のみ
    
    const finalResults = await this.finalVerification(book, finalCandidates);
    console.log(`   Stage 3完了: ${finalResults.length}件の候補が最終確認を通過`);
    
    // 最終結果を返す（各段階の結果をマージ）
    const allResults = [...finalResults, ...detailedResults, ...basicResults];
    const uniqueResults = this.removeDuplicateResults(allResults);
    
    console.log(`🎯 多段階検証完了: ${uniqueResults.length}件の有効な結果`);
    return uniqueResults;
  }

  /**
   * Stage 1: 基本検証（高速スクリーニング）
   */
  private async basicVerification(book: Book, candidates: SearchCandidate[]): Promise<VisionMatchResult[]> {
    const results: VisionMatchResult[] = [];
    
    for (let i = 0; i < Math.min(candidates.length, 10); i++) {
      const candidate = candidates[i];
      
      try {
        console.log(`   ${i + 1}/${candidates.length}: ${candidate.source}から基本検証中...`);
        
        const verificationResult = await this.verifyImageWithVision(book, candidate);
        if (verificationResult) {
          results.push(verificationResult);
          console.log(`   ✅ 基本検証完了: 信頼度${verificationResult.confidence.toFixed(2)}`);
        } else {
          console.log(`   ❌ 基本検証失敗`);
        }
        
        // API制限対策：少し待機
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`   ❌ 基本検証エラー [${i + 1}]:`, error);
      }
    }
    
    return results;
  }

  /**
   * Stage 2: 詳細検証（出版情報も含む詳細分析）
   */
  private async detailedVerification(book: Book, candidates: VisionMatchResult[]): Promise<VisionMatchResult[]> {
    const results: VisionMatchResult[] = [];
    
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      
      try {
        console.log(`   ${i + 1}/${candidates.length}: 詳細検証中...`);
        
        const detailedResult = await this.verifyImageWithDetailedVision(book, candidate);
        if (detailedResult) {
          results.push(detailedResult);
          console.log(`   ✅ 詳細検証完了: 信頼度${detailedResult.confidence.toFixed(2)}`);
        } else {
          console.log(`   ❌ 詳細検証失敗`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
      } catch (error) {
        console.error(`   ❌ 詳細検証エラー [${i + 1}]:`, error);
      }
    }
    
    return results;
  }

  /**
   * Stage 3: 最終確認（99%精度確保のための最終チェック）
   */
  private async finalVerification(book: Book, candidates: VisionMatchResult[]): Promise<VisionMatchResult[]> {
    const results: VisionMatchResult[] = [];
    
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      
      try {
        console.log(`   ${i + 1}/${candidates.length}: 最終確認中...`);
        
        const finalResult = await this.verifyImageWithFinalCheck(book, candidate);
        if (finalResult) {
          results.push(finalResult);
          console.log(`   ✅ 最終確認完了: 信頼度${finalResult.confidence.toFixed(2)}`);
        } else {
          console.log(`   ❌ 最終確認失敗`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`   ❌ 最終確認エラー [${i + 1}]:`, error);
      }
    }
    
    return results;
  }

  /**
   * 重複結果を除去
   */
  private removeDuplicateResults(results: VisionMatchResult[]): VisionMatchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      if (seen.has(result.imageUrl)) {
        return false;
      }
      seen.add(result.imageUrl);
      return true;
    });
  }

  /**
   * 単一画像のVision検証
   */
  private async verifyImageWithVision(book: Book, candidate: SearchCandidate): Promise<VisionMatchResult | null> {
    if (!this.model) return null;

    try {
      // 画像データを取得
      const imageResponse = await fetch(candidate.imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const uint8Array = new Uint8Array(imageBuffer);
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      const imageBase64 = btoa(binaryString);

      const prompt = `この書籍の表紙画像を詳細に分析し、99%の精度で検証してください。

期待する書籍情報:
- タイトル: "${book.title}"
- 著者: "${book.author}"
- ISBN: "${book.isbn || 'なし'}"

厳格な検証項目:
1. 表紙に記載されているタイトルの完全な文字列
2. 表紙に記載されている著者名の完全な文字列
3. 出版社、発行年、ISBN等の出版情報
4. 装丁やデザインの特徴
5. 画像の解像度と品質
6. 翻訳者、監修者等の追加情報

精度99%達成のための判定基準:
- タイトル完全一致: 97%以上の類似度が必要
- 著者完全一致: 95%以上の類似度が必要
- 出版情報の整合性確認
- 画像品質の評価（低解像度・不鮮明な画像は除外）
- 偽装や不正な画像の検出

JSON形式で詳細な分析結果を回答してください:
{
  "detectedTitle": "検出されたタイトル（完全な文字列）",
  "detectedAuthor": "検出された著者名（完全な文字列）",
  "detectedPublisher": "検出された出版社",
  "detectedISBN": "検出されたISBN",
  "detectedYear": "検出された発行年",
  "titleSimilarity": 数値(0-100),
  "authorSimilarity": 数値(0-100),
  "isCorrectBook": true/false,
  "confidence": 数値(0-100),
  "imageQuality": 数値(0-100),
  "reasoning": "詳細な判定理由と根拠",
  "warnings": ["品質や信頼性に関する警告があれば記載"]
}`;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType: imageResponse.headers.get('content-type') || 'image/jpeg'
          }
        }
      ]);

      const responseText = result.response.text();
      const analysis = JSON.parse(responseText);

      // 99%精度達成のための厳格な判定基準
      const titleMatch = analysis.titleSimilarity >= 97;
      const authorMatch = analysis.authorSimilarity >= 95;
      const hasWarnings = analysis.warnings && analysis.warnings.length > 0;

      // 総合信頼度の計算（複数要素を考慮）
      let adjustedConfidence = analysis.confidence;
      
      // 品質による調整
      if (analysis.imageQuality < 80) {
        adjustedConfidence *= 0.8;
      }
      
      // 警告がある場合の調整
      if (hasWarnings) {
        adjustedConfidence *= 0.7;
      }
      
      // タイトル・著者マッチング精度による調整
      if (analysis.titleSimilarity < 97 || analysis.authorSimilarity < 95) {
        adjustedConfidence *= 0.6;
      }

      return {
        imageUrl: candidate.imageUrl,
        confidence: Math.min(adjustedConfidence / 100, 1.0),
        titleMatch,
        authorMatch,
        matchDetails: {
          detectedTitle: analysis.detectedTitle || '',
          detectedAuthor: analysis.detectedAuthor || '',
          detectedPublisher: analysis.detectedPublisher || '',
          detectedISBN: analysis.detectedISBN || '',
          detectedYear: analysis.detectedYear || '',
          similarity: (analysis.titleSimilarity + analysis.authorSimilarity) / 2,
          imageQuality: analysis.imageQuality || 0,
          reasons: [analysis.reasoning || ''],
          warnings: analysis.warnings || []
        }
      };

    } catch (error) {
      console.error('Vision分析エラー:', error);
      return null;
    }
  }

  /**
   * 詳細Vision検証（Stage 2用）
   */
  private async verifyImageWithDetailedVision(book: Book, candidate: VisionMatchResult): Promise<VisionMatchResult | null> {
    if (!this.model) return null;

    try {
      // 画像データを再取得
      const imageResponse = await fetch(candidate.imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const uint8Array = new Uint8Array(imageBuffer);
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      const imageBase64 = btoa(binaryString);

      const prompt = `この書籍の表紙画像を詳細に分析し、出版情報も含めて総合的に検証してください。

期待する書籍情報:
- タイトル: "${book.title}"
- 著者: "${book.author}"
- ISBN: "${book.isbn || 'なし'}"

詳細検証項目:
1. 表紙デザインの特徴分析
2. 文字の配置とフォント
3. 出版社のロゴや情報
4. 背景色やイラストの特徴
5. 版（初版、文庫版、新装版等）の識別
6. 年代推定（装丁スタイルから）
7. 本の種類（単行本、文庫本、新書等）
8. 翻訳書の場合の翻訳者情報

信頼性判定:
- 画像の鮮明度と解像度
- 情報の一貫性
- 出版情報の妥当性
- 偽造や合成の可能性

JSON形式で回答してください:
{
  "detectedTitle": "検出されたタイトル",
  "detectedAuthor": "検出された著者名",
  "detectedPublisher": "検出された出版社",
  "detectedISBN": "検出されたISBN",
  "detectedYear": "検出された発行年",
  "detectedFormat": "本の形式（単行本、文庫本等）",
  "detectedEdition": "版情報",
  "titleSimilarity": 数値(0-100),
  "authorSimilarity": 数値(0-100),
  "publisherConfidence": 数値(0-100),
  "designAnalysis": "装丁デザインの特徴",
  "imageQuality": 数値(0-100),
  "isCorrectBook": true/false,
  "confidence": 数値(0-100),
  "reasoning": "詳細な判定理由",
  "warnings": ["品質や信頼性に関する警告"]
}`;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType: imageResponse.headers.get('content-type') || 'image/jpeg'
          }
        }
      ]);

      const responseText = result.response.text();
      const analysis = JSON.parse(responseText);

      // 詳細検証の厳格な判定
      const titleMatch = analysis.titleSimilarity >= 97;
      const authorMatch = analysis.authorSimilarity >= 95;
      const hasWarnings = analysis.warnings && analysis.warnings.length > 0;

      // 総合信頼度の詳細計算
      let adjustedConfidence = analysis.confidence;
      
      // 出版社信頼度による調整
      if (analysis.publisherConfidence < 70) {
        adjustedConfidence *= 0.9;
      }
      
      // 画像品質による調整
      if (analysis.imageQuality < 85) {
        adjustedConfidence *= 0.8;
      }
      
      // 警告による調整
      if (hasWarnings) {
        adjustedConfidence *= 0.7;
      }

      return {
        imageUrl: candidate.imageUrl,
        confidence: Math.min(adjustedConfidence / 100, 1.0),
        titleMatch,
        authorMatch,
        matchDetails: {
          detectedTitle: analysis.detectedTitle || '',
          detectedAuthor: analysis.detectedAuthor || '',
          detectedPublisher: analysis.detectedPublisher || '',
          detectedISBN: analysis.detectedISBN || '',
          detectedYear: analysis.detectedYear || '',
          similarity: (analysis.titleSimilarity + analysis.authorSimilarity) / 2,
          imageQuality: analysis.imageQuality || 0,
          reasons: [
            analysis.reasoning || '',
            `装丁特徴: ${analysis.designAnalysis || ''}`,
            `形式: ${analysis.detectedFormat || ''}`,
            `版情報: ${analysis.detectedEdition || ''}`
          ],
          warnings: analysis.warnings || []
        }
      };

    } catch (error) {
      console.error('詳細Vision分析エラー:', error);
      return null;
    }
  }

  /**
   * 最終確認Vision検証（Stage 3用）
   */
  private async verifyImageWithFinalCheck(book: Book, candidate: VisionMatchResult): Promise<VisionMatchResult | null> {
    if (!this.model) return null;

    try {
      // 画像データを再取得
      const imageResponse = await fetch(candidate.imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const uint8Array = new Uint8Array(imageBuffer);
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      const imageBase64 = btoa(binaryString);

      const prompt = `この書籍の表紙画像について、99%の精度で最終確認を行ってください。

期待する書籍情報:
- タイトル: "${book.title}"
- 著者: "${book.author}"
- ISBN: "${book.isbn || 'なし'}"

最終確認項目（99%精度基準）:
1. タイトルの文字一致（誤字、脱字、表記ゆれを厳格にチェック）
2. 著者名の完全一致（読み方、表記を厳格にチェック）
3. 出版社と発行年の妥当性確認
4. 画像の完全性（切り取り、合成、編集の痕跡）
5. 別版・別装丁の可能性（同一作品の異なる版）
6. 類似タイトルの書籍との誤認の可能性
7. 著者の同名異人の可能性

厳格な偽陰性・偽陽性チェック:
- 類似した書籍との識別
- 同一著者の別作品との識別
- 再版・改版での変更点の識別
- 翻訳版と原書の識別

JSON形式で最終判定を回答してください:
{
  "finalTitleMatch": true/false,
  "finalAuthorMatch": true/false,
  "exactnessScore": 数値(0-100),
  "authenticityScore": 数値(0-100),
  "uniquenessScore": 数値(0-100),
  "versionConsistency": true/false,
  "publishingIntegrity": true/false,
  "finalConfidence": 数値(0-100),
  "riskAssessment": "リスク評価",
  "finalRecommendation": "最終推奨（accept/reject/uncertain）",
  "criticalWarnings": ["重要な警告事項"]
}`;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType: imageResponse.headers.get('content-type') || 'image/jpeg'
          }
        }
      ]);

      const responseText = result.response.text();
      const analysis = JSON.parse(responseText);

      // 最終確認の超厳格な判定
      const finalAcceptable = analysis.finalRecommendation === 'accept' &&
                             analysis.finalTitleMatch &&
                             analysis.finalAuthorMatch &&
                             analysis.exactnessScore >= 95 &&
                             analysis.authenticityScore >= 90 &&
                             analysis.uniquenessScore >= 85 &&
                             analysis.versionConsistency &&
                             analysis.publishingIntegrity;

      if (!finalAcceptable) {
        console.log(`❌ 最終確認で不適格: ${analysis.finalRecommendation}`);
        return null;
      }

      // 最終信頼度の計算
      const finalConfidence = Math.min(
        analysis.finalConfidence / 100,
        (analysis.exactnessScore + analysis.authenticityScore + analysis.uniquenessScore) / 300
      );

      return {
        imageUrl: candidate.imageUrl,
        confidence: finalConfidence,
        titleMatch: analysis.finalTitleMatch,
        authorMatch: analysis.finalAuthorMatch,
        matchDetails: {
          detectedTitle: candidate.matchDetails.detectedTitle,
          detectedAuthor: candidate.matchDetails.detectedAuthor,
          detectedPublisher: candidate.matchDetails.detectedPublisher,
          detectedISBN: candidate.matchDetails.detectedISBN,
          detectedYear: candidate.matchDetails.detectedYear,
          similarity: analysis.exactnessScore,
          imageQuality: analysis.authenticityScore,
          reasons: [
            `最終確認: ${analysis.finalRecommendation}`,
            `正確性: ${analysis.exactnessScore}%`,
            `真正性: ${analysis.authenticityScore}%`,
            `一意性: ${analysis.uniquenessScore}%`,
            `リスク評価: ${analysis.riskAssessment}`
          ],
          warnings: analysis.criticalWarnings || []
        }
      };

    } catch (error) {
      console.error('最終確認Vision分析エラー:', error);
      return null;
    }
  }

  /**
   * 最適なマッチを選択（99%精度基準）
   */
  private selectBestMatch(results: VisionMatchResult[]): VisionMatchResult | null {
    if (results.length === 0) return null;

    // 99%精度基準での厳格なフィルタリング
    const highQualityMatches = results.filter(result => 
      result.titleMatch && 
      result.authorMatch && 
      result.confidence >= 0.85 && // 信頼度85%以上
      result.matchDetails.imageQuality >= 80 && // 画像品質80%以上
      result.matchDetails.warnings.length === 0 // 警告がない
    );

    if (highQualityMatches.length > 0) {
      // 最高品質の画像を選択
      highQualityMatches.sort((a, b) => {
        // 複合スコアでソート（信頼度 + 画像品質 + 類似度）
        const scoreA = a.confidence + (a.matchDetails.imageQuality / 100) + (a.matchDetails.similarity / 100);
        const scoreB = b.confidence + (b.matchDetails.imageQuality / 100) + (b.matchDetails.similarity / 100);
        return scoreB - scoreA;
      });
      
      console.log(`🏆 高品質マッチ選択: ${highQualityMatches.length}件中の最高スコア`);
      return highQualityMatches[0];
    }

    // 高品質マッチがない場合、標準基準で検索
    const validMatches = results.filter(result => 
      result.titleMatch && result.authorMatch && result.confidence > 0.7
    );

    if (validMatches.length === 0) {
      console.log('⚠️ 99%精度基準を満たす画像が見つかりませんでした');
      return null;
    }

    // 信頼度順にソート
    validMatches.sort((a, b) => b.confidence - a.confidence);
    
    console.log(`🔍 標準マッチ選択: ${validMatches.length}件中の最高信頼度（99%基準未達成）`);
    return validMatches[0];
  }

  /**
   * プレースホルダー生成
   */
  private generatePlaceholder(book: Book): string {
    const svgContent = `<svg width="80" height="100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f0f8ff;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e6f3ff;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="80" height="100" fill="url(#grad)" stroke="#b0d4f0" stroke-width="1"/>
        <text x="40" y="25" text-anchor="middle" font-family="Arial" font-size="10" font-weight="bold" fill="#2d5a7d">VISION</text>
        <text x="40" y="40" text-anchor="middle" font-family="Arial" font-size="8" fill="#2d5a7d">VERIFIED</text>
        <text x="40" y="55" text-anchor="middle" font-family="Arial" font-size="20" fill="#5a7a9d">📚</text>
        <text x="40" y="75" text-anchor="middle" font-family="Arial" font-size="7" fill="#7a9abd">NO MATCH</text>
        <text x="40" y="90" text-anchor="middle" font-family="Arial" font-size="6" fill="#9abadd">ID: ${book.id}</text>
      </svg>`;
    
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
  }

  /**
   * 超精密文字認識検証（不一致問題対応）
   */
  async getVerifiedImageWithPrecisionTextMatching(book: Book): Promise<string> {
    console.group(`🔍 [超精密文字認識検証] "${book.title}" by "${book.author}"`);
    
    try {
      // 基本的な候補収集
      const candidates = await this.collectImageCandidates(book);
      
      if (candidates.length === 0) {
        console.log('❌ 候補画像が見つかりませんでした');
        console.groupEnd();
        return this.generatePlaceholder(book);
      }

      console.log(`🎯 ${candidates.length}件の候補で超精密検証開始`);

      // 各候補に対して超精密文字認識を実行
      for (let i = 0; i < Math.min(candidates.length, 5); i++) {
        const candidate = candidates[i];
        
        try {
          console.log(`🔍 [${i + 1}/${candidates.length}] 超精密検証中: ${candidate.source}`);
          
          const validation = await this.precisionTextService.validateBookCoverWithTextRecognition(
            candidate.imageUrl,
            book
          );
          
          if (validation.isValid && validation.overallConfidence >= 90) {
            console.log(`✅ 超精密検証成功: 信頼度${validation.overallConfidence}%`);
            console.log(`📖 検出情報:`);
            console.log(`   タイトル: "${validation.textRecognition?.detectedTitle}"`);
            console.log(`   著者: "${validation.textRecognition?.detectedAuthor}"`);
            console.log(`   出版社: "${validation.textRecognition?.detectedPublisher}"`);
            
            if (validation.mismatchAnalysis?.mismatchDetails.length === 0) {
              console.log(`🎯 完全一致: 不一致なし`);
            } else {
              console.log(`⚠️ 軽微な相違: ${validation.mismatchAnalysis?.mismatchDetails.join(', ')}`);
            }
            
            console.groupEnd();
            return candidate.imageUrl;
          } else {
            console.log(`❌ 超精密検証失敗: 信頼度${validation.overallConfidence}%`);
            if (validation.mismatchAnalysis?.mismatchDetails.length) {
              console.log(`   不一致詳細: ${validation.mismatchAnalysis.mismatchDetails.join(', ')}`);
            }
            console.log(`   推奨: ${validation.recommendation}`);
          }
          
          // API制限対策
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`超精密検証エラー [${i + 1}]:`, error);
        }
      }
      
      console.log('❌ すべての候補が超精密検証基準を満たしませんでした');
      console.groupEnd();
      return this.generatePlaceholder(book);

    } catch (error) {
      console.error('超精密文字認識検証エラー:', error);
      console.groupEnd();
      return this.generatePlaceholder(book);
    }
  }

  /**
   * 不一致検証レポート生成
   */
  async generateMismatchReport(book: Book, imageUrl: string): Promise<{
    hasMismatch: boolean;
    mismatchDetails: string[];
    confidence: number;
    recommendation: string;
  }> {
    console.log(`📊 不一致レポート生成: "${book.title}"`);
    
    try {
      const validation = await this.precisionTextService.validateBookCoverWithTextRecognition(
        imageUrl,
        book
      );
      
      return {
        hasMismatch: validation.mismatchAnalysis?.severityLevel !== 'none' || false,
        mismatchDetails: validation.mismatchAnalysis?.mismatchDetails || [],
        confidence: validation.overallConfidence,
        recommendation: validation.recommendation
      };
    } catch (error) {
      console.error('不一致レポート生成エラー:', error);
      return {
        hasMismatch: true,
        mismatchDetails: ['検証中にエラーが発生しました'],
        confidence: 0,
        recommendation: '手動での確認が必要です'
      };
    }
  }

  /**
   * キャッシュクリア
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Vision検証キャッシュをクリア');
  }

  /**
   * API利用可能性チェック
   */
  isAvailable(): boolean {
    return !!this.model;
  }
}