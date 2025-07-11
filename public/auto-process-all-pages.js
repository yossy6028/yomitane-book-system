// 全ページ自動処理スクリプト

console.log('🚀 全23ページ自動処理開始');

// ページネーション制御
class PageController {
  constructor() {
    this.currentPage = 1;
    this.totalPages = 23; // デフォルト
    this.processedBooks = [];
    this.totalResults = [];
  }

  // 現在のページ情報を取得
  getCurrentPageInfo() {
    const pageInfo = document.querySelector('.book-list-footer') || 
                     document.querySelector('[class*="page"]') ||
                     document.querySelector('.pagination');
    
    if (pageInfo) {
      const pageText = pageInfo.textContent;
      const pageMatch = pageText.match(/(\d+)\s*\/\s*(\d+)/);
      if (pageMatch) {
        this.currentPage = parseInt(pageMatch[1]);
        this.totalPages = parseInt(pageMatch[2]);
      }
    }
    
    console.log(`📍 現在: ${this.currentPage}ページ / 総数: ${this.totalPages}ページ`);
    return { current: this.currentPage, total: this.totalPages };
  }

  // 次のページに移動
  async goToNextPage() {
    const nextButton = document.querySelector('.next-page') ||
                       document.querySelector('[class*="next"]') ||
                       document.querySelector('button[aria-label*="次"]') ||
                       document.querySelector('button:contains("次")');
    
    // ページ番号ボタンを探す
    const pageButtons = document.querySelectorAll('button[class*="page"], .page-number');
    let nextPageButton = null;
    
    pageButtons.forEach(btn => {
      const pageNum = parseInt(btn.textContent);
      if (pageNum === this.currentPage + 1) {
        nextPageButton = btn;
      }
    });
    
    const targetButton = nextButton || nextPageButton;
    
    if (targetButton && !targetButton.disabled) {
      console.log(`📄 ページ${this.currentPage + 1}に移動中...`);
      targetButton.click();
      
      // ページ読み込み待機
      await this.waitForPageLoad();
      return true;
    } else {
      console.log('❌ 次のページボタンが見つからない、または無効');
      return false;
    }
  }

  // ページ読み込み完了を待機
  async waitForPageLoad() {
    console.log('⏳ ページ読み込み待機中...');
    
    // 3秒待機
    await new Promise(r => setTimeout(r, 3000));
    
    // 書籍要素が読み込まれるまで待機
    let attempts = 0;
    while (attempts < 10) {
      const bookElements = document.querySelectorAll('.book-card, [class*="book"]');
      if (bookElements.length > 0) {
        console.log('✅ ページ読み込み完了');
        return;
      }
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
    }
    
    console.log('⚠️ ページ読み込み確認タイムアウト（続行）');
  }
}

// 現在のページの書籍を収集・処理
async function processCurrentPage(pageController) {
  const pageInfo = pageController.getCurrentPageInfo();
  console.log(`\n📖 ページ${pageInfo.current}の処理開始`);
  
  // 現在のページの書籍を収集
  const books = [];
  const images = document.querySelectorAll('img');
  
  images.forEach(img => {
    if (img.alt && img.alt.includes('の表紙')) {
      const bookCard = img.closest('.book-card') || 
                       img.closest('[class*="book"]') ||
                       img.parentElement;
      
      if (bookCard) {
        const titleEl = bookCard.querySelector('.book-title') || 
                        bookCard.querySelector('h3') ||
                        bookCard.querySelector('[class*="title"]') ||
                        bookCard.querySelector('strong');
        
        const authorEl = bookCard.querySelector('.book-author') ||
                         bookCard.querySelector('[class*="author"]');
        
        if (titleEl) {
          const isPlaceholder = img.src.includes('data:image/svg') || 
                               img.src === '' || 
                               !img.src.startsWith('http');
          
          books.push({
            title: titleEl.textContent.replace(/^(タイトル:|本のタイトル:)/, '').trim(),
            author: authorEl ? authorEl.textContent.replace(/^(著者:|作者:)/, '').trim() : '',
            isPlaceholder,
            element: img,
            page: pageInfo.current
          });
        }
      }
    }
  });
  
  const placeholderBooks = books.filter(b => b.isPlaceholder);
  console.log(`📊 ページ${pageInfo.current}: ${books.length}冊中${placeholderBooks.length}冊がプレースホルダー`);
  
  if (placeholderBooks.length === 0) {
    console.log('✅ このページは全て画像表示済み');
    return { success: 0, failure: 0, books: [] };
  }
  
  // バッチ処理実行
  const results = [];
  
  for (const book of placeholderBooks) {
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
        
        // 画像を即座に更新
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
        console.log('❌ 失敗');
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
    
    // API制限対策（短縮）
    await new Promise(r => setTimeout(r, 1000));
  }
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  console.log(`📊 ページ${pageInfo.current}結果: 成功${successCount}冊, 失敗${failureCount}冊`);
  
  return { success: successCount, failure: failureCount, books: results };
}

// 全体の進捗と統計
function displayOverallProgress(totalResults, currentPage, totalPages) {
  const totalSuccess = totalResults.reduce((sum, r) => sum + r.success, 0);
  const totalFailure = totalResults.reduce((sum, r) => sum + r.failure, 0);
  const totalProcessed = totalSuccess + totalFailure;
  
  console.log(`\n📊 全体進捗 (${currentPage}/${totalPages}ページ完了)`);
  console.log(`✅ 成功: ${totalSuccess}冊`);
  console.log(`❌ 失敗: ${totalFailure}冊`);
  console.log(`📈 成功率: ${totalProcessed > 0 ? (totalSuccess/totalProcessed*100).toFixed(1) : 0}%`);
  console.log(`🎯 処理済み: ${totalProcessed}冊`);
}

// メイン自動処理
async function autoProcessAllPages() {
  const pageController = new PageController();
  const totalResults = [];
  
  console.log('🎯 全ページ自動処理開始');
  console.log('⚠️ この処理には約30-60分かかります');
  
  const proceed = confirm('全23ページの自動処理を開始しますか？\n約30-60分かかります。');
  if (!proceed) {
    console.log('❌ キャンセルされました');
    return;
  }
  
  // 現在のページから開始
  pageController.getCurrentPageInfo();
  
  while (pageController.currentPage <= pageController.totalPages) {
    try {
      // 現在のページを処理
      const result = await processCurrentPage(pageController);
      totalResults.push(result);
      
      // 進捗表示
      displayOverallProgress(totalResults, pageController.currentPage, pageController.totalPages);
      
      // 最後のページでない場合、次のページに移動
      if (pageController.currentPage < pageController.totalPages) {
        console.log(`\n⏭️ 次のページに移動...`);
        const moveSuccess = await pageController.goToNextPage();
        
        if (!moveSuccess) {
          console.log('❌ ページ移動に失敗、処理を終了');
          break;
        }
        
        // ページ間の休憩
        console.log('⏸️ ページ間休憩（3秒）...');
        await new Promise(r => setTimeout(r, 3000));
      } else {
        break;
      }
      
    } catch (error) {
      console.error(`💥 ページ${pageController.currentPage}でエラー:`, error);
      
      // エラーでも次のページに進む
      if (pageController.currentPage < pageController.totalPages) {
        await pageController.goToNextPage();
      } else {
        break;
      }
    }
  }
  
  // 最終結果
  console.log('\n🎉 全ページ処理完了！');
  displayOverallProgress(totalResults, pageController.totalPages, pageController.totalPages);
  
  // ソース別統計
  const sourceStats = {};
  totalResults.forEach(result => {
    result.books.filter(b => b.success).forEach(book => {
      sourceStats[book.source] = (sourceStats[book.source] || 0) + 1;
    });
  });
  
  console.log('\n📋 画像ソース別統計:');
  Object.entries(sourceStats).forEach(([source, count]) => {
    console.log(`${source}: ${count}冊`);
  });
  
  return totalResults;
}

// 実行
autoProcessAllPages();