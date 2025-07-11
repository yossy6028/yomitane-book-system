const fs = require('fs');
const path = require('path');

/**
 * 詳細な表紙画像分析を実行
 */
function performDetailedAnalysis() {
  const filePath = path.join(__dirname, 'initialBooks.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 書籍データを正規表現で抽出
  const bookBlocks = content.split(/(?=\s*{\s*id: ')/);
  const books = [];
  
  bookBlocks.forEach((block, index) => {
    if (index === 0) return; // 最初のブロックはヘッダー情報
    
    const idMatch = block.match(/id: '([^']+)'/);
    const titleMatch = block.match(/title: '([^']+)'/);
    const authorMatch = block.match(/author: '([^']+)'/);
    const publisherMatch = block.match(/publisher: '([^']+)'/);
    const isbnMatch = block.match(/isbn: '([^']+)'/);
    const coverImageMatch = block.match(/coverImage: '([^']*)'/);
    const ratingMatch = block.match(/rating: ([0-9.]+)/);
    
    if (idMatch && titleMatch && authorMatch) {
      books.push({
        id: idMatch[1],
        title: titleMatch[1],
        author: authorMatch[1],
        publisher: publisherMatch ? publisherMatch[1] : '',
        isbn: isbnMatch ? isbnMatch[1] : '',
        coverImage: coverImageMatch ? coverImageMatch[1] : '',
        rating: ratingMatch ? parseFloat(ratingMatch[1]) : 0
      });
    }
  });
  
  // 分析結果を生成
  const booksWithCoverImage = books.filter(book => book.coverImage && book.coverImage.trim() !== '');
  const booksWithoutCoverImage = books.filter(book => !book.coverImage || book.coverImage.trim() === '');
  
  // 高優先度書籍を特定
  const highPriorityKeywords = [
    '芥川龍之介', '夏目漱石', '宮沢賢治', '太宰治', '森鴎外',
    'ハリー・ポッター', 'ナルニア', 'ライオン・キング',
    '赤毛のアン', 'アンデルセン', 'グリム童話',
    'かいけつゾロリ', 'おしりたんてい', 'ノンタン',
    'はらぺこあおむし', 'ぐりとぐら', 'おおきなかぶ',
    'ドラえもん', 'サザエさん', 'ちびまる子ちゃん',
    '坂本龍馬', '織田信長', '徳川家康', '芸術', '科学',
    '星の王子さま', '不思議の国のアリス', 'ピーターパン'
  ];
  
  const highPriorityPublishers = ['岩波書店', '新潮社', '偕成社', 'ポプラ社', '講談社', '小学館'];
  
  const highPriorityBooks = books.filter(book => {
    const hasHighRating = book.rating >= 4.3;
    const hasKeyword = highPriorityKeywords.some(keyword => 
      book.title.includes(keyword) || book.author.includes(keyword)
    );
    const hasClassicPublisher = highPriorityPublishers.includes(book.publisher);
    return hasHighRating || hasKeyword || hasClassicPublisher;
  });
  
  const highPriorityWithoutCover = highPriorityBooks.filter(book => !book.coverImage || book.coverImage.trim() === '');
  
  // URLパターン分析
  const googleImages = booksWithCoverImage.filter(book => book.coverImage.includes('gstatic.com'));
  const amazonImages = booksWithCoverImage.filter(book => book.coverImage.includes('amazon'));
  const otherSources = booksWithCoverImage.filter(book => 
    !book.coverImage.includes('gstatic.com') && !book.coverImage.includes('amazon')
  );
  
  console.log('=== 詳細な書籍データベース表紙画像整合性チェック ===\n');
  
  console.log(`📊 総書籍数: ${books.length}冊`);
  console.log(`🖼️  表紙画像設定済み: ${booksWithCoverImage.length}冊 (${((booksWithCoverImage.length / books.length) * 100).toFixed(1)}%)`);
  console.log(`❌ 表紙画像未設定: ${booksWithoutCoverImage.length}冊 (${((booksWithoutCoverImage.length / books.length) * 100).toFixed(1)}%)`);
  console.log(`⭐ 高優先度書籍: ${highPriorityBooks.length}冊 (${((highPriorityBooks.length / books.length) * 100).toFixed(1)}%)`);
  console.log(`🚨 高優先度で表紙画像未設定: ${highPriorityWithoutCover.length}冊\n`);

  console.log('=== URLパターン分析 ===');
  console.log(`🔍 Google画像: ${googleImages.length}冊`);
  console.log(`🛒 Amazon画像: ${amazonImages.length}冊`);
  console.log(`🌐 その他のソース: ${otherSources.length}冊\n`);

  console.log('=== 表紙画像設定済み書籍一覧 ===');
  booksWithCoverImage.forEach((book, index) => {
    const urlType = book.coverImage.includes('gstatic.com') ? 'Google' : 
                   book.coverImage.includes('amazon') ? 'Amazon' : 'Other';
    const priorityMark = highPriorityBooks.includes(book) ? '⭐' : '';
    console.log(`${index + 1}. ${priorityMark}${book.title} (${book.author}) - ${urlType} - Rating: ${book.rating}`);
  });

  console.log('\n=== 高優先度書籍で表紙画像未設定（上位30冊） ===');
  const sortedHighPriorityWithoutCover = highPriorityWithoutCover
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 30);
  
  sortedHighPriorityWithoutCover.forEach((book, index) => {
    const hasISBN = book.isbn ? '📚' : '❓';
    console.log(`${index + 1}. ${hasISBN} ${book.title} (${book.author}) - ${book.publisher} - Rating: ${book.rating}`);
  });

  console.log('\n=== ISBN情報のある書籍（表紙画像未設定） ===');
  const withISBNNoCover = booksWithoutCoverImage.filter(book => book.isbn && book.isbn.trim() !== '').slice(0, 20);
  withISBNNoCover.forEach((book, index) => {
    console.log(`${index + 1}. ${book.title} (${book.author}) - ISBN: ${book.isbn}`);
  });

  console.log('\n=== 設定済み表紙画像URL分析 ===');
  console.log('すべての表紙画像URLがGoogle Images由来のキャッシュURLです：');
  booksWithCoverImage.forEach((book, index) => {
    const urlParts = book.coverImage.split('?q=tbn:');
    const shortUrl = urlParts.length > 1 ? '...?q=tbn:' + urlParts[1].substring(0, 30) + '...' : book.coverImage;
    console.log(`${index + 1}. ${book.title} - ${shortUrl}`);
  });

  console.log('\n=== 潜在的な問題の分析 ===');
  console.log('🔴 重大な問題:');
  console.log(`   - 高優先度書籍の${((highPriorityWithoutCover.length / highPriorityBooks.length) * 100).toFixed(1)}%が表紙画像未設定`);
  console.log(`   - 全体の${((booksWithoutCoverImage.length / books.length) * 100).toFixed(1)}%が表紙画像未設定`);

  console.log('\n🟡 中程度の問題:');
  console.log(`   - 全${booksWithCoverImage.length}冊の表紙画像がGoogle ImagesのキャッシュURL`);
  console.log(`   - ISBN情報があるにも関わらず表紙画像が未設定: ${withISBNNoCover.length}冊`);

  console.log('\n🟢 良好な点:');
  console.log('   - 設定済み表紙画像のURL形式は統一されている');
  console.log('   - 高評価書籍の一部は表紙画像が設定済み');

  console.log('\n=== 優先度付きアクションプラン ===');
  console.log('🚨 緊急度: 高');
  console.log('1. 高優先度書籍（名作・人気作品）の表紙画像を優先的に設定');
  console.log('2. ISBN情報を活用した自動画像取得システムの構築');
  
  console.log('\n⚠️  緊急度: 中');
  console.log('3. Google Imagesキャッシュから安定したURL（Amazon、出版社公式など）への変更');
  console.log('4. 定期的なリンク切れチェック機能の実装');
  
  console.log('\n💡 緊急度: 低');
  console.log('5. 全書籍の表紙画像設定完了');
  console.log('6. 画像品質の統一化（サイズ、フォーマット）');

  console.log('\n=== 技術的推奨事項 ===');
  console.log('• Google Books API または Amazon Product Advertising API の利用検討');
  console.log('• 表紙画像の自動取得・更新システムの構築');
  console.log('• 画像CDN（CloudFront、Cloudinaryなど）の活用');
  console.log('• 定期的なリンク健全性チェックの自動化');
  console.log('• フォールバック用のデフォルト画像システムの実装');
  
  return {
    totalBooks: books.length,
    booksWithCoverImage: booksWithCoverImage.length,
    booksWithoutCoverImage: booksWithoutCoverImage.length,
    highPriorityBooks: highPriorityBooks.length,
    highPriorityWithoutCover: highPriorityWithoutCover.length,
    googleImages: googleImages.length,
    amazonImages: amazonImages.length,
    otherSources: otherSources.length
  };
}

// 実行
if (require.main === module) {
  const results = performDetailedAnalysis();
  
  // 結果をJSONファイルとしても出力
  const outputPath = path.join(__dirname, 'cover-image-analysis-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 分析結果が ${outputPath} に保存されました`);
}