/**
 * 現在の表紙画像表示状況を詳細チェック
 */

console.log('📊 現在の表紙画像表示状況をチェック中...');

function checkCurrentDisplayStatus() {
  console.log('\n=== 書籍表示状況の詳細分析 ===');
  
  // 全ての画像要素を確認
  const allImages = document.querySelectorAll('img');
  console.log(`総画像数: ${allImages.length}`);
  
  // 書籍関連の画像を特定
  const bookImages = [];
  allImages.forEach((img, index) => {
    if (img.alt && (img.alt.includes('の表紙') || img.alt.includes('表紙'))) {
      const bookCard = img.closest('.book-card') || 
                       img.closest('[class*="book"]') ||
                       img.parentElement;
      
      let title = 'タイトル不明';
      let author = '著者不明';
      
      if (bookCard) {
        const titleEl = bookCard.querySelector('.book-title') || 
                        bookCard.querySelector('h3') ||
                        bookCard.querySelector('[class*="title"]') ||
                        bookCard.querySelector('strong');
        
        const authorEl = bookCard.querySelector('.book-author') ||
                         bookCard.querySelector('[class*="author"]');
        
        if (titleEl) title = titleEl.textContent.trim();
        if (authorEl) author = authorEl.textContent.replace(/^(著者:|作者:)/, '').trim();
      }
      
      const isPlaceholder = img.src.includes('data:image/svg') || 
                           img.src === '' || 
                           !img.src.startsWith('http');
      
      bookImages.push({
        index: index + 1,
        title,
        author,
        isPlaceholder,
        src: img.src.substring(0, 80) + '...',
        element: img
      });
    }
  });
  
  console.log(`\n📚 書籍画像数: ${bookImages.length}冊`);
  
  const placeholders = bookImages.filter(b => b.isPlaceholder);
  const realImages = bookImages.filter(b => !b.isPlaceholder);
  
  console.log(`✅ 実画像: ${realImages.length}冊 (${(realImages.length/bookImages.length*100).toFixed(1)}%)`);
  console.log(`❌ プレースホルダー: ${placeholders.length}冊 (${(placeholders.length/bookImages.length*100).toFixed(1)}%)`);
  
  // 問題書籍の詳細リスト
  if (placeholders.length > 0) {
    console.log('\n❌ 未表示書籍の詳細:');
    placeholders.forEach((book, i) => {
      console.log(`${i + 1}. "${book.title}" by ${book.author}`);
    });
  }
  
  // 成功書籍の詳細
  if (realImages.length > 0) {
    console.log('\n✅ 表示成功書籍の詳細:');
    realImages.slice(0, 10).forEach((book, i) => {
      console.log(`${i + 1}. "${book.title}" by ${book.author}`);
    });
    if (realImages.length > 10) {
      console.log(`... 他 ${realImages.length - 10}冊`);
    }
  }
  
  return { bookImages, placeholders, realImages };
}

/**
 * 究極システムが実際に稼働しているかテスト
 */
async function testUltimateSystemIntegration() {
  console.log('\n🔧 究極システム統合状況テスト');
  
  try {
    // バックエンドの生存確認
    const healthResponse = await fetch('http://localhost:3001/health');
    if (healthResponse.ok) {
      console.log('✅ バックエンドサーバー稼働中');
    } else {
      console.log('❌ バックエンドサーバー問題あり');
      return false;
    }
    
    // 究極システムのテスト呼び出し
    console.log('\n🚀 究極システムのテスト呼び出し...');
    const testResponse = await fetch('http://localhost:3001/api/book-cover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'テストタイトル',
        author: 'テスト著者'
      })
    });
    
    const result = await testResponse.json();
    console.log('📊 究極システムレスポンス:', result);
    
    if (result.success) {
      console.log('✅ 究極システム正常動作');
      return true;
    } else {
      console.log('⚠️ 究極システム動作しているが画像取得失敗');
      return false;
    }
    
  } catch (error) {
    console.error('💥 究極システムテストエラー:', error);
    return false;
  }
}

/**
 * 手動で特定の書籍を究極システムで処理
 */
async function processSpecificBookWithUltimateSystem(title, author) {
  console.log(`\n🎯 手動処理: "${title}" by ${author}`);
  
  try {
    const response = await fetch('http://localhost:3001/api/book-cover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title,
        author: author,
        genre: '児童書',
        targetAge: '小学生'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ 成功: ${result.source} (信頼度: ${result.confidence})`);
      console.log(`   画像URL: ${result.imageUrl}`);
      
      // 実際にページの画像を更新
      const bookImages = document.querySelectorAll('img[alt*="の表紙"]');
      bookImages.forEach(img => {
        const bookCard = img.closest('.book-card');
        if (bookCard) {
          const titleEl = bookCard.querySelector('.book-title');
          if (titleEl && titleEl.textContent.includes(title)) {
            img.src = result.imageUrl;
            console.log(`🖼️ ページ上の画像を更新しました`);
          }
        }
      });
      
      return result;
    } else {
      console.log('❌ 画像取得失敗');
      return null;
    }
    
  } catch (error) {
    console.error('💥 処理エラー:', error);
    return null;
  }
}

/**
 * 一括で未表示書籍を究極システムで処理
 */
async function batchProcessPlaceholders() {
  console.log('\n🚀 一括未表示書籍処理開始');
  
  const analysis = checkCurrentDisplayStatus();
  const placeholders = analysis.placeholders;
  
  if (placeholders.length === 0) {
    console.log('✅ 処理する未表示書籍がありません');
    return;
  }
  
  console.log(`📊 処理対象: ${placeholders.length}冊`);
  
  const proceed = confirm(
    `${placeholders.length}冊の未表示書籍を究極システムで処理しますか？\n` +
    `予想時間: 約${Math.ceil(placeholders.length * 2 / 60)}分`
  );
  
  if (!proceed) {
    console.log('❌ キャンセルされました');
    return;
  }
  
  const results = [];
  
  for (let i = 0; i < placeholders.length; i++) {
    const book = placeholders[i];
    console.log(`\n📖 [${i + 1}/${placeholders.length}] "${book.title}" by ${book.author}`);
    
    const result = await processSpecificBookWithUltimateSystem(book.title, book.author);
    if (result) {
      results.push({ ...book, success: true, result });
    } else {
      results.push({ ...book, success: false });
    }
    
    // レート制限
    await new Promise(r => setTimeout(r, 2000));
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎉 一括処理完了: ${successCount}/${placeholders.length}冊成功`);
  
  return results;
}

// 実行
async function main() {
  // 現在の状況確認
  const analysis = checkCurrentDisplayStatus();
  
  // 究極システム統合確認
  const systemWorking = await testUltimateSystemIntegration();
  
  if (systemWorking) {
    console.log('\n💡 次のステップ:');
    console.log('1. processSpecificBookWithUltimateSystem("書籍名", "著者名") - 個別処理');
    console.log('2. batchProcessPlaceholders() - 一括処理');
  } else {
    console.log('\n⚠️ 究極システムに問題があります。バックエンドをチェックしてください。');
  }
  
  return analysis;
}

// グローバル関数として登録
window.processSpecificBookWithUltimateSystem = processSpecificBookWithUltimateSystem;
window.batchProcessPlaceholders = batchProcessPlaceholders;
window.checkCurrentDisplayStatus = checkCurrentDisplayStatus;

main();