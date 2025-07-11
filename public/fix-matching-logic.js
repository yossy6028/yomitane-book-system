// マッチングロジックの根本的修正案

console.log('🔧 マッチングロジックの問題分析と修正案');

// 現在の問題点を整理
function analyzeCurrentProblems() {
  console.log('\n=== 現在の問題点 ===');
  console.log('1. Google Books APIが正確なタイトルでヒットしない');
  console.log('   例: "5年3組リョウタ組" → "約束"、"トロワ"など全く別の本');
  console.log('2. タイトル類似度0%でも検索結果として返される');
  console.log('3. 85%の閾値により、多くの本が却下される');
  console.log('4. 結果: 大量のプレースホルダー表示');
}

// 修正案1: タイトル類似度が低い場合は即座に却下
function proposeSolution1() {
  console.log('\n📌 修正案1: タイトル類似度による早期却下');
  console.log('if (titleSimilarity < 0.5) {');
  console.log('  continue; // この結果は採用しない');
  console.log('}');
  console.log('→ タイトルが50%以上一致しない場合は、他の条件に関わらず却下');
}

// 修正案2: 検索クエリの改善
function proposeSolution2() {
  console.log('\n📌 修正案2: 検索クエリの最適化');
  console.log('現在: "タイトル" "著者"');
  console.log('改善案:');
  console.log('1. intitle:"タイトル" inauthor:"著者"');
  console.log('2. タイトルの一部だけで検索（副題を除く）');
  console.log('3. 出版社情報も含める');
}

// 修正案3: フォールバック戦略の改善
function proposeSolution3() {
  console.log('\n📌 修正案3: より積極的なフォールバック');
  console.log('1. Google Books APIで見つからない → Open Library');
  console.log('2. Open Libraryで見つからない → 国会図書館API');
  console.log('3. それでもダメ → Playwrightでスクレイピング');
  console.log('4. 最終手段 → 美しいプレースホルダー（書籍情報入り）');
}

// 即座に試せる一時的な修正
function quickFix() {
  console.log('\n🚀 即座に試せる修正');
  
  console.log('// コンソールで実行:');
  console.log(`
// 閾値を一時的に下げる
if (window.imageService && window.imageService.performMultiLayerVerification) {
  const original = window.imageService.performMultiLayerVerification;
  window.imageService.performMultiLayerVerification = function(book, volumeInfo) {
    const result = original.call(this, book, volumeInfo);
    // タイトル類似度が50%以上なら採用
    if (result.titleSimilarity >= 0.5) {
      result.isHighConfidenceMatch = true;
    }
    return result;
  };
  console.log('✅ マッチング条件を緩和しました');
}
  `);
}

// 根本的な解決策
function fundamentalSolution() {
  console.log('\n🎯 根本的な解決策');
  console.log('1. 書籍データベースの見直し');
  console.log('   - 存在しない/検索できない書籍の除外');
  console.log('   - より検索しやすいタイトルに修正');
  console.log('2. 複数APIの並列使用');
  console.log('   - 1つのAPIに依存しない');
  console.log('3. 事前に画像URLを収集してデータベース化');
  console.log('   - リアルタイム検索を避ける');
}

// メイン実行
analyzeCurrentProblems();
proposeSolution1();
proposeSolution2();
proposeSolution3();
quickFix();
fundamentalSolution();

console.log('\n📋 結論:');
console.log('マッチング基準の調整では限界がある。');
console.log('Google Books APIで見つからない書籍が多すぎる。');
console.log('複数の画像ソースを活用する必要がある。');