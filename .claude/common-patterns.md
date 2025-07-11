# 頻用コマンドパターン

## 開発環境コマンド

### プロジェクト起動
```bash
npm start
```

### テスト実行
```bash
npm test
npm run test:coverage
```

### ビルド・検証
```bash
npm run build
npm run lint
npm run typecheck  # TypeScript使用時
```

### 依存関係管理
```bash
npm install [package-name]
npm audit fix
npm outdated
```

## Git操作パターン

### 基本ワークフロー
```bash
git status
git add .
git commit -m "feat: 機能追加の内容"
git push origin main
```

### ブランチ管理
```bash
git checkout -b feature/[feature-name]
git merge feature/[feature-name]
```

## デバッグパターン

### ログ確認
```bash
npm run dev -- --verbose
tail -f logs/error.log
```

### パッケージ問題解決
```bash
rm -rf node_modules package-lock.json
npm install
```

## API テストパターン

### cURL テスト
```bash
# Google Books API テスト
curl -X GET "https://www.googleapis.com/books/v1/volumes?q=children&key=YOUR_API_KEY"

# 楽天ブックス API テスト
curl -X GET "https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?format=json&keyword=児童文学&applicationId=YOUR_APP_ID"
```

### 環境変数確認
```bash
echo $REACT_APP_GOOGLE_BOOKS_API_KEY
echo $REACT_APP_RAKUTEN_APP_ID
```

### API設定確認
```bash
# 開発サーバー再起動
npm start

# ビルドテスト
npm run build
```

## 定型実装テンプレート

### React コンポーネント基本形
```jsx
import React, { useState } from 'react';

const ComponentName = ({ props }) => {
  const [state, setState] = useState('');
  
  return (
    <div>
      {/* component content */}
    </div>
  );
};

export default ComponentName;
```

### API呼び出し基本形
```javascript
const fetchBooks = async (query) => {
  try {
    const response = await fetch(`${API_URL}?q=${query}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
```