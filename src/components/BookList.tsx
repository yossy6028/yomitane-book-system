import React, { useState, useEffect } from 'react';
import { Book } from '../types/Book';
import { bookService } from '../services/bookService';
import { BookCard } from './BookCard';
import { Pagination } from './Pagination';
import { FacetedSearch } from './FacetedSearch';
import { Ruby, RubyText } from './Ruby';
import { usePagination } from '../hooks/usePagination';
import { useBookFilter } from '../hooks/useBookFilter';
import './BookList.css';

interface BookListProps {
  onBack?: () => void;
}

const BookList: React.FC<BookListProps> = ({ onBack }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [facetFilteredBooks, setFacetFilteredBooks] = useState<Book[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  
  // カスタムフックを使用
  const { filteredBooks, filter, updateFilter } = useBookFilter({ books });
  const finalFilteredBooks = facetFilteredBooks !== null ? facetFilteredBooks : filteredBooks;
  
  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    goToPage: handlePageChange,
    reset: resetPagination
  } = usePagination({
    totalItems: finalFilteredBooks.length,
    itemsPerPage: 12
  });

  useEffect(() => {
    loadBooks();
    loadStatistics();
  }, []);

  // ページネーションリセットは必要時のみ手動で実行（自動リセットは削除）

  const loadBooks = () => {
    const allBooks = bookService.getAllBooks();
    setBooks(allBooks);
  };

  const loadStatistics = () => {
    const stats = bookService.getStatistics();
    setStatistics(stats);
  };
  
  // 現在のページの書籍を計算
  const currentBooks = finalFilteredBooks.slice(startIndex, endIndex);

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
          <h2>📚 <RubyText.図書 />一覧</h2>
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
              <span className="stat-label"><RubyText.登録 /><RubyText.図書 />数</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{statistics.lastUpdate}</span>
              <span className="stat-label">最終<RubyText.更新 /></span>
            </div>
            <button 
              className="update-button" 
              onClick={handleUpdateBooks}
              disabled={isLoading}
            >
              {isLoading ? <><RubyText.更新 />中...</> : <>📥 <RubyText.図書 /><RubyText.更新 /></>}
            </button>
          </div>
        )}
      </div>

      <div className="search-section">
        <h3>🔍 <RubyText.書籍 />を探す</h3>
        <div className="filter-group">
          <label><RubyText.検索 />キーワード:</label>
          <input
            type="text"
            placeholder="タイトル、ちょしゃ、内容でけんさく..."
            value={filter.searchTerm || ''}
            onChange={(e) => updateFilter({ searchTerm: e.target.value })}
            className="search-input"
          />
        </div>
      </div>

      <FacetedSearch 
        books={books} 
        onFilterChange={(filtered) => {
          setFacetFilteredBooks(filtered);
          // フィルタが実際に変更された場合のみリセット
          if (filtered !== facetFilteredBooks) {
            resetPagination();
          }
        }}
      />

      <div className="books-grid">
        <div className="results-header">
          <h3>📖 検索結果 ({finalFilteredBooks.length}件)</h3>
          {totalPages > 1 && (
            <div className="pagination-info">
              ページ {currentPage} / {totalPages} (表示中: {currentBooks.length}冊)
            </div>
          )}
        </div>
        
        {finalFilteredBooks.length === 0 ? (
          <div className="no-results">
            <p>条件に合う図書が見つかりませんでした。</p>
            <p>フィルタを変更して再度検索してみてください。</p>
          </div>
        ) : (
          <>
            <div className="books-list">
              {currentBooks.map((book, index) => (
                <BookCard key={`${book.id}-page${currentPage}-${index}`} book={book} />
              ))}
            </div>
            
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </div>
  );
};


export default BookList;