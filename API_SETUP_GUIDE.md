# 📚 図書推薦システム API設定ガイド

このガイドでは、図書自動更新機能を有効にするためのAPI設定方法を説明します。

## 🎯 必要なAPI

### 1. Google Books API（必須）
- **用途**: 図書データの検索・取得
- **制限**: 1日1000リクエスト（無料）
- **価格**: 無料

### 2. 楽天ブックスAPI（オプション）
- **用途**: 日本の書籍情報の補完
- **制限**: 月間500万リクエスト（無料）
- **価格**: 無料

---

## 🔑 Google Books API設定手順

### ステップ1: Google Cloud Platformアカウント作成
1. [Google Cloud Platform](https://cloud.google.com/) にアクセス
2. 「無料で開始」をクリック
3. Googleアカウントでログイン
4. 利用規約に同意して登録完了

### ステップ2: プロジェクト作成
1. Google Cloud Consoleにアクセス
2. 「プロジェクトを選択」→「新しいプロジェクト」
3. プロジェクト名を入力（例：「book-recommendation-system」）
4. 「作成」をクリック

### ステップ3: Google Books API有効化
1. 左メニューから「APIとサービス」→「ライブラリ」
2. 検索ボックスに「Google Books API」と入力
3. 「Google Books API」を選択
4. 「有効にする」をクリック

### ステップ4: APIキー作成
1. 「APIとサービス」→「認証情報」
2. 「認証情報を作成」→「APIキー」
3. APIキーが生成されます（例：`AIzaSyC-xxxxxxxxxxxxxxxxxxxxx`）
4. ⚠️ **重要**: APIキーをコピーして安全な場所に保存

### ステップ5: APIキーの制限設定（推奨）
1. 作成したAPIキーの「編集」をクリック
2. 「アプリケーションの制限」で「HTTPリファラー」を選択
3. 「ウェブサイトの制限」に以下を追加：
   - `localhost:3000/*`
   - `127.0.0.1:3000/*`
   - あなたのドメイン（本番環境の場合）
4. 「APIの制限」で「キーを制限」を選択
5. 「Google Books API」のみを選択
6. 「保存」をクリック

---

## 🛒 楽天ブックスAPI設定手順（オプション）

### ステップ1: 楽天開発者アカウント作成
1. [楽天ウェブサービス](https://webservice.rakuten.co.jp/) にアクセス
2. 「新規アプリ登録」をクリック
3. 楽天会員でログイン（アカウントがない場合は作成）

### ステップ2: アプリケーション登録
1. アプリ情報を入力：
   - **アプリ名**: 「図書推薦システム」
   - **アプリURL**: `http://localhost:3000`（開発時）
   - **アプリの説明**: 「子ども向け図書推薦システム」
2. 利用規約に同意して「規約に同意して新規アプリを作成」

### ステップ3: アプリケーションID取得
1. 登録完了後、アプリケーションIDが発行されます
2. IDをコピーして保存（例：`1234567890123456789`）

---

## ⚙️ 環境変数設定

### ファイル編集
プロジェクトフォルダの `.env.local` ファイルを編集します：

```bash
# Google Books API（必須）
REACT_APP_GOOGLE_BOOKS_API_KEY=あなたのAPIキーをここに入力

# 楽天ブックス API（オプション）
REACT_APP_RAKUTEN_APP_ID=あなたのアプリケーションIDをここに入力

# APIのベースURL（変更不要）
REACT_APP_GOOGLE_BOOKS_BASE_URL=https://www.googleapis.com/books/v1
REACT_APP_RAKUTEN_BOOKS_BASE_URL=https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404
```

### 設定例
```bash
# 実際の設定例
REACT_APP_GOOGLE_BOOKS_API_KEY=AIzaSyC-abcdefghijklmnopqrstuvwxyz123456
REACT_APP_RAKUTEN_APP_ID=1234567890123456789
REACT_APP_GOOGLE_BOOKS_BASE_URL=https://www.googleapis.com/books/v1
REACT_APP_RAKUTEN_BOOKS_BASE_URL=https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404
```

---

## 🧪 設定確認方法

### 1. 開発サーバー再起動
```bash
npm start
```

### 2. 管理者パネルで確認
1. アプリケーションを開く
2. 「管理者パネル」をクリック
3. 「更新管理」タブを選択
4. API設定情報で「設定済み」になっていることを確認

### 3. 手動更新テスト
1. 管理者パネルで「今すぐ更新」をクリック
2. 正常に新しい本が追加されれば設定成功

---

## ⚠️ 注意事項・トラブルシューティング

### API制限について
- **Google Books API**: 1日1000リクエスト制限
- 制限を超えた場合は翌日まで待機が必要
- 大量更新は避け、定期更新機能を活用

### よくあるエラー

#### 1. 「API設定が不完全です」エラー
- `.env.local`ファイルの設定を確認
- APIキーが正しく入力されているか確認
- 開発サーバーを再起動

#### 2. 「APIキーが無効です」エラー
- Google Cloud ConsoleでAPIキーが有効か確認
- Google Books APIが有効になっているか確認
- HTTPリファラー制限の設定を確認

#### 3. 「更新に失敗しました」エラー
- インターネット接続を確認
- APIキーの制限回数を確認
- しばらく時間を置いてから再試行

### セキュリティ注意事項
- APIキーを他人に教えない
- GitHubなどの公開リポジトリにAPIキーをアップロードしない
- `.env.local`ファイルは`.gitignore`に含まれています

---

## 📞 サポート

設定で困った場合は：
1. このガイドを再度確認
2. 各APIの公式ドキュメントを参照
3. 管理者パネルのエラーメッセージを確認

### 公式ドキュメント
- [Google Books API Documentation](https://developers.google.com/books/docs/v1/using)
- [楽天ウェブサービス ドキュメント](https://webservice.rakuten.co.jp/doc/)

---

## 🎉 設定完了後の機能

API設定完了後、以下の機能が利用可能になります：

### ✅ 自動図書更新
- 年2〜3回（4月・8月・12月）の自動更新
- 最新の児童書情報の自動取得
- 重複除去による効率的なデータ管理

### ✅ 手動更新
- 管理者パネルからの即時更新
- 特定のキーワードでの検索更新
- 更新履歴の詳細記録

### ✅ 豊富な図書データ
- Google Books APIからの膨大な書籍データ
- 年齢・興味に応じた適切な推薦
- 表紙画像や詳細情報の自動取得

設定お疲れさまでした！これで図書推薦システムが完全に動作します。