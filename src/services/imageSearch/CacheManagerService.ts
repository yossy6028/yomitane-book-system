/**
 * キャッシュ管理サービス
 * 表紙画像のキャッシュ問題を解決するための緊急対策
 */

export class CacheManagerService {
  private static instance: CacheManagerService;

  static getInstance(): CacheManagerService {
    if (!this.instance) {
      this.instance = new CacheManagerService();
    }
    return this.instance;
  }

  /**
   * 全キャッシュをクリア
   */
  clearAllCaches(): void {
    console.log('🧹 全キャッシュクリア開始...');
    
    // ローカルストレージクリア
    try {
      localStorage.clear();
      console.log('✅ LocalStorage クリア完了');
    } catch (error) {
      console.warn('⚠️ LocalStorage クリア失敗:', error);
    }

    // セッションストレージクリア
    try {
      sessionStorage.clear();
      console.log('✅ SessionStorage クリア完了');
    } catch (error) {
      console.warn('⚠️ SessionStorage クリア失敗:', error);
    }

    // ブラウザキャッシュの強制リロード指示
    console.log('💡 ページをハードリフレッシュ（Ctrl+F5）してください');
  }

  /**
   * 特定書籍のキャッシュをクリア
   */
  clearBookCache(bookId: string, title: string): void {
    console.log(`🧹 書籍キャッシュクリア: [${bookId}] "${title}"`);
    
    // 可能性のあるキャッシュキーパターンを削除
    const possibleKeys = [
      `${bookId}_${title}`,
      title,
      bookId,
      `cache_${bookId}`,
      `image_${bookId}`,
      `cover_${title}`
    ];

    let clearedCount = 0;
    possibleKeys.forEach(key => {
      try {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          clearedCount++;
        }
        if (sessionStorage.getItem(key)) {
          sessionStorage.removeItem(key);
          clearedCount++;
        }
      } catch (error) {
        console.warn(`⚠️ キー "${key}" のクリアに失敗:`, error);
      }
    });

    console.log(`✅ ${clearedCount}個のキャッシュエントリをクリアしました`);
  }

  /**
   * 表紙画像関連のキャッシュ情報を表示
   */
  debugCacheInfo(): void {
    console.group('🔍 キャッシュデバッグ情報');
    
    try {
      console.log('📊 LocalStorage エントリ数:', localStorage.length);
      console.log('📊 SessionStorage エントリ数:', sessionStorage.length);
      
      // 表紙画像関連のキーを抽出
      const imageKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('image') || key.includes('cover') || key.includes('cache'))) {
          imageKeys.push(key);
        }
      }
      
      console.log('🖼️ 画像関連キー:', imageKeys);
      
      if (imageKeys.length > 0) {
        console.log('📋 サンプルデータ:');
        imageKeys.slice(0, 5).forEach(key => {
          const value = localStorage.getItem(key);
          const preview = value ? value.substring(0, 100) + '...' : 'null';
          console.log(`   ${key}: ${preview}`);
        });
      }
      
    } catch (error) {
      console.error('❌ キャッシュ情報取得エラー:', error);
    }
    
    console.groupEnd();
  }

  /**
   * 問題のある書籍のキャッシュを特定・クリア
   */
  clearProblematicBookCaches(): void {
    console.log('🚨 問題書籍のキャッシュクリア開始...');
    
    const problematicBooks = [
      { id: '33', title: 'AIと友達になる方法' },
      { id: '56', title: 'オリンピック物語' },
      { id: '77', title: 'くまのプーさん' },
      { id: '96', title: '三国志（子ども版）' }
    ];

    problematicBooks.forEach(book => {
      this.clearBookCache(book.id, book.title);
    });

    console.log('✅ 問題書籍のキャッシュクリア完了');
  }

  /**
   * 開発用: 全キャッシュ情報をダンプ
   */
  dumpAllCacheData(): { [key: string]: any } {
    const cacheData: { [key: string]: any } = {};
    
    try {
      // LocalStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          cacheData[`localStorage.${key}`] = localStorage.getItem(key);
        }
      }
      
      // SessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          cacheData[`sessionStorage.${key}`] = sessionStorage.getItem(key);
        }
      }
      
    } catch (error) {
      console.error('❌ キャッシュダンプエラー:', error);
    }
    
    return cacheData;
  }
}