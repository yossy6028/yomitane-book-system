/**
 * 超高精度文字認識・照合サービス
 * 画像から文字を読み取り、元データとの詳細照合を行う
 * 不一致問題の根本的解決を目指す
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Book } from '../../types/Book';

interface TextRecognitionResult {
  detectedTitle: string;
  detectedAuthor: string;
  detectedPublisher: string;
  detectedSubtitle: string;
  detectedSeries: string;
  detectedVolume: string;
  confidence: number;
  issues: string[];
}

interface MismatchAnalysis {
  titleMismatch: boolean;
  authorMismatch: boolean;
  publisherMismatch: boolean;
  severityLevel: 'none' | 'minor' | 'major' | 'critical';
  mismatchDetails: string[];
  recommendedAction: 'accept' | 'reject' | 'manual_review';
}

export class PrecisionTextMatchingService {
  private static instance: PrecisionTextMatchingService;
  private genAI?: GoogleGenerativeAI;
  private model?: any;

  constructor() {
    this.initializeGemini();
  }

  static getInstance(): PrecisionTextMatchingService {
    if (!this.instance) {
      this.instance = new PrecisionTextMatchingService();
    }
    return this.instance;
  }

  private initializeGemini(): void {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('✅ Precision Text Matching Service initialized');
    } else {
      console.warn('⚠️ Gemini API key not found for text matching');
    }
  }

  /**
   * 画像から超精密文字認識を実行
   */
  async performPrecisionTextRecognition(imageUrl: string): Promise<TextRecognitionResult | null> {
    if (!this.model) {
      console.warn('⚠️ Gemini Vision API not available for text recognition');
      return null;
    }

    try {
      console.log('🔍 超精密文字認識開始...');

      // 画像データを取得
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const uint8Array = new Uint8Array(imageBuffer);
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      const imageBase64 = btoa(binaryString);

      const prompt = `この書籍の表紙画像から、すべての文字を超精密に読み取ってください。

重要な指示:
1. 表紙に書かれているすべての文字を正確に抽出
2. 誤字・脱字は一切許容しない
3. 文字の一部が見えにくい場合は「[不明瞭]」と記載
4. 著者名の表記ゆれ（姓名の順序、漢字・ひらがな・カタカナ）を詳細に記録
5. タイトルの副題やシリーズ情報も分離して抽出
6. 出版社名、発行年も正確に読み取り
7. 翻訳者、編集者、監修者なども識別

特に注意すべき点:
- 小さな文字も見逃さない
- 装飾的なフォントも正確に読み取り
- 縦書き・横書きの混在に対応
- 英語・日本語の混在文字列の正確な分離
- 記号や特殊文字（：、？、！、・など）の正確な記録

JSON形式で詳細な読み取り結果を回答してください:
{
  "mainTitle": "メインタイトル（完全な文字列）",
  "subtitle": "副題・サブタイトル",
  "series": "シリーズ名",
  "volume": "巻数・号数",
  "author": "著者名（完全な文字列）",
  "translator": "翻訳者名",
  "editor": "編集者名",
  "supervisor": "監修者名",
  "publisher": "出版社名",
  "publishYear": "発行年",
  "isbn": "ISBN番号",
  "obi": "帯に書かれた文字",
  "backCover": "裏表紙の情報（見える場合）",
  "spine": "背表紙の情報（見える場合）",
  "allVisibleText": ["表紙に見えるすべての文字を配列で"],
  "textQuality": "文字の鮮明度（0-100）",
  "readabilityIssues": ["読み取り困難な箇所"],
  "confidence": "全体の読み取り信頼度（0-100）"
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

      return {
        detectedTitle: analysis.mainTitle || '',
        detectedAuthor: analysis.author || '',
        detectedPublisher: analysis.publisher || '',
        detectedSubtitle: analysis.subtitle || '',
        detectedSeries: analysis.series || '',
        detectedVolume: analysis.volume || '',
        confidence: analysis.confidence || 0,
        issues: analysis.readabilityIssues || []
      };

    } catch (error) {
      console.error('精密文字認識エラー:', error);
      return null;
    }
  }

  /**
   * 不一致分析を実行
   */
  async analyzeMismatch(
    originalBook: Book, 
    recognizedText: TextRecognitionResult
  ): Promise<MismatchAnalysis> {
    console.log('🔍 不一致分析開始...');

    const analysis: MismatchAnalysis = {
      titleMismatch: false,
      authorMismatch: false,
      publisherMismatch: false,
      severityLevel: 'none',
      mismatchDetails: [],
      recommendedAction: 'accept'
    };

    // タイトル不一致チェック
    const titleSimilarity = this.calculateTextSimilarity(
      originalBook.title,
      recognizedText.detectedTitle
    );
    
    if (titleSimilarity < 90) {
      analysis.titleMismatch = true;
      analysis.mismatchDetails.push(
        `タイトル不一致: 元「${originalBook.title}」⇔ 検出「${recognizedText.detectedTitle}」(類似度: ${titleSimilarity}%)`
      );
    }

    // 著者不一致チェック
    const authorSimilarity = this.calculateTextSimilarity(
      originalBook.author,
      recognizedText.detectedAuthor
    );
    
    if (authorSimilarity < 85) {
      analysis.authorMismatch = true;
      analysis.mismatchDetails.push(
        `著者不一致: 元「${originalBook.author}」⇔ 検出「${recognizedText.detectedAuthor}」(類似度: ${authorSimilarity}%)`
      );
    }

    // 出版社不一致チェック（利用可能な場合）
    if (originalBook.publisher && recognizedText.detectedPublisher) {
      const publisherSimilarity = this.calculateTextSimilarity(
        originalBook.publisher,
        recognizedText.detectedPublisher
      );
      
      if (publisherSimilarity < 70) {
        analysis.publisherMismatch = true;
        analysis.mismatchDetails.push(
          `出版社不一致: 元「${originalBook.publisher}」⇔ 検出「${recognizedText.detectedPublisher}」(類似度: ${publisherSimilarity}%)`
        );
      }
    }

    // 重要度レベルの判定
    if (analysis.titleMismatch && analysis.authorMismatch) {
      analysis.severityLevel = 'critical';
      analysis.recommendedAction = 'reject';
    } else if (analysis.titleMismatch || analysis.authorMismatch) {
      analysis.severityLevel = 'major';
      analysis.recommendedAction = 'manual_review';
    } else if (analysis.publisherMismatch) {
      analysis.severityLevel = 'minor';
      analysis.recommendedAction = 'accept';
    }

    console.log(`📊 不一致分析結果: ${analysis.severityLevel} レベル`);
    return analysis;
  }

  /**
   * 包括的な画像検証（文字認識 + 不一致分析）
   */
  async validateBookCoverWithTextRecognition(
    imageUrl: string,
    originalBook: Book
  ): Promise<{
    isValid: boolean;
    textRecognition: TextRecognitionResult | null;
    mismatchAnalysis: MismatchAnalysis | null;
    overallConfidence: number;
    recommendation: string;
  }> {
    console.group(`🔍 [超精密検証] "${originalBook.title}" by "${originalBook.author}"`);

    try {
      // Step 1: 超精密文字認識
      const textRecognition = await this.performPrecisionTextRecognition(imageUrl);
      
      if (!textRecognition) {
        console.log('❌ 文字認識失敗');
        console.groupEnd();
        return {
          isValid: false,
          textRecognition: null,
          mismatchAnalysis: null,
          overallConfidence: 0,
          recommendation: '文字認識に失敗しました'
        };
      }

      console.log(`📖 検出タイトル: "${textRecognition.detectedTitle}"`);
      console.log(`👤 検出著者: "${textRecognition.detectedAuthor}"`);
      console.log(`🏢 検出出版社: "${textRecognition.detectedPublisher}"`);

      // Step 2: 不一致分析
      const mismatchAnalysis = await this.analyzeMismatch(originalBook, textRecognition);

      // Step 3: 総合判定
      const overallConfidence = this.calculateOverallConfidence(
        textRecognition,
        mismatchAnalysis
      );

      const isValid = mismatchAnalysis.recommendedAction === 'accept' && 
                     overallConfidence >= 80;

      const recommendation = this.generateRecommendation(
        mismatchAnalysis,
        overallConfidence
      );

      console.log(`📊 総合信頼度: ${overallConfidence}%`);
      console.log(`✅ 検証結果: ${isValid ? '合格' : '不合格'}`);
      console.log(`💡 推奨: ${recommendation}`);
      console.groupEnd();

      return {
        isValid,
        textRecognition,
        mismatchAnalysis,
        overallConfidence,
        recommendation
      };

    } catch (error) {
      console.error('包括的検証エラー:', error);
      console.groupEnd();
      return {
        isValid: false,
        textRecognition: null,
        mismatchAnalysis: null,
        overallConfidence: 0,
        recommendation: 'システムエラーが発生しました'
      };
    }
  }

  /**
   * テキスト類似度計算（レーベンシュタイン距離ベース）
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    const normalizedText1 = this.normalizeText(text1);
    const normalizedText2 = this.normalizeText(text2);

    const distance = this.levenshteinDistance(normalizedText1, normalizedText2);
    const maxLength = Math.max(normalizedText1.length, normalizedText2.length);
    
    if (maxLength === 0) return 100;
    
    return Math.round((1 - distance / maxLength) * 100);
  }

  /**
   * テキスト正規化
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[、。・：？！\s]/g, '') // 句読点・記号を除去
      .replace(/[ａ-ｚＡ-Ｚ０-９]/g, (char) => // 全角→半角変換
        String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
      );
  }

  /**
   * レーベンシュタイン距離計算
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

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

  /**
   * 総合信頼度計算
   */
  private calculateOverallConfidence(
    textRecognition: TextRecognitionResult,
    mismatchAnalysis: MismatchAnalysis
  ): number {
    let confidence = textRecognition.confidence;

    // 不一致レベルによる減点
    switch (mismatchAnalysis.severityLevel) {
      case 'critical':
        confidence *= 0.3;
        break;
      case 'major':
        confidence *= 0.6;
        break;
      case 'minor':
        confidence *= 0.8;
        break;
      default:
        break;
    }

    // 文字認識品質による調整
    if (textRecognition.issues.length > 0) {
      confidence *= 0.9;
    }

    return Math.round(confidence);
  }

  /**
   * 推奨アクション生成
   */
  private generateRecommendation(
    mismatchAnalysis: MismatchAnalysis,
    overallConfidence: number
  ): string {
    if (mismatchAnalysis.severityLevel === 'critical') {
      return '重大な不一致が検出されました。この画像は使用しないことを強く推奨します。';
    } else if (mismatchAnalysis.severityLevel === 'major') {
      return '不一致が検出されました。手動での確認を推奨します。';
    } else if (overallConfidence < 80) {
      return '信頼度が低いため、別の画像の検索を推奨します。';
    } else {
      return '適切な画像です。使用して問題ありません。';
    }
  }

  /**
   * サービス利用可能性チェック
   */
  isAvailable(): boolean {
    return !!this.model;
  }
}