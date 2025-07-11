# 興味選択と推薦本不一致問題修正プラン

## 問題分析

### 現状の問題
1. **サッカー・水泳が選択可能だが関連書籍がない**
   - 7歳児でも「サッカー」「水泳」を選択できる
   - しかし実際の書籍は9-14歳対象のため推薦されない
   - 結果：選択した興味と全く関係ない本が推薦される

2. **フォールバック機能の問題**
   - 利用可能な書籍がない場合、すべてのカテゴリを表示する
   - ユーザーに不適切な選択肢を提供している

### 根本原因
- InterestSelectorのフィルタリングロジックが部分的に機能している
- 年齢に適さない興味分野でも選択可能になっている
- 推薦システムで興味マッチングができない場合の処理が不十分

## 修正案

### 1. InterestSelector改善
```typescript
// 年齢に適した書籍が存在しない興味分野は表示しない
// フォールバック時も最低限の検証を行う
```

### 2. 推薦システム改善
```typescript
// 興味マッチングが失敗した場合の明確な説明
// 代替推薦ロジックの改善
```

### 3. 低年齢向けスポーツ書籍追加
```typescript
// 6-8歳向けのサッカー・水泳関連書籍を追加
```

## 修正ファイル
- src/App.tsx (InterestSelector)
- src/services/recommendationService.ts
- src/data/initialBooks.ts

## テスト計画
1. 7歳児でサッカー・水泳が選択できないことを確認
2. 適切な興味分野のみ表示されることを確認
3. 推薦システムが適切に動作することを確認