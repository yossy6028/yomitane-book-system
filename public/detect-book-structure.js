/**
 * 書籍要素の構造を詳細検出
 */

console.log('🔍 書籍要素の構造検出開始');

function detectBookStructure() {
  console.log('\n=== DOM構造の詳細分析 ===');
  
  // 全てのdiv要素をチェック
  const allDivs = document.querySelectorAll('div');
  console.log(`総div数: ${allDivs.length}`);
  
  // 画像要素をチェック
  const allImages = document.querySelectorAll('img');
  console.log(`総画像数: ${allImages.length}`);
  
  // 画像要素の詳細
  console.log('\n=== 全画像要素の詳細 ===');
  allImages.forEach((img, i) => {
    console.log(`${i + 1}. src: "${img.src.substring(0, 100)}"`);
    console.log(`   alt: "${img.alt}"`);
    console.log(`   class: "${img.className}"`);
    console.log(`   parent: ${img.parentElement?.tagName} (class: "${img.parentElement?.className}")`);
    console.log('');
  });
  
  // クラス名を含む要素を検索
  console.log('\n=== 書籍関連要素の検索 ===');
  const bookSelectors = [
    '[class*="book"]',
    '[class*="Book"]',
    '[class*="card"]',
    '[class*="Card"]',
    '[class*="item"]',
    '[class*="Item"]',
    '.book-card',
    '.BookCard',
    '.book',
    '.Book'
  ];
  
  bookSelectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`✅ ${selector}: ${elements.length}個`);
        elements.forEach((el, i) => {
          if (i < 3) { // 最初の3個だけ表示
            console.log(`   ${i + 1}. ${el.tagName} - class: "${el.className}"`);
            console.log(`      内容: "${el.textContent?.substring(0, 100)}..."`);
          }
        });
      }
    } catch (e) {
      // セレクタエラーをスキップ
    }
  });
  
  // テキスト内容から書籍を探す
  console.log('\n=== テキスト内容から書籍検索 ===');
  const textNodes = document.evaluate(
    "//text()[contains(., 'かいけつゾロリ') or contains(., 'ハリー') or contains(., 'タイトル') or contains(., '著者')]",
    document,
    null,
    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  
  console.log(`書籍関連テキストノード: ${textNodes.snapshotLength}個`);
  for (let i = 0; i < Math.min(textNodes.snapshotLength, 10); i++) {
    const node = textNodes.snapshotItem(i);
    console.log(`${i + 1}. "${node.textContent.trim()}"`);
    console.log(`   親要素: ${node.parentElement?.tagName} (class: "${node.parentElement?.className}")`);
  }
  
  // h1, h2, h3 などの見出し要素をチェック
  console.log('\n=== 見出し要素の確認 ===');
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
    const elements = document.querySelectorAll(tag);
    if (elements.length > 0) {
      console.log(`${tag}: ${elements.length}個`);
      elements.forEach((el, i) => {
        if (i < 5) {
          console.log(`   ${i + 1}. "${el.textContent.trim()}" (class: "${el.className}")`);
        }
      });
    }
  });
  
  // strong, span, p タグもチェック
  console.log('\n=== その他の要素確認 ===');
  ['strong', 'span', 'p', 'li'].forEach(tag => {
    const elements = document.querySelectorAll(tag);
    const bookRelated = Array.from(elements).filter(el => 
      el.textContent.includes('タイトル') || 
      el.textContent.includes('著者') ||
      el.textContent.includes('かいけつゾロリ') ||
      el.textContent.includes('ハリー')
    );
    
    if (bookRelated.length > 0) {
      console.log(`${tag} (書籍関連): ${bookRelated.length}個`);
      bookRelated.slice(0, 5).forEach((el, i) => {
        console.log(`   ${i + 1}. "${el.textContent.trim().substring(0, 50)}..." (class: "${el.className}")`);
      });
    }
  });
}

// React コンポーネントの検出
function detectReactComponents() {
  console.log('\n=== React要素の検出 ===');
  
  // React要素を探す
  const reactElements = document.querySelectorAll('[data-reactroot], [data-react-helmet]');
  console.log(`React root要素: ${reactElements.length}個`);
  
  // React DevToolsがある場合
  if (window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('✅ React環境検出');
  }
  
  // 仮想DOM内容の推測
  const rootDiv = document.getElementById('root');
  if (rootDiv) {
    console.log(`Root要素内容: ${rootDiv.children.length}個の子要素`);
    Array.from(rootDiv.children).forEach((child, i) => {
      console.log(`   ${i + 1}. ${child.tagName} (class: "${child.className}")`);
    });
  }
}

// カスタム書籍検出関数
function findBooksWithCustomLogic() {
  console.log('\n=== カスタム書籍検出 ===');
  
  const allElements = document.querySelectorAll('*');
  const bookElements = [];
  
  allElements.forEach(el => {
    const text = el.textContent || '';
    const hasBookKeywords = text.includes('かいけつゾロリ') || 
                           text.includes('ハリー') || 
                           text.includes('タイトル:') ||
                           text.includes('著者:');
    
    const hasImage = el.querySelector('img');
    
    if (hasBookKeywords && hasImage) {
      bookElements.push({
        element: el,
        tag: el.tagName,
        class: el.className,
        text: text.substring(0, 100) + '...',
        hasImage: !!hasImage
      });
    }
  });
  
  console.log(`カスタム検出書籍要素: ${bookElements.length}個`);
  bookElements.slice(0, 10).forEach((item, i) => {
    console.log(`${i + 1}. ${item.tag} (class: "${item.class}")`);
    console.log(`   テキスト: "${item.text}"`);
  });
  
  return bookElements;
}

// 実行
function main() {
  detectBookStructure();
  detectReactComponents();
  const customBooks = findBooksWithCustomLogic();
  
  console.log('\n💡 次のステップ:');
  console.log('上記の情報を基に、正しいセレクタを特定して修正スクリプトを更新します');
  
  return { customBooks };
}

// グローバル関数として登録
window.detectBookStructure = detectBookStructure;
window.detectReactComponents = detectReactComponents;
window.findBooksWithCustomLogic = findBooksWithCustomLogic;

main();