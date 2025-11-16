import React, { useState, useRef, useEffect } from 'react';
import { Book } from '../types/Book';
import { CoverImage } from './CoverImage';
import { JewelLevel } from './JewelLevel';
import { formatAgeRange } from '../utils/ageFormatter';
import './BookCard.css';

interface BookCardProps {
  book: Book;
}

export const BookCard: React.FC<BookCardProps> = ({ book }) => {
  // ISBNベースでのみオンライン書店リンクを表示（タイトル検索は誤マッチが多いため禁止）
  const rawIsbn = (book.isbn ?? '').replace(/-/g, '').trim();
  const hasValidIsbn = /^\d{10}(\d{3})?$/.test(rawIsbn);

  const buildAmazonUrl = (isbn: string): string => {
    // 日本の書籍は ASIN=ISBN の場合が多いが、ここでは安全のため検索結果ページに留める
    return `https://www.amazon.co.jp/s?k=${encodeURIComponent(isbn)}&i=stripbooks`;
  };

  const buildRakutenUrl = (isbn: string): string => {
    // 楽天ブックスのISBN検索
    return `https://books.rakuten.co.jp/search?sitem=${encodeURIComponent(isbn)}&g=001`;
  };

  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  const handleExternalLink =
    (url: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      window.open(url, '_blank', 'noopener,noreferrer');
    };
  
  // デバッグ用ログ（カバー画像がない場合のみ）
  if (!book.coverImage) {
    console.warn(`[BookCard] Book without coverImage: ${book.title}`);
  }

  // Check if description is truncated
  useEffect(() => {
    const checkTruncation = () => {
      if (descriptionRef.current && !isExpanded) {
        const element = descriptionRef.current;
        const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
        const maxHeight = lineHeight * 3; // 3 lines as per CSS
        
        // Check if content is truncated
        setIsTruncated(element.scrollHeight > maxHeight + 1); // +1 for rounding errors
      }
    };

    checkTruncation();
    // Re-check on window resize
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [book.description, isExpanded]);

  // Ensure button text is never overridden
  useEffect(() => {
    const button = document.querySelector('.expand-button');
    if (button && button.textContent !== (isExpanded ? '▲ 閉じる' : '▼ もっと見る')) {
      button.textContent = isExpanded ? '▲ 閉じる' : '▼ もっと見る';
    }
  }, [isExpanded]);

  // 常に表紙画像スペースを表示（CoverImageコンポーネントがデフォルト画像を処理）
  const shouldShowCover = true;

  return (
    <div className="book-card">
      <div className="book-card-header">
        <div className="book-info">
          <h4 className="book-title">{book.title}</h4>
          <p className="book-author">著者: {book.author}</p>
          <p className="book-publisher">{book.publisher}{book.publishedDate && book.publishedDate !== "不明" ? ` (${book.publishedDate})` : ''}</p>
        </div>
        {shouldShowCover && (
          <CoverImage book={book} className="book-cover" size="medium" />
        )}
      </div>

      <div className="book-meta">
        <div className="meta-item">
          <span className="meta-label">標準対象年齢:</span>
          <span className="meta-value">{formatAgeRange(book.ageRange.min, book.ageRange.max)}</span>
        </div>
        {book.reading_level_24 && (
          <div className="meta-item jewel-level-item">
            <span className="meta-label">読書レベル:</span>
            <JewelLevel 
              level={book.reading_level_24} 
              size="medium" 
              showLabel={false}
              showSubLevel={false}
            />
          </div>
        )}
      </div>

      <div className="book-tags">
        {/* 大ジャンル（categories）の表示 */}
        {book.categories && book.categories.map((tag, index) => (
          <span key={`cat-${index}`} className="tag tag-genre">{tag}</span>
        ))}
        
        {/* 中ジャンル：題材・分野（interest_tags）の表示 */}
        {book.interest_tags && book.interest_tags.map((tag, index) => (
          <span key={`int-${index}`} className="tag tag-subject">{tag}</span>
        ))}
        
        {/* 中ジャンル：テーマ・モチーフ（theme_tags）の表示 */}
        {book.theme_tags && book.theme_tags.slice(0, 2).map((tag, index) => (
          <span key={`theme-${index}`} className="tag tag-theme">{tag}</span>
        ))}
      </div>

      {book.description && (
        <div className="book-description">
          <p 
            ref={descriptionRef}
            className={`description-text ${isExpanded ? 'expanded' : ''}`}
          >
            {book.description}
          </p>
          {/* Show button if text is actually truncated visually */}
          {isTruncated && (
            <button 
              className="expand-button"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? '説明を閉じる' : '説明をもっと見る'}
              data-text-collapsed="▼ もっと見る"
              data-text-expanded="▲ 閉じる"
            >
              {isExpanded ? '▲ 閉じる' : '▼ もっと見る'}
            </button>
          )}
        </div>
      )}

      <div className="book-actions">
        {book.libraryUrl && (
          <a
            href={book.libraryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="action-link"
          >
            🏛️ 図書館で探す
          </a>
        )}
        {hasValidIsbn && (
          <>
            <a
              href={buildAmazonUrl(rawIsbn)}
              target="_blank"
              rel="noopener noreferrer"
              className="action-link"
              onClick={handleExternalLink(buildAmazonUrl(rawIsbn))}
            >
              🛒 Amazonで探す
            </a>
            <a
              href={buildRakutenUrl(rawIsbn)}
              target="_blank"
              rel="noopener noreferrer"
              className="action-link"
              onClick={handleExternalLink(buildRakutenUrl(rawIsbn))}
            >
              📚 楽天ブックスで探す
            </a>
          </>
        )}
      </div>

      <div className="book-source">
        <small>データ元: {book.source === 'google_books' ? 'Google Books' : book.source === 'rakuten' ? '楽天ブックス' : '手動登録'}</small>
      </div>
    </div>
  );
};
