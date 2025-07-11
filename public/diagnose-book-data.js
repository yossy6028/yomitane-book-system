/**
 * 書籍データの診断スクリプト
 * 実際のデータベースの書籍情報を確認し、問題を特定
 */

console.log('🔍 書籍データの診断開始');

function diagnoseBookData() {
  console.log('\n=== 書籍データの詳細診断 ===');
  
  // 全ての書籍カードを取得
  const bookCards = document.querySelectorAll('.book-card, [class*="book"]');
  console.log(`📊 検出された書籍カード数: ${bookCards.length}`);
  
  const bookData = [];
  
  bookCards.forEach((card, index) => {
    const titleEl = card.querySelector('.book-title') || 
                   card.querySelector('h3') ||
                   card.querySelector('[class*="title"]') ||
                   card.querySelector('strong');
    
    const authorEl = card.querySelector('.book-author') ||
                    card.querySelector('[class*="author"]');
    
    const imageEl = card.querySelector('img');
    
    if (titleEl) {
      const title = titleEl.textContent.replace(/^(タイトル:|本のタイトル:)/, '').trim();
      const author = authorEl ? authorEl.textContent.replace(/^(著者:|作者:)/, '').trim() : '不明';
      const hasImage = imageEl && imageEl.src && imageEl.src.startsWith('http');
      
      bookData.push({
        index: index + 1,
        title,
        author,
        hasImage,
        imageUrl: imageEl ? imageEl.src.substring(0, 50) + '...' : 'なし'
      });
    }
  });
  
  console.log(`\n📚 解析された書籍数: ${bookData.length}`);
  
  // 統計情報
  const withImages = bookData.filter(b => b.hasImage);
  const withoutImages = bookData.filter(b => !b.hasImage);
  
  console.log(`✅ 画像あり: ${withImages.length}冊 (${(withImages.length/bookData.length*100).toFixed(1)}%)`);
  console.log(`❌ 画像なし: ${withoutImages.length}冊 (${(withoutImages.length/bookData.length*100).toFixed(1)}%)`);
  
  // 問題の多い書籍を表示
  console.log('\n❌ 画像なし書籍（最初の20冊）:');
  withoutImages.slice(0, 20).forEach((book, i) => {
    console.log(`${i + 1}. "${book.title}" - ${book.author}`);
  });
  
  // 成功している書籍を表示
  if (withImages.length > 0) {
    console.log('\n✅ 画像あり書籍（最初の10冊）:');
    withImages.slice(0, 10).forEach((book, i) => {
      console.log(`${i + 1}. "${book.title}" - ${book.author}`);
    });
  }
  
  return { bookData, withImages, withoutImages };
}

/**
 * 特定の書籍でGoogle Books APIテスト
 */
async function testGoogleBooksAPI(title, author) {
  console.log(`\n🔍 Google Books APIテスト: "${title}" by ${author}`);
  
  const queries = [
    `${title} ${author}`,
    `"${title}" "${author}"`,
    title,
    author
  ];
  
  for (const query of queries) {
    try {
      console.log(`   検索中: ${query}`);
      
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   結果数: ${data.items?.length || 0}`);
        
        if (data.items?.length) {
          data.items.forEach((item, i) => {
            const info = item.volumeInfo;
            const hasImage = !!info.imageLinks?.thumbnail;
            console.log(`   ${i + 1}. "${info.title}" (画像: ${hasImage ? 'あり' : 'なし'})`);
          });
          return data.items[0]; // 最初の結果を返す
        }
      }
    } catch (error) {
      console.error(`   エラー: ${error.message}`);
    }
  }
  
  return null;
}

/**
 * 手動でバックエンドAPIをテスト
 */
async function testBackendAPI(title, author) {
  console.log(`\n🔧 バックエンドAPIテスト: "${title}" by ${author}`);
  
  try {
    const response = await fetch('http://localhost:3001/api/book-cover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, author })
    });
    
    const result = await response.json();
    console.log('   結果:', result);
    
    return result;
  } catch (error) {
    console.error('   エラー:', error);
    return null;
  }
}

/**
 * 問題書籍の一括診断
 */
async function diagnoseProblemBooks() {
  console.log('\n🩺 問題書籍の一括診断');
  
  const diagnosis = diagnoseBookData();
  const problemBooks = diagnosis.withoutImages.slice(0, 5); // 最初の5冊をテスト
  
  for (const book of problemBooks) {
    console.log(`\n📖 診断中: "${book.title}" by ${book.author}`);
    
    // Google Books APIで直接テスト
    const googleResult = await testGoogleBooksAPI(book.title, book.author);
    
    // バックエンドAPIでテスト
    const backendResult = await testBackendAPI(book.title, book.author);
    
    console.log(`   Google直接: ${googleResult ? '成功' : '失敗'}`);
    console.log(`   バックエンド: ${backendResult?.success ? '成功' : '失敗'}`);
    
    await new Promise(r => setTimeout(r, 1000)); // レート制限
  }
}

// 実行
async function main() {
  const diagnosis = diagnoseBookData();
  
  console.log('\n💡 次のステップ:');
  console.log('1. testGoogleBooksAPI("書籍名", "著者名") - 個別Google APIテスト');
  console.log('2. testBackendAPI("書籍名", "著者名") - 個別バックエンドテスト');
  console.log('3. diagnoseProblemBooks() - 問題書籍一括診断');
  
  return diagnosis;
}

// グローバル関数として登録
window.testGoogleBooksAPI = testGoogleBooksAPI;
window.testBackendAPI = testBackendAPI;
window.diagnoseProblemBooks = diagnoseProblemBooks;
window.diagnoseBookData = diagnoseBookData;

main();