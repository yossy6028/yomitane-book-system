import React, { useState, useEffect, useCallback } from 'react';
import { Book } from '../types/Book';
import { bookService } from '../services/bookService';
import { BookCard } from './BookCard';
import { Pagination } from './Pagination';
import { FacetedSearch } from './FacetedSearch';
import { BookFilterAndSort } from './BookFilterAndSort';
import { AdvancedSearchButton } from './AdvancedSearchButton';
import { Ruby, RubyText } from './Ruby';
import { usePagination } from '../hooks/usePagination';
import { useBookFilter } from '../hooks/useBookFilter';
import './BookList.css';

interface BookListProps {
  onBack?: () => void;
  testResult?: any; // テスト結果を受け取る
}

const BookList: React.FC<BookListProps> = ({ onBack, testResult }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [facetFilteredBooks, setFacetFilteredBooks] = useState<Book[] | null>(null);
  const [filterAndSortBooks, setFilterAndSortBooks] = useState<Book[] | null>(null);
  const [advancedSearchBooks, setAdvancedSearchBooks] = useState<Book[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  
  // カスタムフックを使用
  const { filteredBooks, filter, updateFilter } = useBookFilter({ books, testResult });
  
  // フィルタリングの優先順位: advancedSearchBooks > filterAndSortBooks > facetFilteredBooks > filteredBooks
  const finalFilteredBooks = advancedSearchBooks !== null
    ? advancedSearchBooks
    : (filterAndSortBooks !== null 
      ? filterAndSortBooks 
      : (facetFilteredBooks !== null ? facetFilteredBooks : filteredBooks));
  
  // デバッグ: フィルタリング状態を確認
  React.useEffect(() => {
    const activeFilter = advancedSearchBooks !== null ? 'advancedSearch' :
                        filterAndSortBooks !== null ? 'filterAndSort' :
                        facetFilteredBooks !== null ? 'facetedSearch' : 'useBookFilter';
    
    console.log('[BookList] 📊 フィルタリング状態:', {
      totalBooks: books.length,
      advancedSearchBooks: advancedSearchBooks?.length || null,
      filterAndSortBooks: filterAndSortBooks?.length || null,
      facetFilteredBooks: facetFilteredBooks?.length || null,
      filteredBooks: filteredBooks.length,
      finalFilteredBooks: finalFilteredBooks.length,
      activeFilter
    });
    
    // 実際に表示される書籍のレベルを確認
    if (finalFilteredBooks.length > 0) {
      const levelDistribution = finalFilteredBooks.reduce((acc, book) => {
        const level = book.reading_level_24 || 'undefined';
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {} as Record<string | number, number>);
      
      console.log('[BookList] 📚 表示される書籍のレベル分布:', levelDistribution);
      console.log('[BookList] 📖 表示される書籍例（最初の5冊）:', finalFilteredBooks.slice(0, 5).map(b => ({ 
        title: b.title, 
        level: b.reading_level_24 
      })));
    }
  }, [books.length, advancedSearchBooks, filterAndSortBooks, facetFilteredBooks, filteredBooks.length, finalFilteredBooks.length, finalFilteredBooks]);
  
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
              {isLoading ? (
                <React.Fragment>
                  <RubyText.更新 />中...
                </React.Fragment>
              ) : (
                <React.Fragment>
                  📥 <RubyText.図書 /><RubyText.更新 />
                </React.Fragment>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="search-section">
        <div className="search-header">
          <h3>🔍 <RubyText.書籍 />を探す</h3>
          <AdvancedSearchButton
            books={books}
            onFilterChange={useCallback((filtered: Book[] | null) => {
              console.log('[BookList] AdvancedSearchButton onFilterChange:', filtered ? `${filtered.length}冊` : 'null (フィルタなし)');
              // AdvancedSearchButtonが明示的にフィルタを設定した場合のみ上書き
              if (filtered && filtered.length > 0) {
                setAdvancedSearchBooks(filtered);
                setFacetFilteredBooks(null);
                setFilterAndSortBooks(null);
                resetPagination();
              } else if (filtered === null) {
                // filteredがnullの場合は、AdvancedSearchBooksをクリア（BookFilterAndSortを優先）
                setAdvancedSearchBooks(null);
              }
            }, [resetPagination])}
            currentFilter={{
              searchTerm: filter.searchTerm,
              ageRange: filter.ageRange,
              interests: filter.interests,
              readingLevel: filter.readingLevel24,
              categories: filter.categories
            }}
          />
        </div>
        <div className="filter-group">
          <label><RubyText.検索 />キーワード:</label>
          <input
            type="text"
            placeholder="タイトル、ちょしゃ、内容でけんさく..."
            value={filter.searchTerm || ''}
            onChange={(e) => {
              updateFilter({ searchTerm: e.target.value });
              setAdvancedSearchBooks(null);
            }}
            className="search-input"
          />
        </div>
      </div>

      {/* レベル別・ジャンル別フィルタとソート */}
      <BookFilterAndSort
        books={books}
        onFilterChange={useCallback((filtered: Book[] | null) => {
          console.log('[BookList] BookFilterAndSort onFilterChange:', filtered ? `${filtered.length}冊` : 'null (フィルタなし)');
          setFilterAndSortBooks(filtered); // filteredがnullの場合はnullを設定
          if (filtered !== null) {
            setFacetFilteredBooks(null); // BookFilterAndSort使用時はFacetedSearchをリセット
            setAdvancedSearchBooks(null); // BookFilterAndSort使用時はAdvancedSearchをリセット
            resetPagination();
          }
        }, [resetPagination])}
        onSortChange={useCallback((sorted: Book[] | null) => {
          console.log('[BookList] BookFilterAndSort onSortChange:', sorted ? `${sorted.length}冊` : 'null (フィルタなし)');
          setFilterAndSortBooks(sorted); // sortedがnullの場合はnullを設定
          if (sorted !== null) {
            setFacetFilteredBooks(null); // BookFilterAndSort使用時はFacetedSearchをリセット
            setAdvancedSearchBooks(null); // BookFilterAndSort使用時はAdvancedSearchをリセット
            resetPagination();
          }
        }, [resetPagination])}
      />

      <FacetedSearch 
        books={books} 
        onFilterChange={(filtered) => {
          console.log('[BookList] FacetedSearch onFilterChange:', filtered ? `${filtered.length}冊` : 'null (フィルタなし)');
          // filteredがnullまたは空の場合は何もしない
          if (filtered) {
            setFacetFilteredBooks(filtered);
            setFilterAndSortBooks(null); // ファセット検索時はフィルタ&ソートをリセット
            setAdvancedSearchBooks(null); // ファセット検索時はAdvancedSearchをリセット
            resetPagination();
          } else if (filtered === null) {
            // nullの場合はFacetedSearchをクリア
            setFacetFilteredBooks(null);
          }
        }}
      />

      {/* テスト結果フィルター */}
      {testResult && (
        <div className="test-result-filter">
          <h3>🎯 <RubyText.テスト /><RubyText.結果 />に<RubyText.基 />づく<RubyText.推薦 /></h3>
          <div className="test-result-summary">
            <p className="test-summary-item">📖 読書レベル: <strong>{testResult.readingLevel || '未設定'}</strong></p>
            <p className="test-summary-item">💎 宝石レベル: <strong>Lv.{testResult.gemLevel || '0'}</strong></p>
            <p className="test-summary-item">📊 総合スコア: <strong>{testResult.totalScore || 0}点</strong></p>
          </div>
          <div className="filter-options">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={filter.testResultFilter?.enabled || false}
                onChange={(e) => updateFilter({
                  testResultFilter: {
                    ...filter.testResultFilter,
                    enabled: e.target.checked
                  }
                })}
              />
              <span>✅ テスト結果に基づく最適な本を優先表示</span>
            </label>
            
            {filter.testResultFilter?.enabled && (
              <div className="test-filter-details">
                <div className="test-scores-display">
                  <p>📖 語彙力スコア: {testResult.vocabularyScore}点</p>
                  <p>🌐 常識力スコア: {testResult.commonSenseScore}点</p>
                  <p>💎 推薦レベル: Lv.{testResult.gemLevel} 〜 Lv.{testResult.gemLevel + 1}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="books-section">
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