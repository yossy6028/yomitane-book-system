import React, { useState, useEffect } from 'react';
import { Book, BookFilter } from '../types/Book';
import { bookService } from '../services/bookService';
import { CoverImage } from './CoverImage';
import { CacheClearButton } from './CacheClearButton';
import './BookList.css';

interface BookListProps {
  onBack?: () => void;
}

const BookList: React.FC<BookListProps> = ({ onBack }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [filter, setFilter] = useState<BookFilter>({});
  const [isLoading, setIsLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  
  // 🚨 根本解決: ページング機能追加
  const [currentPage, setCurrentPage] = useState(1);
  const [booksPerPage] = useState(12); // 1ページあたり12冊に制限

  useEffect(() => {
    loadBooks();
    loadStatistics();
  }, []);

  useEffect(() => {
    applyFilter();
    setCurrentPage(1); // フィルタ変更時はページを1に戻す
  }, [books, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadBooks = () => {
    const allBooks = bookService.getAllBooks();
    setBooks(allBooks);
  };

  const loadStatistics = () => {
    const stats = bookService.getStatistics();
    setStatistics(stats);
  };

  const applyFilter = () => {
    const filtered = bookService.getFilteredBooks(filter);
    setFilteredBooks(filtered);
  };

  const handleFilterChange = (newFilter: Partial<BookFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  };

  const clearFilters = () => {
    setFilter({});
    setCurrentPage(1);
  };
  
  // ページング用の計算
  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);
  const startIndex = (currentPage - 1) * booksPerPage;
  const endIndex = startIndex + booksPerPage;
  const currentBooks = filteredBooks.slice(startIndex, endIndex);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // ページ変更時にスクロールを上部に移動
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateBooks = async () => {
    setIsLoading(true);
    try {
      await bookService.updateBookDatabase();
      loadBooks();
      loadStatistics();
      alert('図書データベースの更新が完了しました！');
    } catch (error) {
      alert('更新中にエラーが発生しました。後でもう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="book-list-container">
      <div className="book-list-header">
        <div className="header-top">
          <h2>📚 図書一覧</h2>
          {onBack && (
            <button className="back-button" onClick={onBack}>
              ← もどる
            </button>
          )}
        </div>
        
        {statistics && (
          <div className="statistics">
            <div className="stat-item">
              <span className="stat-number">{statistics.totalBooks}</span>
              <span className="stat-label">登録図書数</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{statistics.lastUpdate}</span>
              <span className="stat-label">最終更新</span>
            </div>
            <button 
              className="update-button" 
              onClick={handleUpdateBooks}
              disabled={isLoading}
            >
              {isLoading ? '更新中...' : '📥 図書更新'}
            </button>
          </div>
        )}
      </div>

      <div className="filters-section">
        <h3>🔍 絞り込み検索</h3>
        
        <div className="filter-group">
          <label>検索キーワード:</label>
          <input
            type="text"
            placeholder="タイトル、著者、内容で検索..."
            value={filter.searchTerm || ''}
            onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>年齢:</label>
          <select
            value={`${filter.ageRange?.min || ''}-${filter.ageRange?.max || ''}`}
            onChange={(e) => {
              const [min, max] = e.target.value.split('-').map(Number);
              handleFilterChange({ 
                ageRange: min && max ? { min, max } : undefined 
              });
            }}
          >
            <option value="-">すべて</option>
            <option value="6-8">6-8歳</option>
            <option value="9-11">9-11歳</option>
            <option value="12-15">12-15歳</option>
          </select>
        </div>

        <div className="filter-group">
          <label>読書レベル:</label>
          <select
            value={filter.readingLevel?.[0] || ''}
            onChange={(e) => {
              const level = e.target.value;
              handleFilterChange({ 
                readingLevel: level ? [level] : undefined 
              });
            }}
          >
            <option value="">すべて</option>
            <option value="beginner">はじめて（初級）</option>
            <option value="intermediate">なれてきた（中級）</option>
            <option value="advanced">よく読める（上級）</option>
          </select>
        </div>

        <div className="filter-group">
          <label>興味分野:</label>
          <div className="interest-checkboxes">
            {['冒険', 'ファンタジー', 'スポーツ', '音楽', '科学', '動物', '推理', 'ユーモア'].map(interest => (
              <label key={interest} className="interest-checkbox">
                <input
                  type="checkbox"
                  checked={filter.interests?.includes(interest) || false}
                  onChange={(e) => {
                    const currentInterests = filter.interests || [];
                    const newInterests = e.target.checked
                      ? [...currentInterests, interest]
                      : currentInterests.filter(i => i !== interest);
                    handleFilterChange({ 
                      interests: newInterests.length > 0 ? newInterests : undefined 
                    });
                  }}
                />
                {interest}
              </label>
            ))}
          </div>
        </div>

        <button className="clear-filters-button" onClick={clearFilters}>
          🗑️ フィルタをクリア
        </button>
        
        <CacheClearButton variant="problematic" />
      </div>

      <div className="books-grid">
        <div className="results-header">
          <h3>📖 検索結果 ({filteredBooks.length}件)</h3>
          {totalPages > 1 && (
            <div className="pagination-info">
              ページ {currentPage} / {totalPages} (表示中: {currentBooks.length}冊)
            </div>
          )}
        </div>
        
        {filteredBooks.length === 0 ? (
          <div className="no-results">
            <p>条件に合う図書が見つかりませんでした。</p>
            <p>フィルタを変更して再度検索してみてください。</p>
          </div>
        ) : (
          <>
            <div className="books-list">
              {currentBooks.map(book => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
            
            {/* 🎨 改善されたページング制御UI */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-button prev"
                >
                  ← 前へ
                </button>
                
                <div className="pagination-numbers">
                  {/* 最初のページ */}
                  {currentPage > 3 && (
                    <>
                      <button
                        onClick={() => handlePageChange(1)}
                        className="pagination-number"
                      >
                        1
                      </button>
                      <span className="pagination-dots">...</span>
                    </>
                  )}
                  
                  {/* 現在ページ周辺のページ */}
                  {Array.from(
                    { length: Math.min(5, totalPages) }, 
                    (_, i) => {
                      let page;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return page;
                    }
                  ).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`pagination-number ${page === currentPage ? 'active' : ''}`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  {/* 最後のページ */}
                  {currentPage < totalPages - 2 && totalPages > 5 && (
                    <>
                      <span className="pagination-dots">...</span>
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        className="pagination-number"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-button next"
                >
                  次へ →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

interface BookCardProps {
  book: Book;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getReadingLevelLabel = (level: string) => {
    switch (level) {
      case 'beginner': return 'はじめて';
      case 'intermediate': return 'なれてきた';
      case 'advanced': return 'よく読める';
      default: return level;
    }
  };

  const getStarRating = (rating: number) => {
    return '⭐'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
  };


  return (
    <div className="book-card">
      <div className="book-card-header">
        <div className="book-info">
          <h4 className="book-title">{book.title}</h4>
          <p className="book-author">著者: {book.author}</p>
          <p className="book-publisher">{book.publisher} ({book.publishedDate})</p>
        </div>
        <CoverImage book={book} className="book-cover" size="medium" />
      </div>

      <div className="book-meta">
        <div className="meta-item">
          <span className="meta-label">対象年齢:</span>
          <span className="meta-value">{book.ageRange.min}-{book.ageRange.max}歳</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">読書レベル:</span>
          <span className="meta-value">{getReadingLevelLabel(book.readingLevel)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">評価:</span>
          <span className="meta-value">{getStarRating(book.rating)}</span>
        </div>
      </div>

      <div className="book-tags">
        {/* 🔧 重複修正: カテゴリーと興味分野を統合し重複を除去 */}
        {Array.from(new Set([...book.categories, ...book.interests])).slice(0, 5).map((tag, index) => (
          <span key={`${tag}-${index}`} className="category-tag">{tag}</span>
        ))}
      </div>

      {book.description && (
        <div className="book-description">
          <p className={`description-text ${isExpanded ? 'expanded' : ''}`}>
            {book.description}
          </p>
          {book.description.length > 100 && (
            <button 
              className="expand-button"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '▲ 閉じる' : '▼ もっと見る'}
            </button>
          )}
        </div>
      )}

      <div className="book-actions">
        {book.amazonUrl && (
          <a href={book.amazonUrl} target="_blank" rel="noopener noreferrer" className="action-link">
            🛒 購入する
          </a>
        )}
        {book.libraryUrl && (
          <a href={book.libraryUrl} target="_blank" rel="noopener noreferrer" className="action-link">
            🏛️ 図書館で探す
          </a>
        )}
      </div>

      <div className="book-source">
        <small>データ元: {book.source === 'google_books' ? 'Google Books' : book.source === 'rakuten' ? '楽天ブックス' : '手動登録'}</small>
      </div>
    </div>
  );
};

export default BookList;