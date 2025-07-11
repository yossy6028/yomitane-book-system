// 根本原因調査をブラウザコンソールで簡単に実行するためのスクリプト

console.log('📋 根本原因調査実行スクリプト');

// investigate-root-cause.js の内容を直接実行
(async function() {
  try {
    // スクリプトをfetchで読み込む
    const response = await fetch('/investigate-root-cause.js');
    const scriptText = await response.text();
    
    // evalで実行（開発環境のみ）
    eval(scriptText);
    
    console.log('✅ 調査スクリプト読み込み完了');
    console.log('📌 以下のコマンドで調査を開始してください:');
    console.log('investigateRootCause()');
    
  } catch (error) {
    console.error('❌ スクリプト読み込みエラー:', error);
    console.log('💡 代替方法: 以下のURLを新しいタブで開いてください');
    console.log('http://localhost:3000/investigate-root-cause.js');
  }
})();

// 表示率分析も同様に読み込む
(async function() {
  try {
    const response = await fetch('/analyze-display-rate.js');
    const scriptText = await response.text();
    eval(scriptText);
    
    console.log('✅ 表示率分析スクリプトも読み込み完了');
    console.log('📌 表示率分析: runDisplayAnalysis()');
    
  } catch (error) {
    console.error('❌ 表示率分析スクリプト読み込みエラー:', error);
  }
})();