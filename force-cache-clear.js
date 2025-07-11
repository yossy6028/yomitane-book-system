/**
 * 緊急キャッシュクリア - フロントエンド側でJavaScriptから実行
 */

// ブラウザのコンソールで実行するコード
const emergencyCacheClear = () => {
  console.log('🚨 緊急キャッシュクリア開始');
  
  // 1. LocalStorageクリア
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
    console.log('✅ LocalStorage クリア完了');
  }
  
  // 2. SessionStorageクリア  
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
    console.log('✅ SessionStorage クリア完了');
  }
  
  // 3. IndexedDBクリア（可能な範囲で）
  if (typeof indexedDB !== 'undefined') {
    indexedDB.databases().then(databases => {
      databases.forEach(db => {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      });
      console.log('✅ IndexedDB クリア完了');
    }).catch(err => console.log('IndexedDB クリア一部失敗:', err));
  }
  
  // 4. Service Workerキャッシュクリア
  if ('serviceWorker' in navigator && 'caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
      });
      console.log('✅ Service Worker キャッシュクリア完了');
    });
  }
  
  // 5. メモリ内キャッシュクリア（React関連）
  if (window.location.reload) {
    console.log('🔄 5秒後にページを強制リロードします...');
    setTimeout(() => {
      window.location.reload(true);
    }, 5000);
  }
};

console.log('🚨 緊急キャッシュクリア実行');
console.log('以下をブラウザのコンソール（F12）で実行してください：');
console.log('emergencyCacheClear()');
console.log('');
console.log('または、単純にCtrl+Shift+Rで強制リロードしてください');

// 自動実行版
if (typeof window !== 'undefined') {
  window.emergencyCacheClear = emergencyCacheClear;
  console.log('✅ window.emergencyCacheClear() 関数を追加しました');
}

module.exports = { emergencyCacheClear };