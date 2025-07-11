/**
 * Google Books API以外の代替手段による画像取得サービス
 */
export class AlternativeImageService {
  private static instance: AlternativeImageService;

  static getInstance(): AlternativeImageService {
    if (!this.instance) {
      this.instance = new AlternativeImageService();
    }
    return this.instance;
  }

  /**
   * 複数のソースから画像を取得する統合メソッド
   */
  async getBookCover(book: { title: string; author: string; isbn?: string }): Promise<string | null> {
    console.log(`🔍 代替手段で表紙検索: "${book.title}" by ${book.author}`);

    // 1. 楽天ブックスAPIを試す
    const rakutenImage = await this.searchRakutenBooks(book);
    if (rakutenImage) return rakutenImage;

    // 2. Google画像検索（フロントエンドでは直接実行不可、サーバーサイド必要）
    // const googleImage = await this.searchGoogleImages(book);
    // if (googleImage) return googleImage;

    // 3. Open Library API
    const openLibraryImage = await this.searchOpenLibrary(book);
    if (openLibraryImage) return openLibraryImage;

    // 4. 国立国会図書館サーチAPI
    const ndlImage = await this.searchNDL(book);
    if (ndlImage) return ndlImage;

    return null;
  }

  /**
   * 楽天ブックスAPI検索
   */
  private async searchRakutenBooks(book: { title: string; isbn?: string }): Promise<string | null> {
    // 注意: 楽天APIキーが必要（環境変数で管理すべき）
    const RAKUTEN_APP_ID = process.env.REACT_APP_RAKUTEN_APP_ID;
    if (!RAKUTEN_APP_ID) {
      console.log('❌ 楽天APIキーが設定されていません');
      return null;
    }

    try {
      const params = new URLSearchParams({
        applicationId: RAKUTEN_APP_ID,
        title: book.title,
        hits: '1',
        imageFlag: '1'
      });

      if (book.isbn) {
        params.append('isbn', book.isbn);
      }

      const response = await fetch(`https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${params}`);
      const data = await response.json();

      if (data.Items && data.Items.length > 0) {
        const item = data.Items[0].Item;
        if (item.largeImageUrl || item.mediumImageUrl) {
          console.log('✅ 楽天ブックスで画像発見');
          return item.largeImageUrl || item.mediumImageUrl;
        }
      }
    } catch (error) {
      console.error('楽天ブックスAPI エラー:', error);
    }

    return null;
  }

  /**
   * Open Library API検索
   */
  private async searchOpenLibrary(book: { isbn?: string; title: string }): Promise<string | null> {
    try {
      // ISBNがある場合は直接取得
      if (book.isbn) {
        const coverUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`;
        
        // 画像が存在するかチェック
        const response = await fetch(coverUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log('✅ Open Libraryで画像発見（ISBN）');
          return coverUrl;
        }
      }

      // タイトル検索
      const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(book.title)}&limit=1`;
      const response = await fetch(searchUrl);
      const data = await response.json();

      if (data.docs && data.docs.length > 0) {
        const doc = data.docs[0];
        if (doc.cover_i) {
          const coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
          console.log('✅ Open Libraryで画像発見（タイトル）');
          return coverUrl;
        }
      }
    } catch (error) {
      console.error('Open Library API エラー:', error);
    }

    return null;
  }

  /**
   * 国立国会図書館サーチAPI
   */
  private async searchNDL(book: { title: string; author: string }): Promise<string | null> {
    try {
      // NDLサーチAPIは画像URLを直接提供しないが、書誌情報を取得できる
      const query = `${book.title} ${book.author}`;
      const url = `https://iss.ndl.go.jp/api/opensearch?title=${encodeURIComponent(query)}&cnt=1`;

      const response = await fetch(url);
      const text = await response.text();
      
      // XMLパース（簡易版）
      const thumbnailMatch = text.match(/<dcndl:thumbnail>([^<]+)<\/dcndl:thumbnail>/);
      if (thumbnailMatch && thumbnailMatch[1]) {
        console.log('✅ 国立国会図書館で画像発見');
        return thumbnailMatch[1];
      }
    } catch (error) {
      console.error('NDLサーチAPI エラー:', error);
    }

    return null;
  }
}