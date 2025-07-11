# 図書データ登録ルール

## 🎯 基本方針
**すべての図書は必ず何らかの推薦条件を満たし、システム内で推薦される可能性を持つこと**

---

## 📋 必須チェックリスト

### 1. 年齢範囲（ageRange）
- **必須条件**: `min: 6-15, max: 6-18` の範囲内
- **推奨**: 6-15歳の範囲内で適切に設定
- **禁止**: 6歳未満開始、18歳超え終了

```typescript
// ✅ 良い例
ageRange: { min: 8, max: 12 }   // 小学生向け
ageRange: { min: 12, max: 15 }  // 中学生向け
ageRange: { min: 10, max: 14 }  // 高学年〜中学生

// ❌ 悪い例
ageRange: { min: 4, max: 8 }    // 6歳未満を含む
ageRange: { min: 15, max: 20 }  // 18歳超えを含む
```

### 2. 読書レベル（readingLevel）
- **必須**: 以下のいずれかを設定
  - `'小学校低学年'` （6-8歳向け）
  - `'小学校中学年'` （9-11歳向け）
  - `'小学校高学年'` （10-12歳向け）
  - `'中学受験〜中学生向け'` （11-15歳向け）
  - `'高校受験レベル'` （14-15歳向け）

### 3. 語彙レベル（vocabularyLevel）
- **必須条件**: 1-10の整数
- **適切な設定**:
  - レベル1-3: 低学年向け
  - レベル4-6: 中学年〜高学年向け
  - レベル7-8: 中学生向け
  - レベル9-10: 高校生レベル

### 4. 興味分野（interests）
- **必須条件**: 最低1つ、推奨3つ以上設定
- **必須チェック**: UI提供項目から最低1つ選択

#### UI提供興味分野（標準項目）
```typescript
const STANDARD_INTERESTS = [
  'スポーツ', '成長', '自然', '日常', '動物', '科学', '料理', '冒険',
  '読書', 'ユーモア', '社会', '歴史', 'アニメ・まんが', '文学',
  'せかいの国ぐに', 'なぞとき', 'ファンタジー', '友情・恋愛', 
  '友情', '家族', '学校生活'
];
```

#### 拡張興味分野（専門項目）
```typescript
const EXTENDED_INTERESTS = [
  '哲学', '教育', '古典', '音楽', '芸術', '宇宙・天体',
  '工作・手芸', '絵を描く', 'プログラミング', '心理学',
  '推理・謎解き', '旅行・地理', '感動', '魔法', '楽しさ'
];
```

---

## 🔍 登録前バリデーション

### 推薦可能性チェック
新規図書は以下の条件のうち**最低1つ**を満たす必要があります：

1. **年齢適合性**: 6-15歳の範囲と重複がある
2. **興味分野適合性**: 標準興味分野から最低1つ含む
3. **レベル適合性**: システム対応レベルに設定済み
4. **高評価補完**: rating 4.0以上で他条件を一部補完

### 必須フィールドチェック
```typescript
interface BookValidation {
  id: string;           // 必須: 一意性確保
  title: string;        // 必須: 空文字禁止
  author: string;       // 必須: 空文字禁止
  ageRange: {           // 必須: 6-15歳範囲内
    min: number;        // 6以上
    max: number;        // 15以下推奨、18以下許容
  };
  readingLevel: string; // 必須: 標準レベルから選択
  vocabularyLevel: number; // 必須: 1-10
  interests: string[];  // 必須: 最低1つ、標準項目から最低1つ
  rating: number;       // 必須: 1.0-5.0
  categories: string[]; // 必須: 最低1つ
}
```

---

## 📊 推薦可能性スコア計算

新規図書の推薦可能性を事前評価するためのスコア：

### 基本スコア（最大100点）
- **年齢適合**: 30点（6-15歳完全カバー）
- **興味適合**: 30点（標準興味分野3つ以上）
- **レベル適合**: 20点（適切なレベル設定）
- **語彙適合**: 10点（適切な語彙レベル）
- **評価加点**: 10点（rating 4.0以上）

### 推薦可能性判定
- **80点以上**: 高推薦可能性 ✅
- **60-79点**: 中推薦可能性 ⚠️
- **40-59点**: 低推薦可能性 ❌ (要見直し)
- **40点未満**: 推薦困難 🚫 (登録不可)

---

## 🛠️ 実装ガイド

### 1. 管理者パネルでの新規登録時
```typescript
// バリデーション関数
function validateNewBook(book: Partial<Book>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 年齢範囲チェック
  if (!book.ageRange || book.ageRange.min < 6 || book.ageRange.max > 18) {
    errors.push('年齢範囲は6-18歳の範囲で設定してください');
  }
  
  // 興味分野チェック
  const hasStandardInterest = book.interests?.some(interest => 
    STANDARD_INTERESTS.includes(interest)
  );
  if (!hasStandardInterest) {
    errors.push('標準興味分野から最低1つ選択してください');
  }
  
  // 推薦可能性スコア計算
  const score = calculateRecommendationScore(book);
  if (score < 40) {
    errors.push(`推薦可能性スコア ${score}点 - 40点以上必要`);
  } else if (score < 60) {
    warnings.push(`推薦可能性スコア ${score}点 - 改善推奨`);
  }
  
  return { 
    isValid: errors.length === 0, 
    errors, 
    warnings, 
    score 
  };
}
```

### 2. CSV一括登録時の自動チェック
```typescript
function validateBulkBooks(books: Book[]): BulkValidationResult {
  const results = books.map((book, index) => ({
    index,
    book,
    validation: validateNewBook(book)
  }));
  
  const invalid = results.filter(r => !r.validation.isValid);
  const warnings = results.filter(r => r.validation.warnings.length > 0);
  
  return {
    totalBooks: books.length,
    validBooks: books.length - invalid.length,
    invalidBooks: invalid,
    warningBooks: warnings,
    canProceed: invalid.length === 0
  };
}
```

---

## 📝 登録時のガイダンス

### 興味分野設定のコツ
1. **メインテーマ**: 本の主要テーマから2-3個選択
2. **サブテーマ**: 副次的要素から1-2個選択
3. **対象読者**: 想定読者の興味から1-2個選択

### 年齢・レベル設定のコツ
1. **内容の複雑さ**: 物語の複雑さを考慮
2. **語彙の難しさ**: 使用される言葉の難易度を考慮
3. **テーマの重さ**: 扱うテーマの重要性を考慮

---

## 🔄 定期メンテナンス

### 月次チェック項目
1. 推薦されていない図書の洗い出し
2. 新しい興味分野トレンドの分析
3. 年齢・レベル分布の偏り確認

### 四半期チェック項目
1. UI興味分野項目の見直し
2. 推薦アルゴリズムの調整
3. 図書データ品質の全体評価

---

## 📋 チェックシート（新規登録用）

```
□ 年齢範囲が6-15歳（最大18歳）の範囲内
□ 読書レベルが標準レベルから選択済み
□ 語彙レベルが1-10で適切に設定
□ 興味分野が最低3つ設定
□ 標準興味分野から最低1つ選択
□ カテゴリが最低1つ設定
□ タイトル・著者が適切に入力
□ 推薦可能性スコア60点以上
□ 類似図書との重複チェック完了
□ 年齢・レベル・興味の整合性確認
```

このルールに従うことで、**100%の図書が何らかの条件で推薦される可能性**を保証できます。