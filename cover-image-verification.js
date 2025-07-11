const fs = require('fs');
const https = require('https');
const { URLSearchParams } = require('url');

// Google Books API検索関数
function searchGoogleBooks(title, author) {
  return new Promise((resolve, reject) => {
    // クエリを構築（タイトルと著者を含む）
    const query = `intitle:"${title}" inauthor:"${author}"`;
    const params = new URLSearchParams({
      q: query,
      maxResults: 10,
      key: process.env.GOOGLE_BOOKS_API_KEY || 'YOUR_API_KEY_HERE'
    });
    
    const url = `https://www.googleapis.com/books/v1/volumes?${params}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

// 表紙画像URLを検証する関数
function verifyImageUrl(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }
    
    https.get(url, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

// 最適な書籍を選択する関数
function selectBestMatch(books, originalTitle, originalAuthor, targetAge) {
  if (!books || books.length === 0) return null;
  
  // スコアリング関数
  const scoreBook = (book) => {
    const info = book.volumeInfo;
    let score = 0;
    
    // タイトル一致度
    if (info.title && info.title.toLowerCase().includes(originalTitle.toLowerCase())) {
      score += 10;
    }
    
    // 著者一致度
    if (info.authors && info.authors.some(author => 
      author.toLowerCase().includes(originalAuthor.toLowerCase()) ||
      originalAuthor.toLowerCase().includes(author.toLowerCase())
    )) {
      score += 15;
    }
    
    // 画像の質
    if (info.imageLinks) {
      if (info.imageLinks.large) score += 8;
      else if (info.imageLinks.medium) score += 6;
      else if (info.imageLinks.small) score += 4;
      else if (info.imageLinks.thumbnail) score += 2;
    }
    
    // 言語（日本語優先）
    if (info.language === 'ja') score += 5;
    
    // 対象年齢（6-10歳に適したもの）
    if (info.categories && info.categories.some(cat => 
      cat.toLowerCase().includes('juvenile') || 
      cat.toLowerCase().includes('children')
    )) {
      score += 3;
    }
    
    return score;
  };
  
  // 最高スコアの書籍を選択
  const scoredBooks = books.map(book => ({
    book,
    score: scoreBook(book)
  }));
  
  scoredBooks.sort((a, b) => b.score - a.score);
  return scoredBooks[0]?.book || null;
}

// メイン処理
async function verifyAllCoverImages() {
  try {
    // 図書リストを読み込み
    const booksData = JSON.parse(fs.readFileSync('/Users/yoshiikatsuhiko/book-recommendation-system/new-books-50.json', 'utf8'));
    
    const verificationResults = [];
    
    console.log('50冊の図書について表紙画像検索を開始します...\n');
    
    // 各書籍について検索
    for (let i = 0; i < booksData.length; i++) {
      const book = booksData[i];
      console.log(`${i + 1}/50: ${book.title} - ${book.author}`);
      
      try {
        // Google Books APIで検索
        const searchResult = await searchGoogleBooks(book.title, book.author);
        
        let result = {
          originalTitle: book.title,
          originalAuthor: book.author,
          targetAge: book.targetAge,
          searchSuccess: false,
          matchFound: false,
          coverImageUrl: '',
          selectedBook: null,
          reason: ''
        };
        
        if (searchResult.totalItems > 0) {
          result.searchSuccess = true;
          
          // 最適な書籍を選択
          const bestMatch = selectBestMatch(searchResult.items, book.title, book.author, book.targetAge);
          
          if (bestMatch) {
            result.matchFound = true;
            result.selectedBook = {
              title: bestMatch.volumeInfo.title,
              authors: bestMatch.volumeInfo.authors || [],
              language: bestMatch.volumeInfo.language,
              categories: bestMatch.volumeInfo.categories || [],
              imageLinks: bestMatch.volumeInfo.imageLinks || {}
            };
            
            // 表紙画像URLを取得
            const imageLinks = bestMatch.volumeInfo.imageLinks;
            if (imageLinks) {
              // 最高品質の画像を選択
              const coverUrl = imageLinks.large || imageLinks.medium || imageLinks.small || imageLinks.thumbnail;
              
              if (coverUrl) {
                // 画像URLを検証
                const isValid = await verifyImageUrl(coverUrl);
                if (isValid) {
                  result.coverImageUrl = coverUrl;
                  result.reason = '適切な表紙画像が見つかりました';
                  console.log(`  ✓ 表紙画像取得成功: ${coverUrl}`);
                } else {
                  result.reason = '表紙画像URLが無効です';
                  console.log(`  ✗ 表紙画像URL無効`);
                }
              } else {
                result.reason = '表紙画像が見つかりませんでした';
                console.log(`  ✗ 表紙画像なし`);
              }
            } else {
              result.reason = '画像リンクが存在しません';
              console.log(`  ✗ 画像リンクなし`);
            }
          } else {
            result.reason = '適切な版が見つかりませんでした';
            console.log(`  ✗ 適切な版なし`);
          }
        } else {
          result.reason = '検索結果がありませんでした';
          console.log(`  ✗ 検索結果なし`);
        }
        
        verificationResults.push(result);
        
        // API制限を考慮して少し待機
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`  ✗ エラー: ${error.message}`);
        verificationResults.push({
          originalTitle: book.title,
          originalAuthor: book.author,
          targetAge: book.targetAge,
          searchSuccess: false,
          matchFound: false,
          coverImageUrl: '',
          selectedBook: null,
          reason: `エラー: ${error.message}`
        });
      }
    }
    
    // 結果を保存
    fs.writeFileSync(
      '/Users/yoshiikatsuhiko/book-recommendation-system/cover-image-verification-results.json',
      JSON.stringify(verificationResults, null, 2),
      'utf8'
    );
    
    // 統計情報を表示
    const successCount = verificationResults.filter(r => r.coverImageUrl).length;
    const searchSuccessCount = verificationResults.filter(r => r.searchSuccess).length;
    const matchFoundCount = verificationResults.filter(r => r.matchFound).length;
    
    console.log('\n=== 検索結果統計 ===');
    console.log(`総書籍数: ${verificationResults.length}`);
    console.log(`検索成功: ${searchSuccessCount}/${verificationResults.length} (${Math.round(searchSuccessCount/verificationResults.length*100)}%)`);
    console.log(`適切な版発見: ${matchFoundCount}/${verificationResults.length} (${Math.round(matchFoundCount/verificationResults.length*100)}%)`);
    console.log(`表紙画像取得成功: ${successCount}/${verificationResults.length} (${Math.round(successCount/verificationResults.length*100)}%)`);
    
    console.log('\n=== 表紙画像取得成功書籍 ===');
    verificationResults.filter(r => r.coverImageUrl).forEach((result, index) => {
      console.log(`${index + 1}. ${result.originalTitle} (${result.originalAuthor})`);
      console.log(`   画像URL: ${result.coverImageUrl}`);
    });
    
    console.log('\n=== 表紙画像取得失敗書籍 ===');
    verificationResults.filter(r => !r.coverImageUrl).forEach((result, index) => {
      console.log(`${index + 1}. ${result.originalTitle} (${result.originalAuthor})`);
      console.log(`   理由: ${result.reason}`);
    });
    
    return verificationResults;
    
  } catch (error) {
    console.error('検証処理中にエラーが発生しました:', error);
    throw error;
  }
}

// 実行
verifyAllCoverImages().catch(console.error);