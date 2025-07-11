const { exec } = require('child_process');
const path = require('path');

// TypeScriptファイルを直接実行
const tsFile = path.join(__dirname, 'coverImageChecker.ts');

console.log('書籍データベースの表紙画像整合性チェックを実行中...\n');

exec(`npx ts-node "${tsFile}"`, (error, stdout, stderr) => {
  if (error) {
    console.error('実行エラー:', error);
    // ts-nodeが使えない場合は、TypeScriptの内容を直接分析
    fallbackAnalysis();
    return;
  }
  
  if (stderr) {
    console.error('警告:', stderr);
  }
  
  console.log(stdout);
});

function fallbackAnalysis() {
  console.log('TypeScript実行環境が利用できないため、簡易チェックを実行します...\n');
  
  // シンプルなファイル解析を実行
  const fs = require('fs');
  const filePath = path.join(__dirname, 'initialBooks.ts');
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 基本的な統計情報を抽出
    const idMatches = content.match(/id: '[^']+'/g);
    const coverImageMatches = content.match(/coverImage: 'https:\/\/[^']+'/g);
    const emptyCoverImageMatches = content.match(/coverImage: ''/g);
    
    const totalBooks = idMatches ? idMatches.length : 0;
    const booksWithCoverImage = coverImageMatches ? coverImageMatches.length : 0;
    const booksWithoutCoverImage = emptyCoverImageMatches ? emptyCoverImageMatches.length : 0;
    
    console.log('=== 簡易チェック結果 ===');
    console.log(`総書籍数: ${totalBooks}冊`);
    console.log(`表紙画像設定済み: ${booksWithCoverImage}冊 (${((booksWithCoverImage / totalBooks) * 100).toFixed(1)}%)`);
    console.log(`表紙画像未設定: ${booksWithoutCoverImage}冊 (${((booksWithoutCoverImage / totalBooks) * 100).toFixed(1)}%)`);
    
    // URLパターンの分析
    if (coverImageMatches) {
      const googleImages = coverImageMatches.filter(match => match.includes('gstatic.com')).length;
      const amazonImages = coverImageMatches.filter(match => match.includes('amazon')).length;
      const otherSources = booksWithCoverImage - googleImages - amazonImages;
      
      console.log('\n=== URLパターン分析 ===');
      console.log(`Google画像: ${googleImages}冊`);
      console.log(`Amazon画像: ${amazonImages}冊`);
      console.log(`その他のソース: ${otherSources}冊`);
      
      console.log('\n=== 設定済みURL一覧 ===');
      coverImageMatches.forEach((match, index) => {
        const url = match.replace('coverImage: \'', '').replace('\'', '');
        const urlType = url.includes('gstatic.com') ? 'Google' : url.includes('amazon') ? 'Amazon' : 'Other';
        console.log(`${index + 1}. [${urlType}] ${url}`);
      });
    }
    
    console.log('\n=== 推奨アクション ===');
    console.log('1. 表紙画像が未設定の書籍が多数存在します');
    console.log('2. Google画像のキャッシュURLは将来的にリンク切れする可能性があります');
    console.log('3. ISBN情報を活用した自動画像取得システムの構築を検討してください');
    console.log('4. 定期的なリンク切れチェックシステムの導入を推奨します');
    
  } catch (err) {
    console.error('ファイル読み込みエラー:', err);
  }
}