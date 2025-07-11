const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * URLの健全性をチェックする
 */
function checkUrlHealth(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    // HEAD リクエストを送信
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'HEAD',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };

    const req = https.request(options, (res) => {
      const responseTime = Date.now() - startTime;
      resolve({
        url,
        status: res.statusCode,
        responseTime,
        contentType: res.headers['content-type'],
        contentLength: res.headers['content-length'],
        success: res.statusCode >= 200 && res.statusCode < 400
      });
    });

    req.on('error', (error) => {
      resolve({
        url,
        status: 0,
        responseTime: Date.now() - startTime,
        error: error.message,
        success: false
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        status: 0,
        responseTime: Date.now() - startTime,
        error: 'Request timeout',
        success: false
      });
    });

    req.end();
  });
}

/**
 * 表紙画像URLの健全性を一括チェック
 */
async function validateCoverImageUrls() {
  const filePath = path.join(__dirname, 'initialBooks.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 表紙画像URLを抽出
  const coverImageMatches = content.match(/coverImage: 'https:\/\/[^']+'/g);
  
  if (!coverImageMatches) {
    console.log('表紙画像URLが見つかりませんでした。');
    return;
  }
  
  const urls = coverImageMatches.map(match => 
    match.replace('coverImage: \'', '').replace('\'', '')
  );
  
  console.log(`🔍 ${urls.length}個の表紙画像URLの健全性をチェック中...\n`);
  
  const results = [];
  let validCount = 0;
  let invalidCount = 0;
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`[${i + 1}/${urls.length}] チェック中: ${url.substring(0, 50)}...`);
    
    const result = await checkUrlHealth(url);
    results.push(result);
    
    if (result.success) {
      validCount++;
      console.log(`✅ OK (${result.status}) - ${result.responseTime}ms`);
    } else {
      invalidCount++;
      console.log(`❌ NG (${result.status || 'ERROR'}) - ${result.error || 'Unknown error'}`);
    }
    
    // レート制限を避けるため少し待機
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n=== URL健全性チェック結果 ===');
  console.log(`✅ 有効なURL: ${validCount}個`);
  console.log(`❌ 無効なURL: ${invalidCount}個`);
  console.log(`📊 成功率: ${((validCount / urls.length) * 100).toFixed(1)}%`);
  
  // 詳細結果を表示
  console.log('\n=== 詳細結果 ===');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const time = result.responseTime ? `${result.responseTime}ms` : 'N/A';
    const contentType = result.contentType || 'Unknown';
    const size = result.contentLength || 'Unknown';
    
    console.log(`${index + 1}. ${status} ${result.status || 'ERROR'} - ${time} - ${contentType} - ${size} bytes`);
    console.log(`   ${result.url}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  });
  
  // 結果をJSONファイルに保存
  const reportPath = path.join(__dirname, 'url-validation-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    totalUrls: urls.length,
    validUrls: validCount,
    invalidUrls: invalidCount,
    successRate: (validCount / urls.length) * 100,
    results: results
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 詳細結果が ${reportPath} に保存されました`);
  
  // 推奨事項を表示
  console.log('\n=== 推奨事項 ===');
  if (invalidCount > 0) {
    console.log('🚨 無効なURLが検出されました：');
    console.log('   - 無効なURLは削除または代替URLに置き換えてください');
    console.log('   - Google ImagesのキャッシュURLは不安定なため、公式ソースの使用を推奨');
  }
  
  if (validCount > 0) {
    console.log('✅ 有効なURLについて：');
    console.log('   - 定期的な健全性チェックを実施してください');
    console.log('   - 画像の品質と適切なサイズを確認してください');
  }
  
  console.log('\n💡 改善提案：');
  console.log('   - 表紙画像を独自のCDNまたはクラウドストレージに移行');
  console.log('   - ISBN情報を活用した自動画像取得システムの構築');
  console.log('   - フォールバック用のデフォルト画像システムの実装');
  
  return report;
}

// 実行
if (require.main === module) {
  validateCoverImageUrls().catch(console.error);
}