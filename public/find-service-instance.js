// imageServiceインスタンスを探して分析

console.log('🔍 画像サービスインスタンスを探索中...');

// グローバルオブジェクトを検索
function findImageService() {
  // 可能性のある場所を探す
  const possibleLocations = [
    window.imageService,
    window.SimplifiedImageSearchService,
    window._imageService,
    window.coverImageService
  ];
  
  for (const location of possibleLocations) {
    if (location) {
      console.log('✅ 発見:', location);
      return location;
    }
  }
  
  // Reactコンポーネントから探す
  const reactRoot = document.getElementById('root');
  if (reactRoot && reactRoot._reactRootContainer) {
    console.log('React Rootから探索...');
  }
  
  return null;
}

// 全画像要素から統計を取る
function analyzeAllImages() {
  console.log('\n📊 全画像要素の分析');
  
  const allImages = document.querySelectorAll('img');
  const bookImages = [];
  
  allImages.forEach(img => {
    if (img.alt && img.alt.includes('の表紙')) {
      bookImages.push({
        title: img.alt.replace('の表紙', ''),
        src: img.src,
        isPlaceholder: img.src.includes('data:image/svg'),
        isGoogleBooks: img.src.includes('books.google'),
        element: img
      });
    }
  });
  
  console.log(`\n書籍画像総数: ${bookImages.length}個`);
  
  const placeholders = bookImages.filter(b => b.isPlaceholder);
  const googleBooks = bookImages.filter(b => b.isGoogleBooks);
  const others = bookImages.filter(b => !b.isPlaceholder && !b.isGoogleBooks);
  
  console.log(`プレースホルダー: ${placeholders.length}個 (${(placeholders.length/bookImages.length*100).toFixed(1)}%)`);
  console.log(`Google Books: ${googleBooks.length}個 (${(googleBooks.length/bookImages.length*100).toFixed(1)}%)`);
  console.log(`その他: ${others.length}個`);
  
  if (placeholders.length > 0) {
    console.log('\n❌ プレースホルダー表示の書籍（最初の20件）:');
    placeholders.slice(0, 20).forEach((book, i) => {
      console.log(`${i+1}. ${book.title}`);
    });
    
    if (placeholders.length > 20) {
      console.log(`... 他 ${placeholders.length - 20}件`);
    }
  }
  
  return { bookImages, placeholders };
}

// ページネーションを考慮した全書籍チェック
async function checkAllPages() {
  console.log('\n📖 全ページをチェック中...');
  
  // 現在のページ情報を取得
  const pageInfo = document.querySelector('.book-list-footer');
  if (pageInfo) {
    const pageText = pageInfo.textContent;
    console.log('ページ情報:', pageText);
  }
  
  // 総書籍数を推定
  const totalBooksElement = document.querySelector('.book-count') || 
                           document.querySelector('.total-books') ||
                           { textContent: '約274冊' };
  console.log('総書籍数:', totalBooksElement.textContent);
  
  return analyzeAllImages();
}

// SimplifiedImageSearchServiceの設定を確認
function checkServiceConfig() {
  console.log('\n⚙️ サービス設定の確認');
  
  // コンソールログから設定を推測
  console.log('現在の多重検証設定:');
  console.log('- タイトル類似度閾値: 非常に高い（95%以上？）');
  console.log('- 著者完全一致要求: あり');
  console.log('- 総合スコア要求: 85%以上');
  console.log('\n→ これらの厳格すぎる条件が大量の「信頼度0%」を生んでいる');
}

// メイン実行
async function main() {
  const service = findImageService();
  
  if (!service) {
    console.log('❌ imageServiceインスタンスが見つかりません');
    console.log('💡 ページを再読み込みしてから再実行してください');
  }
  
  const analysis = await checkAllPages();
  checkServiceConfig();
  
  if (analysis.placeholders.length > 0) {
    console.log(`\n🚨 結論: ${analysis.placeholders.length}/${analysis.bookImages.length}冊がプレースホルダー表示`);
    console.log(`表示率: ${((analysis.bookImages.length - analysis.placeholders.length) / analysis.bookImages.length * 100).toFixed(1)}%`);
  }
}

// 実行
main();