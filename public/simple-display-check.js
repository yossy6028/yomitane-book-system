// シンプルな表示率チェック

console.log('📊 現在の表示状況をシンプルに分析');

function checkCurrentDisplay() {
  // 全ての画像要素を取得
  const allImages = document.querySelectorAll('img');
  console.log(`\n画像要素総数: ${allImages.length}`);
  
  let stats = {
    total: 0,
    realImages: 0,
    placeholders: 0,
    broken: 0,
    books: []
  };
  
  // 書籍関連の画像のみをチェック
  allImages.forEach((img, index) => {
    // alt属性に「の表紙」が含まれるものが書籍画像
    if (img.alt && img.alt.includes('の表紙')) {
      stats.total++;
      
      const bookTitle = img.alt.replace('の表紙', '');
      const src = img.src || '';
      
      let status = '';
      if (src.includes('data:image/svg')) {
        stats.placeholders++;
        status = '❌ プレースホルダー';
      } else if (src.includes('books.google') || src.includes('googleapis')) {
        stats.realImages++;
        status = '✅ Google Books画像';
      } else if (src.startsWith('http')) {
        stats.realImages++;
        status = '✅ 外部画像';
      } else {
        stats.broken++;
        status = '💥 不明/エラー';
      }
      
      stats.books.push({
        title: bookTitle,
        status: status,
        src: src.substring(0, 50) + '...'
      });
    }
  });
  
  // 統計表示
  console.log('\n=== 表示統計 ===');
  console.log(`書籍総数: ${stats.total}冊`);
  console.log(`実画像: ${stats.realImages}冊 (${(stats.realImages/stats.total*100).toFixed(1)}%)`);
  console.log(`プレースホルダー: ${stats.placeholders}冊 (${(stats.placeholders/stats.total*100).toFixed(1)}%)`);
  console.log(`エラー/不明: ${stats.broken}冊`);
  
  // 表示されていない本の例（最初の10冊）
  console.log('\n=== 表示されていない本の例 ===');
  const noImageBooks = stats.books.filter(b => b.status.includes('プレースホルダー'));
  noImageBooks.slice(0, 10).forEach((book, i) => {
    console.log(`${i+1}. ${book.title}`);
  });
  
  // 実際に表示されている本の例
  console.log('\n=== 実際に表示されている本の例 ===');
  const hasImageBooks = stats.books.filter(b => b.status.includes('✅'));
  hasImageBooks.slice(0, 10).forEach((book, i) => {
    console.log(`${i+1}. ${book.title} - ${book.status}`);
  });
  
  return stats;
}

// 特定の問題書籍をチェック
function checkProblemBooks() {
  console.log('\n\n=== 問題のある書籍の詳細チェック ===');
  
  const problemTitles = [
    'トムソーヤの冒険',
    'ごんぎつね', 
    '風の又三郎',
    '森は生きている',
    'やさいだいすき',
    '注文の多い料理店'
  ];
  
  problemTitles.forEach(title => {
    // 画像を探す
    const img = document.querySelector(`img[alt="${title}の表紙"]`);
    if (img) {
      console.log(`\n📖 「${title}」`);
      console.log(`   src: ${img.src}`);
      console.log(`   表示状態: ${img.complete ? '読み込み完了' : '読み込み中/エラー'}`);
      console.log(`   サイズ: ${img.naturalWidth}x${img.naturalHeight}`);
    } else {
      console.log(`\n❌ 「${title}」の画像要素が見つかりません`);
    }
  });
}

// 実行
const results = checkCurrentDisplay();
checkProblemBooks();

console.log('\n💡 次のステップ:');
console.log('1. プレースホルダーが多い原因を特定');
console.log('2. 誤った画像が表示される原因を調査');
console.log('3. 根本的な解決策を検討');