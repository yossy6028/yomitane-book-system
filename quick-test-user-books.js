/**
 * ユーザー指摘書籍の迅速テスト
 * 90%基準が正しく機能しているか確認
 */

require('dotenv').config();

async function quickTestUserBooks() {
  console.log('🚀 ユーザー指摘書籍の迅速テスト');
  console.log('=====================================\n');

  // ユーザー指摘の1冊で迅速テスト
  const testBook = {
    title: "世界の国旗と国歌",
    author: "吹浦忠正",
    publisher: "旺文社",
    publishedDate: "2020-12-01"
  };

  console.log(`📚 テスト書籍: 「${testBook.title}」 著者：${testBook.author}`);
  console.log(`📋 出版社：${testBook.publisher} (${testBook.publishedDate})\n`);

  try {
    // バックエンドAPI経由でテスト
    console.log('🔍 バックエンドAPI経由でのテスト');
    const response = await fetch('http://localhost:3001/api/book-cover', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: testBook.title,
        author: testBook.author,
        isbn: '',
        genre: '',
        useVisionValidation: true
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const result = await response.json();
    console.log('📊 API応答結果:');
    console.log(`   成功: ${result.success}`);
    console.log(`   画像URL: ${result.imageUrl ? result.imageUrl.substring(0, 60) + '...' : 'なし'}`);
    console.log(`   Vision検証使用: ${result.visionValidationUsed}`);
    console.log(`   検索方法: ${result.searchMethod || '不明'}`);

    if (result.success && result.imageUrl) {
      console.log('\n✅ 画像取得成功 - 90%基準をクリアした画像が選択されました');
      
      // 手動でVision検証を実行して確認
      console.log('\n🔬 取得画像の手動Vision検証');
      const { GeminiVisionValidator } = require('./backend/gemini-vision-validator');
      const validator = new GeminiVisionValidator();
      
      const validation = await validator.validateBookCover(
        result.imageUrl,
        testBook.title,
        testBook.author
      );
      
      console.log(`📋 検証結果:`);
      console.log(`   表紙タイトル: "${validation.coverTitle}"`);
      console.log(`   表紙著者: "${validation.coverAuthor}"`);
      console.log(`   タイトル一致: ${validation.titleMatch}`);
      console.log(`   著者一致: ${validation.authorMatch}`);
      console.log(`   信頼度: ${validation.confidence}%`);
      console.log(`   90%基準判定: ${validation.isValid ? '✅ 合格' : '❌ 不合格'}`);
      
      if (validation.isValid) {
        console.log('\n🎯 システム正常動作: 90%基準をクリアした適切な画像が選択されています');
      } else {
        console.log('\n🚨 システム問題: 90%基準をクリアしていない画像が選択されています');
        console.log(`理由: ${validation.reason}`);
      }
      
    } else {
      console.log('\n❌ 画像取得失敗 - 90%基準を満たす画像が見つかりませんでした');
      console.log('これは期待される動作です（不適切な画像の除外）');
    }

  } catch (error) {
    console.error(`❌ テストエラー: ${error.message}`);
  }
}

if (require.main === module) {
  quickTestUserBooks().catch(console.error);
}

module.exports = { quickTestUserBooks };