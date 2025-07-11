import { Book } from '../../types/Book';

/**
 * プレースホルダー画像生成
 * カテゴリに応じた美しいSVG画像を生成
 */
export class PlaceholderGenerator {
  private static instance: PlaceholderGenerator;

  static getInstance(): PlaceholderGenerator {
    if (!this.instance) {
      this.instance = new PlaceholderGenerator();
    }
    return this.instance;
  }

  /**
   * カテゴリに基づいたプレースホルダー画像を生成
   */
  generate(book: Book): string {
    const category = book.categories[0] || 'その他';
    const icon = this.getIconForCategory(category);
    const colors = this.getColorsForCategory(category);
    
    const svg = `
      <svg width="120" height="160" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bookGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="120" height="160" fill="url(#bookGradient)" stroke="${colors.border}" stroke-width="2" rx="8"/>
        <text x="60" y="50" text-anchor="middle" font-size="30">${icon}</text>
        <text x="60" y="80" text-anchor="middle" font-size="11" fill="#ffffff" font-family="sans-serif" font-weight="bold">
          ${this.truncateText(book.title, 12)}
        </text>
        <text x="60" y="100" text-anchor="middle" font-size="9" fill="#f0f0f0" font-family="sans-serif">
          ${this.truncateText(book.author, 14)}
        </text>
        <text x="60" y="130" text-anchor="middle" font-size="8" fill="#e0e0e0" font-family="sans-serif">
          ${category}
        </text>
        <text x="60" y="145" text-anchor="middle" font-size="7" fill="#d0d0d0" font-family="sans-serif">
          ${book.ageRange.min}-${book.ageRange.max}歳
        </text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  }

  /**
   * カテゴリに応じたアイコンを取得
   */
  private getIconForCategory(category: string): string {
    const iconMap: Record<string, string> = {
      '絵本': '🎨',
      '児童文学': '📚',
      'ファンタジー': '🏰',
      '冒険': '🗺️',
      '推理': '🔍',
      'ユーモア': '😄',
      '動物': '🐾',
      '自然': '🌿',
      '科学': '🔬',
      '歴史': '📜',
      'スポーツ': '⚽',
      '料理': '👨‍🍳',
      '音楽': '🎵',
      'アート': '🎭',
      '友情': '🤝',
      '家族': '👨‍👩‍👧‍👦',
      '学校生活': '🏫',
      'その他': '📖'
    };

    return iconMap[category] || '📖';
  }

  /**
   * カテゴリに応じたカラーパレットを取得
   */
  private getColorsForCategory(category: string): { primary: string; secondary: string; border: string } {
    const colorMap: Record<string, { primary: string; secondary: string; border: string }> = {
      '絵本': { primary: '#ff6b6b', secondary: '#ee5a52', border: '#c44569' },
      '児童文学': { primary: '#4ecdc4', secondary: '#45b7aa', border: '#26a085' },
      'ファンタジー': { primary: '#a29bfe', secondary: '#6c5ce7', border: '#5f3dc4' },
      '冒険': { primary: '#fd79a8', secondary: '#e84393', border: '#d63031' },
      '推理': { primary: '#fdcb6e', secondary: '#e17055', border: '#d63031' },
      'ユーモア': { primary: '#55efc4', secondary: '#00b894', border: '#00a085' },
      '動物': { primary: '#ff9ff3', secondary: '#f368e0', border: '#e84393' },
      '自然': { primary: '#90ee90', secondary: '#32cd32', border: '#228b22' },
      '科学': { primary: '#74b9ff', secondary: '#0984e3', border: '#2d3436' },
      '歴史': { primary: '#e17055', secondary: '#d63031', border: '#74b9ff' },
      'スポーツ': { primary: '#fab1a0', secondary: '#e17055', border: '#d63031' },
      '料理': { primary: '#ffeaa7', secondary: '#fdcb6e', border: '#f39c12' },
      '音楽': { primary: '#fd79a8', secondary: '#e84393', border: '#d63031' },
      'アート': { primary: '#a29bfe', secondary: '#6c5ce7', border: '#5f3dc4' },
      '友情': { primary: '#55efc4', secondary: '#00b894', border: '#00a085' },
      '家族': { primary: '#ff7675', secondary: '#d63031', border: '#b71c1c' },
      '学校生活': { primary: '#74b9ff', secondary: '#0984e3', border: '#2d3436' },
      'その他': { primary: '#ddd', secondary: '#bbb', border: '#999' }
    };

    return colorMap[category] || colorMap['その他'];
  }

  /**
   * テキストを指定文字数で切り詰め
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 1) + '…';
  }
}