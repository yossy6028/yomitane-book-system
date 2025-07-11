const fs = require('fs');
const https = require('https');
const { URLSearchParams } = require('url');

// 複数の検索戦略を実装
class GoogleBooksSearcher {
  constructor() {
    this.apiKey = process.env.GOOGLE_BOOKS_API_KEY || 'AIzaSyDl9qkfFGN_wGzXBGtOYGqAzDgmfTgPjmo';
    this.baseUrl = 'https://www.googleapis.com/books/v1/volumes';
  }

  // 基本的な検索
  async basicSearch(title, author) {
    const query = `"${title}" "${author}"`;
    return this.makeRequest(query);
  }

  // タイトルのみで検索
  async titleOnlySearch(title) {
    const query = `intitle:"${title}"`;
    return this.makeRequest(query);
  }

  // 著者のみで検索
  async authorOnlySearch(author) {
    const query = `inauthor:"${author}"`;
    return this.makeRequest(query);
  }

  // 柔軟な検索（部分一致）
  async flexibleSearch(title, author) {
    const titleWords = title.split(/\s+/).filter(word => word.length > 2);
    const authorWords = author.split(/\s+/).filter(word => word.length > 2);
    
    let query = '';
    if (titleWords.length > 0) {
      query += titleWords.map(word => `intitle:${word}`).join(' ');
    }
    if (authorWords.length > 0) {
      if (query) query += ' ';
      query += authorWords.map(word => `inauthor:${word}`).join(' ');
    }
    
    return this.makeRequest(query);
  }

  // APIリクエストを実行
  async makeRequest(query) {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        q: query,
        maxResults: 10,
        key: this.apiKey,
        printType: 'books',
        orderBy: 'relevance'
      });
      
      const url = `${this.baseUrl}?${params}`;
      
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(json.error.message));
            } else {
              resolve(json);
            }
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', reject);
    });
  }
}

// 表紙画像URLを検証
async function verifyImageUrl(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }
    
    const httpsUrl = url.replace(/^http:/, 'https:');
    
    https.get(httpsUrl, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

// 最適な書籍を選択
function selectBestMatch(books, originalTitle, originalAuthor) {
  if (!books || books.length === 0) return null;
  
  const scoreBook = (book) => {
    const info = book.volumeInfo;
    let score = 0;
    
    // タイトル一致度
    if (info.title) {
      const titleLower = info.title.toLowerCase();
      const originalTitleLower = originalTitle.toLowerCase();
      
      if (titleLower === originalTitleLower) {
        score += 20;
      } else if (titleLower.includes(originalTitleLower) || originalTitleLower.includes(titleLower)) {
        score += 15;
      } else {
        // 部分一致
        const titleWords = originalTitleLower.split(/\s+/);
        const matchedWords = titleWords.filter(word => titleLower.includes(word));
        score += matchedWords.length * 3;
      }
    }
    
    // 著者一致度
    if (info.authors) {
      const authorMatch = info.authors.some(author => {
        const authorLower = author.toLowerCase();
        const originalAuthorLower = originalAuthor.toLowerCase();
        
        return authorLower.includes(originalAuthorLower) || 
               originalAuthorLower.includes(authorLower);
      });
      
      if (authorMatch) {
        score += 25;
      }
    }
    
    // 画像の質
    if (info.imageLinks) {
      if (info.imageLinks.large) score += 10;
      else if (info.imageLinks.medium) score += 8;
      else if (info.imageLinks.small) score += 6;
      else if (info.imageLinks.thumbnail) score += 4;
    }
    
    // 日本語優先
    if (info.language === 'ja') score += 8;
    
    // 子供向け書籍
    if (info.categories) {
      const hasChildrenCategory = info.categories.some(cat => 
        cat.toLowerCase().includes('juvenile') || 
        cat.toLowerCase().includes('children') ||
        cat.toLowerCase().includes('young')
      );
      if (hasChildrenCategory) score += 5;
    }
    
    return score;
  };
  
  const scoredBooks = books.map(book => ({
    book,
    score: scoreBook(book)
  }));
  
  scoredBooks.sort((a, b) => b.score - a.score);
  return scoredBooks[0]?.book || null;
}

// 複数の検索戦略を試行
async function searchWithMultipleStrategies(searcher, title, author) {
  const strategies = [
    { name: 'basic', method: () => searcher.basicSearch(title, author) },
    { name: 'titleOnly', method: () => searcher.titleOnlySearch(title) },
    { name: 'authorOnly', method: () => searcher.authorOnlySearch(author) },
    { name: 'flexible', method: () => searcher.flexibleSearch(title, author) }
  ];
  
  for (const strategy of strategies) {
    try {
      const result = await strategy.method();
      if (result.totalItems > 0) {
        return { result, strategy: strategy.name };
      }
    } catch (error) {
      console.log(`    ${strategy.name}戦略でエラー: ${error.message}`);
    }
    
    // API制限を考慮して少し待機
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return { result: null, strategy: null };
}

// メイン処理
async function verifyAllCoverImages() {
  try {
    const booksData = JSON.parse(fs.readFileSync('/Users/yoshiikatsuhiko/book-recommendation-system/new-books-50.json', 'utf8'));
    const searcher = new GoogleBooksSearcher();
    const verificationResults = [];
    
    console.log('改善された検索方法で50冊の図書について表紙画像検索を開始します...\n');
    
    for (let i = 0; i < booksData.length; i++) {
      const book = booksData[i];
      console.log(`${i + 1}/50: ${book.title} - ${book.author}`);
      
      try {
        const { result: searchResult, strategy } = await searchWithMultipleStrategies(
          searcher, book.title, book.author
        );
        
        let result = {
          originalTitle: book.title,
          originalAuthor: book.author,
          targetAge: book.targetAge,
          searchSuccess: false,
          matchFound: false,
          coverImageUrl: '',
          selectedBook: null,
          strategy: strategy,
          reason: ''
        };
        
        if (searchResult && searchResult.totalItems > 0) {
          result.searchSuccess = true;
          console.log(`    ${strategy}戦略で${searchResult.totalItems}件の結果を取得`);
          
          const bestMatch = selectBestMatch(searchResult.items, book.title, book.author);
          
          if (bestMatch) {
            result.matchFound = true;
            result.selectedBook = {
              title: bestMatch.volumeInfo.title,
              authors: bestMatch.volumeInfo.authors || [],
              language: bestMatch.volumeInfo.language,
              categories: bestMatch.volumeInfo.categories || [],
              imageLinks: bestMatch.volumeInfo.imageLinks || {}
            };
            
            const imageLinks = bestMatch.volumeInfo.imageLinks;
            if (imageLinks) {
              const coverUrl = imageLinks.large || imageLinks.medium || imageLinks.small || imageLinks.thumbnail;
              
              if (coverUrl) {
                const httpsUrl = coverUrl.replace(/^http:/, 'https:');
                const isValid = await verifyImageUrl(httpsUrl);
                
                if (isValid) {
                  result.coverImageUrl = httpsUrl;
                  result.reason = `適切な表紙画像が見つかりました (${strategy}戦略)`;
                  console.log(`    ✓ 表紙画像取得成功: ${httpsUrl}`);
                } else {
                  result.reason = '表紙画像URLが無効です';
                  console.log(`    ✗ 表紙画像URL無効`);
                }
              } else {
                result.reason = '表紙画像が見つかりませんでした';
                console.log(`    ✗ 表紙画像なし`);
              }
            } else {
              result.reason = '画像リンクが存在しません';
              console.log(`    ✗ 画像リンクなし`);
            }
          } else {
            result.reason = '適切な版が見つかりませんでした';
            console.log(`    ✗ 適切な版なし`);
          }
        } else {
          result.reason = '全ての検索戦略で結果が得られませんでした';
          console.log(`    ✗ 全戦略で検索結果なし`);
        }
        
        verificationResults.push(result);
        
        // API制限を考慮して待機
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`    ✗ エラー: ${error.message}`);
        verificationResults.push({
          originalTitle: book.title,
          originalAuthor: book.author,
          targetAge: book.targetAge,
          searchSuccess: false,
          matchFound: false,
          coverImageUrl: '',
          selectedBook: null,
          strategy: null,
          reason: `エラー: ${error.message}`
        });
      }
    }
    
    // 結果を保存
    fs.writeFileSync(
      '/Users/yoshiikatsuhiko/book-recommendation-system/improved-cover-verification-results.json',
      JSON.stringify(verificationResults, null, 2),
      'utf8'
    );
    
    // 統計情報を表示
    const successCount = verificationResults.filter(r => r.coverImageUrl).length;
    const searchSuccessCount = verificationResults.filter(r => r.searchSuccess).length;
    const matchFoundCount = verificationResults.filter(r => r.matchFound).length;
    
    console.log('\n=== 改善された検索結果統計 ===');
    console.log(`総書籍数: ${verificationResults.length}`);
    console.log(`検索成功: ${searchSuccessCount}/${verificationResults.length} (${Math.round(searchSuccessCount/verificationResults.length*100)}%)`);
    console.log(`適切な版発見: ${matchFoundCount}/${verificationResults.length} (${Math.round(matchFoundCount/verificationResults.length*100)}%)`);
    console.log(`表紙画像取得成功: ${successCount}/${verificationResults.length} (${Math.round(successCount/verificationResults.length*100)}%)`);
    
    // 戦略別統計
    const strategyStats = {};
    verificationResults.forEach(result => {
      if (result.strategy) {
        strategyStats[result.strategy] = (strategyStats[result.strategy] || 0) + 1;
      }
    });
    
    console.log('\n=== 検索戦略別統計 ===');
    Object.entries(strategyStats).forEach(([strategy, count]) => {
      console.log(`${strategy}: ${count}件`);
    });
    
    console.log('\n=== 表紙画像取得成功書籍 ===');
    verificationResults.filter(r => r.coverImageUrl).forEach((result, index) => {
      console.log(`${index + 1}. ${result.originalTitle} (${result.originalAuthor})`);
      console.log(`   選択された書籍: ${result.selectedBook.title}`);
      console.log(`   著者: ${result.selectedBook.authors.join(', ')}`);
      console.log(`   画像URL: ${result.coverImageUrl}`);
      console.log(`   戦略: ${result.strategy}`);
      console.log('');
    });
    
    console.log('\n=== 表紙画像取得失敗書籍 ===');
    verificationResults.filter(r => !r.coverImageUrl).forEach((result, index) => {
      console.log(`${index + 1}. ${result.originalTitle} (${result.originalAuthor})`);
      console.log(`   理由: ${result.reason}`);
      if (result.selectedBook) {
        console.log(`   候補書籍: ${result.selectedBook.title}`);
      }
      console.log('');
    });
    
    return verificationResults;
    
  } catch (error) {
    console.error('検証処理中にエラーが発生しました:', error);
    throw error;
  }
}

// 実行
verifyAllCoverImages().catch(console.error);