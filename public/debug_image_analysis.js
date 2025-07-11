const https = require('https');

// テスト対象の書籍リスト
const testBooks = [
  { title: 'かいけつゾロリのドラゴンたいじ', author: '原ゆたか', isbn: '9784591053048' },
  { title: 'おしりたんてい', author: 'トロル', isbn: '9784591139011' },
  { title: 'ノンタンぶらんこのせて', author: 'キヨノサチコ', isbn: '9784033170103' },
  { title: 'ぐりとぐら', author: '中川李枝子', isbn: '9784834000829' },
  { title: 'からすのパンやさん', author: 'かこさとし', isbn: '9784032060300' },
  { title: 'どうぞのいす', author: '香山美子・柿本幸造', isbn: '9784893255365' },
  { title: 'きょうはなんのひ？', author: '瀬田貞二・林明子', isbn: '9784834007916' },
  { title: 'ふしぎなかぎばあさん', author: '手島悠介', isbn: '9784265916108' }
];

async function fetchGoogleBooksAPI(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function testImageSearch(book) {
  console.log(`\n=== 検証: ${book.title} by ${book.author} ===`);
  
  const results = {
    book: book,
    isbn_search: null,
    title_search: null,
    status: 'failed'
  };

  // 1. ISBN検索
  if (book.isbn) {
    try {
      const isbnUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${book.isbn}`;
      console.log(`ISBN検索: ${isbnUrl}`);
      const isbnData = await fetchGoogleBooksAPI(isbnUrl);
      
      if (isbnData.items && isbnData.items.length > 0) {
        const volumeInfo = isbnData.items[0].volumeInfo;
        const imageLinks = volumeInfo.imageLinks;
        
        results.isbn_search = {
          success: !!imageLinks,
          title: volumeInfo.title,
          authors: volumeInfo.authors || [],
          imageLinks: imageLinks || null,
          reason: imageLinks ? 'found' : 'no_image'
        };
        
        if (imageLinks) {
          console.log(`✅ ISBN成功: ${imageLinks.thumbnail || imageLinks.smallThumbnail}`);
          results.status = 'success';
        } else {
          console.log(`❌ ISBN失敗: 画像なし (${volumeInfo.title})`);
        }
      } else {
        results.isbn_search = { success: false, reason: 'not_found' };
        console.log(`❌ ISBN失敗: 検索結果なし`);
      }
    } catch (error) {
      console.log(`❌ ISBN検索エラー: ${error.message}`);
      results.isbn_search = { success: false, reason: 'error', error: error.message };
    }
  }

  // 2. タイトル検索（ISBNで成功しなかった場合）
  if (!results.isbn_search?.success) {
    try {
      const titleUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(book.title + ' ' + book.author)}&maxResults=3&langRestrict=ja`;
      console.log(`タイトル検索: ${titleUrl}`);
      const titleData = await fetchGoogleBooksAPI(titleUrl);
      
      if (titleData.items && titleData.items.length > 0) {
        let bestMatch = null;
        
        for (const item of titleData.items) {
          const volumeInfo = item.volumeInfo;
          const imageLinks = volumeInfo.imageLinks;
          
          if (imageLinks) {
            bestMatch = {
              success: true,
              title: volumeInfo.title,
              authors: volumeInfo.authors || [],
              imageLinks: imageLinks,
              similarity: calculateTitleSimilarity(book.title, volumeInfo.title)
            };
            break;
          }
        }
        
        if (bestMatch) {
          results.title_search = bestMatch;
          results.status = 'success';
          console.log(`✅ タイトル成功: ${bestMatch.imageLinks.thumbnail || bestMatch.imageLinks.smallThumbnail}`);
        } else {
          results.title_search = { success: false, reason: 'no_image_in_results' };
          console.log(`❌ タイトル失敗: 結果に画像なし`);
        }
      } else {
        results.title_search = { success: false, reason: 'no_results' };
        console.log(`❌ タイトル失敗: 検索結果なし`);
      }
    } catch (error) {
      console.log(`❌ タイトル検索エラー: ${error.message}`);
      results.title_search = { success: false, reason: 'error', error: error.message };
    }
  }

  return results;
}

function calculateTitleSimilarity(title1, title2) {
  if (!title1 || !title2) return 0;
  
  const normalize = str => str.toLowerCase().replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
  const norm1 = normalize(title1);
  const norm2 = normalize(title2);
  
  if (norm1 === norm2) return 100;
  
  // 簡易類似度計算
  const longer = norm1.length > norm2.length ? norm1 : norm2;
  const shorter = norm1.length > norm2.length ? norm2 : norm1;
  
  if (longer.includes(shorter)) return 85;
  
  // レーベンシュタイン距離による類似度
  const editDistance = levenshteinDistance(norm1, norm2);
  return Math.round((1 - editDistance / Math.max(norm1.length, norm2.length)) * 100);
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
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

// メイン実行
async function main() {
  console.log('🔍 表紙画像問題の徹底調査を開始...\n');
  
  const results = [];
  let successCount = 0;
  
  for (const book of testBooks) {
    const result = await testImageSearch(book);
    results.push(result);
    
    if (result.status === 'success') {
      successCount++;
    }
    
    // APIレート制限を避けるため1秒待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎯 === 調査結果サマリー ===');
  console.log(`成功率: ${successCount}/${testBooks.length} (${Math.round(successCount/testBooks.length*100)}%)`);
  
  console.log('\n❌ 失敗した書籍:');
  results.filter(r => r.status !== 'success').forEach(result => {
    console.log(`- ${result.book.title} (${result.book.author})`);
    if (result.isbn_search && !result.isbn_search.success) {
      console.log(`  ISBN失敗: ${result.isbn_search.reason}`);
    }
    if (result.title_search && !result.title_search.success) {
      console.log(`  タイトル失敗: ${result.title_search.reason}`);
    }
  });
  
  console.log('\n✅ 成功した書籍:');
  results.filter(r => r.status === 'success').forEach(result => {
    const source = result.isbn_search?.success ? 'ISBN' : 'タイトル';
    console.log(`- ${result.book.title} (${source}検索で成功)`);
  });
  
  // 詳細結果をJSONで出力
  console.log('\n💾 詳細調査結果をファイルに保存...');
  const fs = require('fs');
  fs.writeFileSync('./debug_image_analysis_result.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    success_rate: Math.round(successCount/testBooks.length*100),
    total_books: testBooks.length,
    successful_books: successCount,
    detailed_results: results
  }, null, 2));
  
  console.log('✨ 調査完了！詳細はdebug_image_analysis_result.jsonをご確認ください。');
}

main().catch(console.error);