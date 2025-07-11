/**
 * 緊急デバッグユーティリティ
 * ブラウザコンソールで実行可能な診断ツール
 */

// ブラウザコンソールで実行するデバッグ関数
declare global {
  interface Window {
    emergencyDebug: () => void;
    clearAllImageCaches: () => void;
    testSpecificBook: (title: string) => void;
  }
}

// 緊急デバッグ関数
window.emergencyDebug = () => {
  console.group('🚨 緊急表紙画像デバッグ');
  
  console.log('📊 現在のページ情報:');
  console.log('URL:', window.location.href);
  console.log('タイムスタンプ:', new Date().toLocaleString());
  
  console.log('\n📋 LocalStorage内容:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('image') || key.includes('cover') || key.includes('cache'))) {
      const value = localStorage.getItem(key);
      console.log(`${key}:`, value?.substring(0, 100) + '...');
    }
  }
  
  console.log('\n🖼️ 現在表示されている画像要素:');
  const images = document.querySelectorAll('img');
  images.forEach((img, index) => {
    const src = img.src;
    const alt = img.alt;
    console.log(`${index + 1}. ${alt}: ${src}`);
  });
  
  console.log('\n📚 プレースホルダー要素:');
  const placeholders = document.querySelectorAll('[class*="placeholder"], [class*="cover"]');
  placeholders.forEach((el, index) => {
    console.log(`${index + 1}.`, el.textContent?.trim(), el.className);
  });
  
  console.groupEnd();
};

// 全キャッシュクリア関数
window.clearAllImageCaches = () => {
  console.log('🧹 全画像キャッシュクリア開始...');
  
  // LocalStorage クリア
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('image') || key.includes('cover') || key.includes('cache'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`削除: ${key}`);
  });
  
  // SessionStorage クリア
  sessionStorage.clear();
  
  console.log(`✅ ${keysToRemove.length}個のキャッシュエントリを削除しました`);
  console.log('🔄 ページをリロードしてください');
};

// 特定書籍のテスト関数
window.testSpecificBook = (title: string) => {
  console.group(`🔍 書籍テスト: "${title}"`);
  
  // この書籍に関連する要素を検索
  const bookElements = document.querySelectorAll(`[alt*="${title}"], [title*="${title}"]`);
  console.log(`見つかった要素数: ${bookElements.length}`);
  
  bookElements.forEach((el, index) => {
    console.log(`要素 ${index + 1}:`, el);
    
    if (el instanceof HTMLImageElement) {
      console.log(`  画像URL: ${el.src}`);
      console.log(`  ALT: ${el.alt}`);
    }
  });
  
  // LocalStorageで関連キャッシュを検索
  console.log('\n関連キャッシュ:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes(title)) {
      const value = localStorage.getItem(key);
      console.log(`${key}:`, value?.substring(0, 100) + '...');
    }
  }
  
  console.groupEnd();
};

console.log('🔧 緊急デバッグツールが読み込まれました。');
console.log('使用方法:');
console.log('  emergencyDebug() - 全体状況を調査');
console.log('  clearAllImageCaches() - 全キャッシュクリア');
console.log('  testSpecificBook("書籍名") - 特定書籍の調査');

export {};