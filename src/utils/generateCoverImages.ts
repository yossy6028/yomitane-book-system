import { Book } from '../types/Book';

/**
 * 書籍表紙画像を即座に生成する関数
 */
export function generateCoverImage(book: Book): string {
  const categoryIcons: Record<string, string> = {
    '絵本': '🎨', '児童文学': '📚', 'ファンタジー': '🏰', '冒険': '🗺️',
    '推理': '🔍', 'ユーモア': '😄', '動物': '🐾', '自然': '🌿',
    '科学': '🔬', '歴史': '📜', 'スポーツ': '⚽', '料理': '👨‍🍳',
    '友情': '👫', '成長': '🌱', '日常': '🏠', '文学': '✒️',
    '社会': '🏛️', 'アニメ・まんが': '📺', 'せかいの国ぐに': '🌍',
    'なぞとき': '🔍', '友情・恋愛': '💝', '家族': '👨‍👩‍👧‍👦', 
    '学校生活': '🏫', '音楽': '🎵', '芸術': '🎭', '宇宙・天体': '🌟',
    '工作・手芸': '✂️', 'プログラミング': '💻', '心理学': '🧠',
    '旅行・地理': '🗺️', '感動': '😭', '魔法': '✨', '楽しさ': '😊'
  };

  // カテゴリまたは興味からアイコンを選択
  const category = book.categories[0] || book.interests[0] || 'その他';
  const icon = categoryIcons[category] || '📖';
  
  // タイトルと著者を短縮
  const shortTitle = book.title.length > 7 ? book.title.substring(0, 7) + '...' : book.title;
  const shortAuthor = book.author.length > 8 ? book.author.substring(0, 8) + '...' : book.author;

  // レベル別色設定
  const levelColors: Record<string, { bg: string; border: string }> = {
    '小学校低学年': { bg: '#ffeb3b', border: '#fbc02d' },
    '小学校中学年': { bg: '#4caf50', border: '#388e3c' },
    '中学受験〜中1・2年': { bg: '#2196f3', border: '#1976d2' },
    '高校受験レベル': { bg: '#9c27b0', border: '#7b1fa2' }
  };

  const levelColor = levelColors[book.readingLevel] || levelColors['小学校低学年'];

  const svg = `
    <svg width="120" height="160" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f8f9fa;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e9ecef;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="iconBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${levelColor.bg};stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:${levelColor.border};stop-opacity:0.6" />
        </linearGradient>
      </defs>
      <rect width="120" height="160" fill="url(#bg)" stroke="${levelColor.border}" stroke-width="2" rx="8"/>
      <circle cx="60" cy="45" r="20" fill="url(#iconBg)" stroke="${levelColor.border}" stroke-width="1"/>
      <text x="60" y="53" text-anchor="middle" font-size="20">${icon}</text>
      <text x="60" y="80" text-anchor="middle" font-size="10" fill="#2c3e50" font-weight="bold" font-family="Hiragino Maru Gothic ProN, Arial, sans-serif">
        ${shortTitle}
      </text>
      <text x="60" y="95" text-anchor="middle" font-size="8" fill="#6c757d" font-family="Hiragino Maru Gothic ProN, Arial, sans-serif">
        ${shortAuthor}
      </text>
      <rect x="5" y="135" width="110" height="20" fill="${levelColor.bg}" stroke="${levelColor.border}" stroke-width="1" rx="10" opacity="0.8"/>
      <text x="60" y="147" text-anchor="middle" font-size="7" fill="#343a40" font-weight="bold" font-family="Hiragino Maru Gothic ProN, Arial, sans-serif">
        ${book.readingLevel}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

/**
 * 全書籍に表紙画像を適用
 */
export function enrichBooksWithCoverImages(books: Book[]): Book[] {
  return books.map(book => ({
    ...book,
    coverImage: book.coverImage && book.coverImage.length > 0 
      ? book.coverImage 
      : generateCoverImage(book)
  }));
}