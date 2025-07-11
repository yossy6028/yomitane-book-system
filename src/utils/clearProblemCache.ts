import { ImageSearchService } from '../services/imageSearch/ImageSearchService';

/**
 * 問題のある書籍のキャッシュをクリアするユーティリティ
 */
export function clearProblemBooksCache(): void {
  const imageService = ImageSearchService.getInstance();
  
  const problemBooks = [
    { title: 'かがみの孤城', author: '辻村深月' },
    { title: '魔女の宅急便', author: '角野栄子' },
    { title: 'はてしない物語', author: 'ミヒャエル・エンデ' },
    { title: 'モモ', author: 'ミヒャエル・エンデ' }
  ];
  
  console.log('🗑️ 問題書籍のキャッシュをクリア中...');
  
  problemBooks.forEach(book => {
    imageService.clearBookCache(book.title, book.author);
    console.log(`  ✅ クリア: "${book.title}" by "${book.author}"`);
  });
  
  console.log('🎯 キャッシュクリア完了');
}

// 全キャッシュをクリアする関数
export function clearAllImageCache(): void {
  const imageService = ImageSearchService.getInstance();
  imageService.clearCache();
  console.log('🗑️ 全ての画像キャッシュをクリアしました');
}