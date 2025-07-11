/**
 * 即座に画像を修正するスクリプト
 * Google Books APIを直接呼び出して画像を取得・表示
 */

console.log('🚀 即座に画像修正開始');

// 直接Google Books APIで画像を取得する関数
async function getBookImageDirect(title, author) {
  const queries = [
    `${title} ${author}`,
    `"${title}" "${author}"`,
    title,
    `${title} 児童書`,
    `${title} 絵本`
  ];
  
  for (const query of queries) {
    try {
      console.log(`🔍 検索中: ${query}`);
      
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.items?.length) {
          for (const item of data.items) {
            const info = item.volumeInfo;
            if (info.imageLinks?.thumbnail) {
              // 簡単な関連性チェック
              const titleMatch = info.title.toLowerCase().includes(title.toLowerCase()) || 
                                title.toLowerCase().includes(info.title.toLowerCase());
              const authorMatch = info.authors?.some(a => 
                a.toLowerCase().includes(author.toLowerCase()) ||
                author.toLowerCase().includes(a.toLowerCase())
              );
              
              if (titleMatch || authorMatch) {
                return info.imageLinks.thumbnail.replace('http:', 'https:');
              }
            }
          }
          
          // 関連性チェックで見つからない場合、最初の画像付き結果を使用
          for (const item of data.items) {
            if (item.volumeInfo.imageLinks?.thumbnail) {
              return item.volumeInfo.imageLinks.thumbnail.replace('http:', 'https:');
            }
          }
        }
      }
    } catch (error) {
      console.error(`エラー for "${query}":`, error);
    }
    
    await new Promise(r => setTimeout(r, 200)); // レート制限
  }
  
  return null;
}

// 現在のページの全書籍を修正
async function fixAllBooksOnPage() {
  console.log('📚 現在のページの全書籍を修正中...');
  
  const bookCards = document.querySelectorAll('.book-card, [class*="book"]');
  console.log(`検出された書籍カード: ${bookCards.length}個`);
  
  let fixedCount = 0;
  let totalCount = 0;
  
  for (const card of bookCards) {
    const titleEl = card.querySelector('.book-title') || 
                   card.querySelector('h3') ||
                   card.querySelector('[class*="title"]') ||
                   card.querySelector('strong');
    
    const authorEl = card.querySelector('.book-author') ||
                    card.querySelector('[class*="author"]');
    
    const imageEl = card.querySelector('img');
    
    if (titleEl && imageEl) {
      const title = titleEl.textContent.replace(/^(タイトル:|本のタイトル:)/, '').trim();
      const author = authorEl ? authorEl.textContent.replace(/^(著者:|作者:)/, '').trim() : '';
      
      // プレースホルダー画像の場合のみ修正
      const isPlaceholder = imageEl.src.includes('data:image/svg') || 
                           imageEl.src === '' || 
                           !imageEl.src.startsWith('http');
      
      if (isPlaceholder) {
        totalCount++;
        console.log(`\n📖 [${totalCount}] "${title}" by ${author}`);
        
        const imageUrl = await getBookImageDirect(title, author);
        
        if (imageUrl) {
          imageEl.src = imageUrl;
          fixedCount++;
          console.log(`✅ 修正成功: ${imageUrl.substring(0, 50)}...`);
        } else {
          console.log('❌ 画像見つからず');
        }
        
        // レート制限のため少し待機
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  
  console.log(`\n🎉 修正完了: ${fixedCount}/${totalCount}冊修正`);
  return { fixedCount, totalCount };
}

// 特定の書籍のみ修正
async function fixSpecificBook(title, author) {
  console.log(`🎯 特定書籍修正: "${title}" by ${author}`);
  
  const imageUrl = await getBookImageDirect(title, author);
  
  if (imageUrl) {
    // ページ上の該当する画像要素を探して更新
    const bookCards = document.querySelectorAll('.book-card, [class*="book"]');
    
    for (const card of bookCards) {
      const titleEl = card.querySelector('.book-title') || 
                     card.querySelector('h3') ||
                     card.querySelector('[class*="title"]') ||
                     card.querySelector('strong');
      
      if (titleEl && titleEl.textContent.includes(title)) {
        const imageEl = card.querySelector('img');
        if (imageEl) {
          imageEl.src = imageUrl;
          console.log(`✅ 画像更新: ${imageUrl}`);
          return imageUrl;
        }
      }
    }
  }
  
  console.log('❌ 修正失敗');
  return null;
}

// ページごとに順次修正（ページネーション対応）
async function fixAllPagesSequentially() {
  console.log('📄 全ページ順次修正開始');
  
  let currentPage = 1;
  let totalFixed = 0;
  
  while (true) {
    console.log(`\n📄 ページ${currentPage}の処理中...`);
    
    const result = await fixAllBooksOnPage();
    totalFixed += result.fixedCount;
    
    console.log(`ページ${currentPage}完了: ${result.fixedCount}/${result.totalCount}冊修正`);
    
    // 次のページボタンを探す
    const nextButton = document.querySelector('.next-page') ||
                       document.querySelector('[class*="next"]') ||
                       document.querySelector('button[aria-label*="次"]');
    
    const pageButtons = document.querySelectorAll('button[class*="page"], .page-number');
    let nextPageButton = null;
    
    pageButtons.forEach(btn => {
      const pageNum = parseInt(btn.textContent);
      if (pageNum === currentPage + 1) {
        nextPageButton = btn;
      }
    });
    
    const targetButton = nextButton || nextPageButton;
    
    if (targetButton && !targetButton.disabled) {
      console.log(`➡️ ページ${currentPage + 1}に移動...`);
      targetButton.click();
      
      // ページ読み込み待機
      await new Promise(r => setTimeout(r, 3000));
      currentPage++;
    } else {
      console.log('📄 全ページ処理完了');
      break;
    }
  }
  
  console.log(`\n🎉 全体修正完了: 総計${totalFixed}冊修正`);
  return totalFixed;
}

// グローバル関数として登録
window.fixAllBooksOnPage = fixAllBooksOnPage;
window.fixSpecificBook = fixSpecificBook;
window.fixAllPagesSequentially = fixAllPagesSequentially;
window.getBookImageDirect = getBookImageDirect;

console.log('\n💡 利用可能な関数:');
console.log('1. fixAllBooksOnPage() - 現在のページの全書籍修正');
console.log('2. fixSpecificBook("タイトル", "著者") - 特定書籍修正');
console.log('3. fixAllPagesSequentially() - 全ページ順次修正');
console.log('4. getBookImageDirect("タイトル", "著者") - 画像URL取得のみ');

// 自動実行（5秒後に現在のページを修正）
setTimeout(() => {
  console.log('\n🚀 5秒後に現在のページの自動修正を開始します...');
  console.log('キャンセルする場合は: clearTimeout で停止してください');
  
  setTimeout(() => {
    fixAllBooksOnPage();
  }, 5000);
}, 1000);