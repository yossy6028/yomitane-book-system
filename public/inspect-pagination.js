// ページネーション要素の詳細調査

console.log('🔍 ページネーション要素の調査');

function inspectPagination() {
  console.log('\n=== ページネーション要素の検索 ===');
  
  // 様々なセレクタでページネーション要素を探す
  const selectors = [
    '.pagination',
    '.page-navigation',
    '.book-list-footer',
    '[class*="page"]',
    '[class*="Page"]',
    '[class*="pagination"]',
    '[class*="Pagination"]',
    'nav',
    '.MuiPagination-root',
    '.ant-pagination',
    'button[aria-label*="次"]',
    'button[aria-label*="前"]',
    'button:contains("次")',
    'button:contains("前")'
  ];
  
  selectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`✅ ${selector}: ${elements.length}個見つかりました`);
        elements.forEach((el, i) => {
          console.log(`   ${i + 1}. ${el.tagName} - class: "${el.className}" - text: "${el.textContent?.substring(0, 50)}"`);
        });
      }
    } catch (e) {
      // contains などは標準セレクタではないのでエラーになる場合がある
    }
  });
  
  // 全てのボタン要素を調査
  console.log('\n=== 全ボタン要素の調査 ===');
  const allButtons = document.querySelectorAll('button');
  console.log(`総ボタン数: ${allButtons.length}`);
  
  const pageRelatedButtons = [];
  allButtons.forEach((btn, i) => {
    const text = btn.textContent?.toLowerCase() || '';
    const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
    const className = btn.className.toLowerCase();
    
    if (text.includes('次') || text.includes('前') || text.includes('page') ||
        ariaLabel.includes('次') || ariaLabel.includes('前') || ariaLabel.includes('page') ||
        className.includes('page') || className.includes('pagination') ||
        /^\d+$/.test(text.trim())) {
      
      pageRelatedButtons.push({
        index: i,
        text: text.substring(0, 20),
        ariaLabel,
        className,
        disabled: btn.disabled,
        element: btn
      });
    }
  });
  
  console.log('\n📄 ページ関連ボタン:');
  pageRelatedButtons.forEach((btn, i) => {
    console.log(`${i + 1}. "${btn.text}" - class: "${btn.className}" - disabled: ${btn.disabled}`);
  });
  
  // 数字ボタンを探す
  console.log('\n🔢 数字ボタン:');
  allButtons.forEach((btn, i) => {
    const text = btn.textContent?.trim();
    if (/^\d+$/.test(text)) {
      console.log(`数字 ${text}: disabled=${btn.disabled}, class="${btn.className}"`);
    }
  });
  
  // フッター要素を詳しく調査
  console.log('\n👟 フッター要素の調査:');
  const footers = document.querySelectorAll('footer, [class*="footer"], [class*="Footer"]');
  footers.forEach((footer, i) => {
    console.log(`${i + 1}. ${footer.tagName} - class: "${footer.className}"`);
    console.log(`   内容: "${footer.textContent?.substring(0, 100)}"`);
  });
  
  return pageRelatedButtons;
}

// 手動でページ移動をテスト
function testPageNavigation(pageButtons) {
  console.log('\n🧪 ページ移動テスト');
  
  if (pageButtons.length === 0) {
    console.log('❌ ページ関連ボタンが見つかりません');
    return;
  }
  
  console.log('見つかったページボタン:');
  pageButtons.forEach((btn, i) => {
    console.log(`${i + 1}. "${btn.text}" (${btn.disabled ? '無効' : '有効'})`);
  });
  
  // 数字の2を探す
  const page2Button = pageButtons.find(btn => btn.text.trim() === '2' && !btn.disabled);
  if (page2Button) {
    console.log('✅ ページ2ボタンを発見:', page2Button);
    console.log('💡 手動テスト用: page2Button.element.click() でページ2に移動できます');
    
    // グローバルに保存してテスト可能にする
    window.testPage2Button = page2Button.element;
    
    return page2Button.element;
  } else {
    console.log('❌ ページ2ボタンが見つからない');
  }
}

// 実行
const pageButtons = inspectPagination();
const page2Button = testPageNavigation(pageButtons);

if (page2Button) {
  console.log('\n🎯 次のステップ:');
  console.log('1. window.testPage2Button.click() でページ2に移動');
  console.log('2. 移動確認後、正しいセレクタで自動処理を修正');
} else {
  console.log('\n💡 代替案:');
  console.log('1. 手動でページ2に移動');
  console.log('2. 各ページで個別に処理スクリプトを実行');
}