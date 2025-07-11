// 1ページに全書籍が表示されているかチェック

console.log('🔍 全書籍表示状況の確認');

function checkAllBooksOnSinglePage() {
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
        src: img.src.substring(0, 50) + '...',
        element: img
      });
    }
  });
  
  console.log(`\n📚 書籍画像数: ${bookImages.length}冊`);
  
  const placeholders = bookImages.filter(b => b.isPlaceholder);
  const realImages = bookImages.filter(b => !b.isPlaceholder);
  
  console.log(`✅ 実画像: ${realImages.length}冊 (${(realImages.length/bookImages.length*100).toFixed(1)}%)`);
  console.log(`❌ プレースホルダー: ${placeholders.length}冊 (${(placeholders.length/bookImages.length*100).toFixed(1)}%)`);
  
  // プレースホルダーの例を表示（最初の10冊）
  if (placeholders.length > 0) {
    console.log('\n❌ プレースホルダー書籍（最初の10冊）:');
    placeholders.slice(0, 10).forEach((book, i) => {
      console.log(`${i + 1}. "${book.title}" by ${book.author}`);
    });
    
    if (placeholders.length > 10) {
      console.log(`... 他 ${placeholders.length - 10}冊`);
    }
  }
  
  // キャッシュサイズと比較
  console.log('\n📊 キャッシュ情報との比較:');
  console.log('ログに "キャッシュサイズ: 274" が表示されていました');
  console.log(`現在検出された書籍数: ${bookImages.length}冊`);
  
  if (bookImages.length >= 270) {
    console.log('✅ ほぼ全書籍（274冊）が1ページに表示されています');
    console.log('💡 ページネーションではなく、スクロールや全表示方式のようです');
  } else {
    console.log('⚠️ 一部の書籍のみ表示されているようです');
    console.log('💡 無限スクロールや遅延読み込みの可能性があります');
  }
  
  return { bookImages, placeholders, realImages };
}

// スクロールして全書籍を読み込む
async function loadAllBooksWithScroll() {
  console.log('\n📜 スクロールで全書籍読み込み試行');
  
  let lastBookCount = 0;
  let currentBookCount = 0;
  let scrollAttempts = 0;
  const maxScrollAttempts = 10;
  
  do {
    lastBookCount = currentBookCount;
    
    // 一番下までスクロール
    window.scrollTo(0, document.body.scrollHeight);
    console.log(`📜 スクロール ${scrollAttempts + 1}回目...`);
    
    // 読み込み待機
    await new Promise(r => setTimeout(r, 2000));
    
    // 書籍数を再カウント
    const bookImages = document.querySelectorAll('img[alt*="の表紙"]');
    currentBookCount = bookImages.length;
    
    console.log(`現在の書籍数: ${currentBookCount}冊`);
    scrollAttempts++;
    
  } while (currentBookCount > lastBookCount && scrollAttempts < maxScrollAttempts);
  
  console.log(`📊 最終書籍数: ${currentBookCount}冊`);
  
  // 上に戻る
  window.scrollTo(0, 0);
  
  return currentBookCount;
}

// 大量処理の実行（全書籍が1ページの場合）
async function processSinglePageAllBooks() {
  console.log('\n🚀 単一ページ全書籍処理');
  
  const analysis = checkAllBooksOnSinglePage();
  
  if (analysis.placeholders.length === 0) {
    console.log('✅ すべての書籍に画像が表示されています！');
    return;
  }
  
  console.log(`\n🎯 ${analysis.placeholders.length}冊のプレースホルダーを処理します`);
  
  const proceed = confirm(
    `${analysis.placeholders.length}冊の未表示書籍を処理します。\n` +
    `予想時間: 約${Math.ceil(analysis.placeholders.length * 1.5 / 60)}分\n` +
    `続行しますか？`
  );
  
  if (!proceed) {
    console.log('❌ キャンセルされました');
    return;
  }
  
  // バッチ処理
  const batchSize = 20;
  const results = [];
  
  for (let i = 0; i < analysis.placeholders.length; i += batchSize) {
    const batch = analysis.placeholders.slice(i, i + batchSize);
    console.log(`\n📦 バッチ ${Math.floor(i/batchSize) + 1}/${Math.ceil(analysis.placeholders.length/batchSize)} (${batch.length}冊)`);
    
    for (const book of batch) {
      console.log(`\n📖 "${book.title}" by ${book.author}`);
      
      try {
        const response = await fetch('http://localhost:3001/api/book-cover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: book.title,
            author: book.author
          })
        });
        
        const result = await response.json();
        
        if (result.success && result.imageUrl) {
          console.log('✅ 成功:', result.source);
          book.element.src = result.imageUrl;
          results.push({ ...book, success: true, source: result.source });
        } else {
          console.log('❌ 失敗');
          results.push({ ...book, success: false });
        }
        
      } catch (error) {
        console.error('💥 エラー:', error.message);
        results.push({ ...book, success: false, error: error.message });
      }
      
      await new Promise(r => setTimeout(r, 1000));
    }
    
    // バッチ間休憩
    if (i + batchSize < analysis.placeholders.length) {
      console.log('⏸️ 5秒休憩...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  
  // 結果分析
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  console.log('\n🎉 処理完了！');
  console.log(`✅ 成功: ${successCount}冊 (${(successCount/results.length*100).toFixed(1)}%)`);
  console.log(`❌ 失敗: ${failureCount}冊`);
  console.log(`📈 全体表示率: ${((analysis.realImages.length + successCount) / analysis.bookImages.length * 100).toFixed(1)}%`);
  
  return results;
}

// メイン実行
async function main() {
  console.log('🎯 Step 1: 基本分析');
  const initialAnalysis = checkAllBooksOnSinglePage();
  
  if (initialAnalysis.bookImages.length < 200) {
    console.log('\n🎯 Step 2: スクロール読み込み試行');
    await loadAllBooksWithScroll();
  }
  
  console.log('\n🎯 Step 3: 最終処理');
  await processSinglePageAllBooks();
}

main();