// 大量の未表示書籍をPlaywrightバックエンドで一括取得

console.log('🚀 Playwrightバックエンドでの大量取得開始');

// プレースホルダー表示の書籍を収集
async function collectPlaceholderBooks() {
  console.log('\n📊 プレースホルダー書籍の収集中...');
  
  const placeholderBooks = [];
  
  // すべてのページを巡回する必要があるが、まず現在のページから
  const images = document.querySelectorAll('img[src*="data:image/svg"]');
  
  images.forEach(img => {
    if (img.alt && img.alt.includes('の表紙')) {
      const bookCard = img.closest('.book-card');
      if (bookCard) {
        const titleEl = bookCard.querySelector('.book-title');
        const authorEl = bookCard.querySelector('.book-author');
        
        if (titleEl) {
          placeholderBooks.push({
            title: titleEl.textContent.trim(),
            author: authorEl ? authorEl.textContent.replace('著者: ', '').trim() : '',
            element: img
          });
        }
      }
    }
  });
  
  // ログから問題のある書籍も追加
  const knownProblemBooks = [
    { title: '5年3組リョウタ組', author: '石田衣良' },
    { title: 'バッテリー', author: 'あさのあつこ' },
    { title: 'ごんぎつね', author: '新美南吉' },
    { title: '風の又三郎', author: '宮沢賢治' }
  ];
  
  console.log(`現在のページで ${placeholderBooks.length} 冊のプレースホルダーを検出`);
  console.log(`既知の問題書籍 ${knownProblemBooks.length} 冊を追加`);
  
  return [...placeholderBooks, ...knownProblemBooks];
}

// バッチ処理でPlaywrightバックエンドに送信
async function batchFetchWithPlaywright(books) {
  console.log(`\n📚 ${books.length}冊をPlaywrightで処理開始`);
  
  const batchSize = 10; // 10冊ずつ処理
  const results = [];
  
  for (let i = 0; i < books.length; i += batchSize) {
    const batch = books.slice(i, i + batchSize);
    console.log(`\n🔄 バッチ ${Math.floor(i/batchSize) + 1}/${Math.ceil(books.length/batchSize)} 処理中...`);
    
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
          console.log('✅ 画像取得成功:', result.imageUrl.substring(0, 50) + '...');
          
          // 画像を即座に更新
          if (book.element) {
            book.element.src = result.imageUrl;
          }
          
          results.push({
            ...book,
            success: true,
            imageUrl: result.imageUrl
          });
        } else {
          console.log('❌ 取得失敗');
          results.push({
            ...book,
            success: false
          });
        }
        
      } catch (error) {
        console.error('💥 エラー:', error.message);
        results.push({
          ...book,
          success: false,
          error: error.message
        });
      }
      
      // API制限対策
      await new Promise(r => setTimeout(r, 2000));
    }
    
    // バッチ間の休憩
    if (i + batchSize < books.length) {
      console.log('\n⏸️ 次のバッチまで5秒待機...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  
  return results;
}

// 結果の分析
function analyzeResults(results) {
  console.log('\n📊 処理結果の分析');
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  console.log(`成功: ${successCount}冊 (${(successCount/results.length*100).toFixed(1)}%)`);
  console.log(`失敗: ${failureCount}冊 (${(failureCount/results.length*100).toFixed(1)}%)`);
  
  if (failureCount > 0) {
    console.log('\n❌ 失敗した書籍:');
    results.filter(r => !r.success).forEach((book, i) => {
      console.log(`${i+1}. ${book.title} - ${book.error || '原因不明'}`);
    });
  }
  
  return { successCount, failureCount };
}

// メイン実行
async function main() {
  // 1. プレースホルダー書籍を収集
  const books = await collectPlaceholderBooks();
  
  if (books.length === 0) {
    console.log('✅ プレースホルダー書籍が見つかりません');
    return;
  }
  
  console.log(`\n🎯 処理対象: ${books.length}冊`);
  
  // 2. 確認
  const proceed = confirm(`${books.length}冊の書籍をPlaywrightで処理します。\n約${Math.ceil(books.length * 2 / 60)}分かかります。続行しますか？`);
  
  if (!proceed) {
    console.log('❌ キャンセルされました');
    return;
  }
  
  // 3. バッチ処理実行
  const results = await batchFetchWithPlaywright(books);
  
  // 4. 結果分析
  const { successCount, failureCount } = analyzeResults(results);
  
  console.log('\n✅ 処理完了');
  console.log(`表示改善: ${successCount}冊の画像を取得`);
  
  // 5. 次のステップ
  if (failureCount > 0) {
    console.log('\n💡 残りの書籍への対策:');
    console.log('1. 静的画像データベースの構築');
    console.log('2. 書籍データ自体の見直し');
    console.log('3. より高度なスクレイピング手法');
  }
}

// 実行
main();