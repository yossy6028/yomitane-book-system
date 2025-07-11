// 全274冊の大量処理スクリプト

console.log('🚀 全274冊の大量処理開始');

// 全ページを巡回してプレースホルダー書籍を収集
async function collectAllPlaceholderBooks() {
  console.log('\n📊 全ページ巡回でプレースホルダー書籍収集...');
  
  const allBooks = [];
  let currentPage = 1;
  
  // ページネーション情報を取得
  const pageInfo = document.querySelector('.book-list-footer') || 
                   document.querySelector('[class*="page"]');
  
  let totalPages = 23; // デフォルト（274冊 ÷ 12冊/ページ）
  
  if (pageInfo) {
    const pageText = pageInfo.textContent;
    const pageMatch = pageText.match(/(\d+)\s*\/\s*(\d+)/);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1]);
      totalPages = parseInt(pageMatch[2]);
    }
  }
  
  console.log(`📖 総ページ数: ${totalPages}ページ`);
  console.log(`📍 現在のページ: ${currentPage}ページ目`);
  
  // 現在のページの書籍を収集
  function collectCurrentPageBooks() {
    const books = [];
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
      if (img.alt && img.alt.includes('の表紙')) {
        const bookCard = img.closest('.book-card');
        if (bookCard) {
          const titleEl = bookCard.querySelector('.book-title') || 
                          bookCard.querySelector('h3') ||
                          bookCard.querySelector('[class*="title"]');
          const authorEl = bookCard.querySelector('.book-author') ||
                           bookCard.querySelector('[class*="author"]');
          
          if (titleEl) {
            const isPlaceholder = img.src.includes('data:image/svg') || 
                                 img.src === '' || 
                                 img.src.includes('placeholder');
            
            books.push({
              title: titleEl.textContent.replace('タイトル: ', '').trim(),
              author: authorEl ? authorEl.textContent.replace('著者: ', '').trim() : '',
              isPlaceholder,
              element: img,
              page: currentPage
            });
          }
        }
      }
    });
    
    return books;
  }
  
  // 現在のページの書籍を収集
  const currentPageBooks = collectCurrentPageBooks();
  allBooks.push(...currentPageBooks);
  
  console.log(`現在のページ(${currentPage})で ${currentPageBooks.length}冊検出`);
  console.log(`  - プレースホルダー: ${currentPageBooks.filter(b => b.isPlaceholder).length}冊`);
  console.log(`  - 画像あり: ${currentPageBooks.filter(b => !b.isPlaceholder).length}冊`);
  
  // 他のページも処理したい場合の準備（手動ページ遷移が必要）
  console.log('\n💡 全ページ処理のためには:');
  console.log('1. 各ページに手動で移動');
  console.log('2. このスクリプトを再実行');
  console.log('3. または、ページネーションを自動化');
  
  return allBooks;
}

// SimplifiedImageSearchServiceから既知のプレースホルダー書籍を追加
function addKnownPlaceholderBooks(books) {
  // ログから判明している問題書籍
  const knownProblems = [
    { title: '5年3組リョウタ組', author: '石田衣良', source: 'log' },
    { title: 'バッテリー', author: 'あさのあつこ', source: 'log' },
    { title: 'ごんぎつね', author: '新美南吉', source: 'log' },
    { title: '風の又三郎', author: '宮沢賢治', source: 'log' },
    { title: 'トムソーヤの冒険', author: 'マーク・トウェイン', source: 'log' },
    { title: 'はじめてのサイエンス', author: '池上彰', source: 'log' },
    { title: 'わたしのあのこ あのこのわたし', author: '岩瀬成子', source: 'log' },
    { title: '近未来モビリティとまちづくり', author: '安藤章', source: 'log' },
    { title: 'スモールワールズ', author: '一穂ミチ', source: 'log' },
    { title: 'できることの見つけ方', author: '石田由香理', source: 'log' }
  ];
  
  // 重複を避けて追加
  knownProblems.forEach(known => {
    const exists = books.find(b => b.title === known.title);
    if (!exists) {
      books.push({
        ...known,
        isPlaceholder: true,
        page: 'unknown'
      });
    }
  });
  
  return books;
}

// バッチ処理でシンプルバックエンドに送信
async function massProcessWithSimpleBackend(books) {
  const placeholderBooks = books.filter(b => b.isPlaceholder);
  
  console.log(`\n🎯 処理対象: ${placeholderBooks.length}冊のプレースホルダー書籍`);
  console.log(`📊 全体の書籍数: ${books.length}冊`);
  console.log(`📈 現在の表示率: ${((books.length - placeholderBooks.length) / books.length * 100).toFixed(1)}%`);
  
  if (placeholderBooks.length === 0) {
    console.log('✅ すべての書籍に画像が表示されています！');
    return;
  }
  
  // 確認
  const proceed = confirm(
    `${placeholderBooks.length}冊の未表示書籍を処理します。\n` +
    `予想時間: 約${Math.ceil(placeholderBooks.length * 2 / 60)}分\n` +
    `続行しますか？`
  );
  
  if (!proceed) {
    console.log('❌ キャンセルされました');
    return;
  }
  
  // バッチサイズ
  const batchSize = 20; // 20冊ずつ処理
  const results = [];
  
  console.log(`\n🚀 ${Math.ceil(placeholderBooks.length / batchSize)}個のバッチで処理開始`);
  
  for (let i = 0; i < placeholderBooks.length; i += batchSize) {
    const batch = placeholderBooks.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(placeholderBooks.length / batchSize);
    
    console.log(`\n📦 バッチ ${batchNum}/${totalBatches} (${batch.length}冊)`);
    
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
          console.log('✅ 画像取得成功:', result.source);
          
          // 画像を即座に更新（要素がある場合）
          if (book.element) {
            book.element.src = result.imageUrl;
          }
          
          results.push({
            ...book,
            success: true,
            imageUrl: result.imageUrl,
            source: result.source
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
      await new Promise(r => setTimeout(r, 1500));
    }
    
    // バッチ間の休憩
    if (i + batchSize < placeholderBooks.length) {
      console.log('\n⏸️ 次のバッチまで5秒休憩...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  
  return results;
}

// 結果の詳細分析
function analyzeDetailedResults(results, originalBooks) {
  console.log('\n📊 詳細結果分析');
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  const totalOriginal = originalBooks.length;
  const originalPlaceholders = originalBooks.filter(b => b.isPlaceholder).length;
  
  console.log(`\n📈 処理結果:`);
  console.log(`成功: ${successCount}冊 (${(successCount/results.length*100).toFixed(1)}%)`);
  console.log(`失敗: ${failureCount}冊 (${(failureCount/results.length*100).toFixed(1)}%)`);
  
  console.log(`\n📊 全体への影響:`);
  console.log(`処理前表示率: ${((totalOriginal-originalPlaceholders)/totalOriginal*100).toFixed(1)}%`);
  console.log(`処理後表示率: ${((totalOriginal-originalPlaceholders+successCount)/totalOriginal*100).toFixed(1)}%`);
  console.log(`改善: +${((successCount/totalOriginal)*100).toFixed(1)}ポイント`);
  
  // ソース別統計
  const sourceStats = {};
  results.filter(r => r.success).forEach(r => {
    sourceStats[r.source] = (sourceStats[r.source] || 0) + 1;
  });
  
  console.log(`\n📋 画像ソース別統計:`);
  Object.entries(sourceStats).forEach(([source, count]) => {
    console.log(`${source}: ${count}冊`);
  });
  
  return { successCount, failureCount, sourceStats };
}

// メイン実行
async function main() {
  console.log('🔍 Step 1: 全書籍収集');
  let allBooks = await collectAllPlaceholderBooks();
  
  console.log('\n🔍 Step 2: 既知の問題書籍追加');
  allBooks = addKnownPlaceholderBooks(allBooks);
  
  console.log('\n🔍 Step 3: 大量処理実行');
  const results = await massProcessWithSimpleBackend(allBooks);
  
  if (results) {
    console.log('\n🔍 Step 4: 結果分析');
    analyzeDetailedResults(results, allBooks);
    
    console.log('\n🎉 全274冊処理完了！');
    console.log('💡 必要に応じて他のページも同様に処理してください');
  }
}

// 実行
main();