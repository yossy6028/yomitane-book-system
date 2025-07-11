# ヨミタネ - AI図書推薦システム

6-15歳の子どもを対象とした、個性に合わせた図書推薦を行うWebアプリケーション

## 🌟 主要機能

- **個人ユーザー管理**: 登録・ログイン・プロファイル管理
- **適性テスト**: 語彙力+常識力の総合評価（年齢別問題）
- **動的興味選択**: 推薦時に現在の気分で興味分野を選択
- **学年自動計算**: 4月基準の正確な学年表示（新学年お祝いメッセージ付き）
- **AI推薦エンジン**: Google Gemini 2.5 Flash API対応
- **管理者ダッシュボード**: 本部統計・ユーザー管理・セキュリティ監視

## 🚀 Vercelデプロイ対応

このプロジェクトはVercelに最適化されています。

### デプロイ手順
1. [vercel.com](https://vercel.com) でアカウント作成
2. GitHubリポジトリをインポート
3. 自動デプロイ開始（設定不要）

### 📱 デモアカウント
**管理者ログイン**
- ユーザー名: `admin`
- パスワード: `admin123`

## 技術スタック

- **フロントエンド**: React.js + TypeScript
- **AI推薦エンジン**: Google Gemini 2.5 Flash API (フォールバック: ローカルアルゴリズム)
- **外部API**: Google Books API
- **ストレージ**: ローカルストレージ

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、以下のAPIキーを設定：

```bash
# Gemini API - Google AI Studio (https://aistudio.google.com/)
REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here

# Google Books API (オプション)
REACT_APP_GOOGLE_BOOKS_API_KEY=your_google_books_api_key_here
```

### 3. アプリケーションの起動

```bash
npm start
```

## Gemini 2.5 Flash の特徴

- **高速処理**: Flash モデルによる迅速な推薦結果生成
- **高精度な推薦**: 子どもの年齢、興味、性格を総合的に分析
- **自然な推薦理由**: 子どもにも分かりやすい言葉で推薦理由を説明
- **フォールバック機能**: API未設定時はローカルアルゴリズムで動作
- **効率的な処理**: 事前フィルタリングでAPI使用量を最適化

## 総合評価テストの特徴

### 二軸評価システム
- **語彙力テスト**: 言葉の理解、読解力、語彙の豊富さを測定
- **常識力テスト**: 社会常識、心情理解、判断力、マナーを測定

### 年齢別問題構成（語彙 + 常識）
- **6-8歳（低学年）**: 
  - 語彙：動物、色、感情、体の部位など（50問）
  - 常識：基本マナー、安全知識、心情理解など（50問）
- **9-11歳（中学年）**: 
  - 語彙：語彙・意味、反対語、敬語、漢字読み方など（50問）
  - 常識：社会常識、道徳、環境意識、協調性など（50問）
- **12-15歳（高学年〜中学生）**: 
  - 語彙：高度語彙、科学・社会・文学概念など（50問）
  - 常識：社会倫理、論理思考、国際理解、情報リテラシーなど（50問）

### 高度な評価システム
- **混合出題**: 語彙5問 + 常識5問をランダムミックス
- **重み付けスコア**: 常識力60% + 語彙力40%で総合評価
- **詳細分析**: カテゴリ別パフォーマンス、得意・苦手分野の特定
- **学習アドバイス**: 個人の結果に基づく具体的な改善提案
- **総合レベル**: 1-10段階での総合的な学習レベル判定

## Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
