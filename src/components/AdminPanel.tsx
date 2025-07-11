import React, { useState, useEffect } from 'react';
import { BookUpdateLog } from '../types/Book';
import { bookService } from '../services/bookService';
import { checkRecommendationCoverage, validateNewBook } from '../utils/bookValidation';
import { coverImageService } from '../services/coverImageService';
import { IntegratedImageSearchService } from '../services/imageSearch/IntegratedImageSearchService';
import { downloadBooksAsCSV, copyBooksToClipboard, getBookStatistics } from '../utils/bookDataExport';
import { importBooksFromTSV, ImportResult } from '../utils/bookDataImport';
import './AdminPanel.css';

interface AdminPanelProps {
  onBack?: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [updateLogs, setUpdateLogs] = useState<BookUpdateLog[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'update' | 'logs' | 'validation' | 'vision' | 'export'>('overview');
  const [validationResults, setValidationResults] = useState<any>(null);
  const [visionStats, setVisionStats] = useState<any>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const logs = bookService.getUpdateLogs();
    setUpdateLogs(logs);
    
    const stats = bookService.getStatistics();
    setStatistics(stats);

    // バリデーション結果も取得
    const allBooks = bookService.getAllBooks();
    const coverage = checkRecommendationCoverage(allBooks);
    setValidationResults(coverage);

    // Vision統計も取得
    const integratedService = IntegratedImageSearchService.getInstance();
    const visionStatistics = integratedService.getSearchStatistics();
    setVisionStats(visionStatistics);
  };

  const handleManualUpdate = async () => {
    setIsUpdating(true);
    try {
      await bookService.updateBookDatabase();
      loadData();
      alert('図書データベースの更新が完了しました！新しい本が追加されました。');
    } catch (error) {
      console.error('更新エラー:', error);
      alert('更新中にエラーが発生しました。API設定を確認して、しばらく後にもう一度お試しください。');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExportCSV = () => {
    const allBooks = bookService.getAllBooks();
    downloadBooksAsCSV(allBooks);
    alert('書籍データをCSVファイルとしてダウンロードしました');
  };

  const handleCopyToClipboard = async () => {
    try {
      const allBooks = bookService.getAllBooks();
      await copyBooksToClipboard(allBooks);
      alert('書籍データをクリップボードにコピーしました。Googleスプレッドシートに貼り付けてください。');
    } catch (error) {
      alert('クリップボードへのコピーに失敗しました');
    }
  };

  const handleImportFromTSV = async (tsvContent: string) => {
    setIsImporting(true);
    try {
      const result = await importBooksFromTSV(tsvContent);
      
      if (result.success && result.importedBooks.length > 0) {
        // 実際にbookServiceに書籍を追加
        const serviceResult = bookService.addOrUpdateBooks(result.importedBooks);
        
        // 結果を更新
        const finalResult: ImportResult = {
          ...result,
          addedBooks: serviceResult.added,
          updatedBooks: serviceResult.updated
        };
        
        setImportResult(finalResult);
        loadData(); // データを再読み込み
        
        alert(`インポート完了: ${serviceResult.added}冊追加、${serviceResult.updated}冊更新`);
      } else {
        setImportResult(result);
        alert('インポートに失敗しました。エラー詳細を確認してください。');
      }
    } catch (error) {
      alert(`インポートエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleImportFromTSV(content);
    };
    reader.readAsText(file);
  };

  const schedulePeriodicUpdate = () => {
    const confirmed = window.confirm(
      '定期更新を設定しますか？\n' +
      '• 年2〜3回（4月、8月、12月）に自動更新\n' +
      '• ブラウザを開いているときのみ実行\n' +
      '• API制限を考慮した安全な更新'
    );

    if (confirmed) {
      localStorage.setItem('bookUpdateSchedule', 'enabled');
      alert('定期更新が設定されました！次回の自動更新は4月・8月・12月のいずれかに実行されます。');
    }
  };

  const disablePeriodicUpdate = () => {
    localStorage.removeItem('bookUpdateSchedule');
    alert('定期更新を無効にしました。');
  };

  // 緊急キャッシュクリア機能
  const handleClearImageCache = () => {
    const confirmed = window.confirm(
      '🚨 緊急措置: 表紙画像キャッシュクリア\n\n' +
      '表紙画像のミスマッチ問題を解決するため、\n' +
      '全ての画像キャッシュをクリアします。\n\n' +
      '実行後、表紙画像は再取得されます。\n' +
      '処理を続行しますか？'
    );

    if (confirmed) {
      try {
        // アプリケーションキャッシュをクリア
        coverImageService.clearCache();
        
        // ブラウザストレージもクリア
        localStorage.removeItem('bookCoverImageCache');
        sessionStorage.clear();
        
        alert(
          '✅ キャッシュクリア完了！\n\n' +
          '表紙画像キャッシュを削除しました。\n' +
          'ページをリロードして変更を確認してください。'
        );
        
        // 統計を更新
        const stats = coverImageService.getCacheStats();
        console.log('📊 キャッシュクリア後の統計:', stats);
        
      } catch (error) {
        console.error('キャッシュクリアエラー:', error);
        alert('❌ キャッシュクリア中にエラーが発生しました。');
      }
    }
  };

  const handleRefreshAllImages = async () => {
    const confirmed = window.confirm(
      '🔄 全画像再取得\n\n' +
      '全ての書籍の表紙画像を再取得します。\n' +
      'この処理には時間がかかる場合があります。\n\n' +
      '実行しますか？'
    );

    if (confirmed) {
      setIsUpdating(true);
      try {
        // キャッシュクリア
        coverImageService.clearCache();
        
        // 現在表示されている書籍の画像を強制再取得
        const allBooks = bookService.getAllBooks();
        console.log(`🔄 ${allBooks.length}冊の画像を再取得開始...`);
        
        // 画像の再取得を促すためページリロードを推奨
        alert(
          '⚠️ 画像再取得を開始しました。\n\n' +
          'ページをリロードして結果を確認してください。\n' +
          '完了まで数分かかる場合があります。'
        );
        
      } catch (error) {
        console.error('画像再取得エラー:', error);
        alert('❌ 画像再取得中にエラーが発生しました。');
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const getUpdateStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'partial': return '⚠️';
      default: return '❓';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const isPeriodicUpdateEnabled = () => {
    return localStorage.getItem('bookUpdateSchedule') === 'enabled';
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="header-top">
          <h2>⚙️ 管理者パネル</h2>
          {onBack && (
            <button className="back-button" onClick={onBack}>
              ← もどる
            </button>
          )}
        </div>
        
        <div className="tab-navigation">
          <button 
            className={`tab-button ${selectedTab === 'overview' ? 'active' : ''}`}
            onClick={() => setSelectedTab('overview')}
          >
            📊 概要
          </button>
          <button 
            className={`tab-button ${selectedTab === 'update' ? 'active' : ''}`}
            onClick={() => setSelectedTab('update')}
          >
            🔄 更新管理
          </button>
          <button 
            className={`tab-button ${selectedTab === 'validation' ? 'active' : ''}`}
            onClick={() => setSelectedTab('validation')}
          >
            ✅ 品質管理
          </button>
          <button 
            className={`tab-button ${selectedTab === 'vision' ? 'active' : ''}`}
            onClick={() => setSelectedTab('vision')}
          >
            👁️ Vision検索
          </button>
          <button 
            className={`tab-button ${selectedTab === 'export' ? 'active' : ''}`}
            onClick={() => setSelectedTab('export')}
          >
            📄 エクスポート
          </button>
          <button 
            className={`tab-button ${selectedTab === 'logs' ? 'active' : ''}`}
            onClick={() => setSelectedTab('logs')}
          >
            📋 更新履歴
          </button>
        </div>
      </div>

      <div className="admin-content">
        {selectedTab === 'overview' && (
          <OverviewTab statistics={statistics} />
        )}
        
        {selectedTab === 'update' && (
          <UpdateTab 
            isUpdating={isUpdating}
            onManualUpdate={handleManualUpdate}
            onScheduleUpdate={schedulePeriodicUpdate}
            onDisableSchedule={disablePeriodicUpdate}
            isScheduleEnabled={isPeriodicUpdateEnabled()}
            onClearImageCache={handleClearImageCache}
            onRefreshAllImages={handleRefreshAllImages}
          />
        )}
        
        {selectedTab === 'logs' && (
          <LogsTab 
            updateLogs={updateLogs}
            getUpdateStatusIcon={getUpdateStatusIcon}
            formatDate={formatDate}
          />
        )}

        {selectedTab === 'validation' && (
          <ValidationTab 
            validationResults={validationResults}
            onRefresh={loadData}
          />
        )}

        {selectedTab === 'vision' && (
          <VisionTab 
            visionStats={visionStats}
            onRefresh={loadData}
          />
        )}

        {selectedTab === 'export' && (
          <ExportTab 
            onExportCSV={handleExportCSV}
            onCopyToClipboard={handleCopyToClipboard}
            onFileUpload={handleFileUpload}
            importResult={importResult}
            isImporting={isImporting}
            statistics={getBookStatistics(bookService.getAllBooks())}
          />
        )}
      </div>
    </div>
  );
};

interface OverviewTabProps {
  statistics: any;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ statistics }) => {
  if (!statistics) return <div>読み込み中...</div>;

  return (
    <div className="overview-tab">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <div className="stat-number">{statistics.totalBooks}</div>
            <div className="stat-label">総図書数</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-number">{statistics.lastUpdate}</div>
            <div className="stat-label">最終更新日</div>
          </div>
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-container">
          <h3>年齢別図書分布</h3>
          <div className="chart-bars">
            {Object.entries(statistics.byAgeRange).map(([range, count]) => (
              <div key={range} className="chart-bar">
                <div className="bar-label">{range}</div>
                <div className="bar-container">
                  <div 
                    className="bar-fill" 
                    style={{ width: `${(count as number / statistics.totalBooks) * 100}%` }}
                  ></div>
                </div>
                <div className="bar-value">{count as number}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-container">
          <h3>読書レベル別分布</h3>
          <div className="chart-bars">
            {Object.entries(statistics.byReadingLevel).map(([level, count]) => {
              const labels: { [key: string]: string } = {
                'beginner': 'はじめて',
                'intermediate': 'なれてきた',
                'advanced': 'よく読める'
              };
              return (
                <div key={level} className="chart-bar">
                  <div className="bar-label">{labels[level] || level}</div>
                  <div className="bar-container">
                    <div 
                      className="bar-fill" 
                      style={{ width: `${(count as number / statistics.totalBooks) * 100}%` }}
                    ></div>
                  </div>
                  <div className="bar-value">{count as number}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="chart-container">
          <h3>興味分野別分布</h3>
          <div className="interests-grid">
            {Object.entries(statistics.byInterests)
              .sort(([,a], [,b]) => (b as number) - (a as number))
              .slice(0, 8)
              .map(([interest, count]) => (
                <div key={interest} className="interest-item">
                  <span className="interest-name">{interest}</span>
                  <span className="interest-count">{count as number}</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
};

interface UpdateTabProps {
  isUpdating: boolean;
  onManualUpdate: () => void;
  onScheduleUpdate: () => void;
  onDisableSchedule: () => void;
  isScheduleEnabled: boolean;
  onClearImageCache: () => void;
  onRefreshAllImages: () => void;
}

const UpdateTab: React.FC<UpdateTabProps> = ({
  isUpdating,
  onManualUpdate,
  onScheduleUpdate,
  onDisableSchedule,
  isScheduleEnabled,
  onClearImageCache,
  onRefreshAllImages
}) => {
  return (
    <div className="update-tab">
      <div className="update-section">
        <h3>📥 手動更新</h3>
        <p>図書データベースを今すぐ更新します。Google Books APIから最新の児童書情報を取得します。</p>
        <button 
          className="manual-update-button"
          onClick={onManualUpdate}
          disabled={isUpdating}
        >
          {isUpdating ? '🔄 更新中...' : '🚀 今すぐ更新'}
        </button>
        <div className="update-note">
          <small>
            ⚠️ 注意: API制限により、大量のデータ取得には時間がかかる場合があります。
          </small>
        </div>
      </div>

      <div className="schedule-section">
        <h3>⏰ 定期更新設定</h3>
        <p>年2〜3回（4月・8月・12月）に自動的にデータベースを更新します。</p>
        
        <div className="schedule-status">
          <span className="status-label">現在の状態:</span>
          <span className={`status-value ${isScheduleEnabled ? 'enabled' : 'disabled'}`}>
            {isScheduleEnabled ? '✅ 有効' : '❌ 無効'}
          </span>
        </div>

        <div className="schedule-buttons">
          {!isScheduleEnabled ? (
            <button className="enable-schedule-button" onClick={onScheduleUpdate}>
              📅 定期更新を有効にする
            </button>
          ) : (
            <button className="disable-schedule-button" onClick={onDisableSchedule}>
              🚫 定期更新を無効にする
            </button>
          )}
        </div>

        <div className="schedule-info">
          <h4>定期更新の仕組み:</h4>
          <ul>
            <li>年3回（4月・8月・12月）に実行</li>
            <li>ブラウザが開いているときのみ動作</li>
            <li>API制限を考慮した安全な更新</li>
            <li>新しい本の自動追加</li>
            <li>重複の自動除去</li>
          </ul>
        </div>
      </div>

      <div className="emergency-section">
        <h3>🚨 緊急対応</h3>
        <p>表紙画像のミスマッチ問題など、緊急の問題を解決するための機能です。</p>
        
        <div className="emergency-buttons">
          <button 
            className="emergency-button cache-clear"
            onClick={onClearImageCache}
            disabled={isUpdating}
          >
            🗑️ 画像キャッシュクリア
          </button>
          
          <button 
            className="emergency-button image-refresh"
            onClick={onRefreshAllImages}
            disabled={isUpdating}
          >
            🔄 全画像再取得
          </button>
        </div>
        
        <div className="emergency-note">
          <small>
            ⚠️ これらの機能は表紙画像の問題解決用です。<br/>
            • キャッシュクリア: 間違った画像キャッシュを削除<br/>
            • 全画像再取得: 全ての書籍画像を強制的に再取得
          </small>
        </div>
      </div>

      <div className="api-info-section">
        <h3>🔑 API設定情報</h3>
        <div className="api-status">
          <div className="api-item">
            <span className="api-label">Google Books API:</span>
            <span className={`api-status-indicator ${process.env.REACT_APP_GOOGLE_BOOKS_API_KEY ? 'configured' : 'not-configured'}`}>
              {process.env.REACT_APP_GOOGLE_BOOKS_API_KEY ? '設定済み' : '未設定'}
            </span>
          </div>
          <div className="api-item">
            <span className="api-label">楽天ブックス API:</span>
            <span className={`api-status-indicator ${process.env.REACT_APP_RAKUTEN_APP_ID ? 'configured' : 'not-configured'}`}>
              {process.env.REACT_APP_RAKUTEN_APP_ID ? '設定済み' : '未設定'}
            </span>
          </div>
        </div>
        <div className="api-note">
          <small>
            💡 API設定は .env.local ファイルで行ってください。
          </small>
        </div>
      </div>
    </div>
  );
};

interface LogsTabProps {
  updateLogs: BookUpdateLog[];
  getUpdateStatusIcon: (status: string) => string;
  formatDate: (dateString: string) => string;
}

const LogsTab: React.FC<LogsTabProps> = ({ updateLogs, getUpdateStatusIcon, formatDate }) => {
  return (
    <div className="logs-tab">
      <h3>📋 更新履歴</h3>
      
      {updateLogs.length === 0 ? (
        <div className="no-logs">
          <p>まだ更新履歴がありません。</p>
          <p>手動更新を実行すると、ここに履歴が表示されます。</p>
        </div>
      ) : (
        <div className="logs-list">
          {updateLogs.map(log => (
            <div key={log.id} className="log-item">
              <div className="log-header">
                <div className="log-status">
                  {getUpdateStatusIcon(log.status)}
                  <span className="log-date">{formatDate(log.timestamp)}</span>
                </div>
                <div className="log-source">データ元: {log.source}</div>
              </div>
              
              <div className="log-details">
                <div className="log-stats">
                  <span className="log-stat">
                    📚 追加: {log.booksAdded}冊
                  </span>
                  <span className="log-stat">
                    🔄 更新: {log.booksUpdated}冊
                  </span>
                  <span className="log-stat">
                    🗑️ 削除: {log.booksRemoved}冊
                  </span>
                </div>
                
                {log.errorMessage && (
                  <div className="log-error">
                    ❌ エラー: {log.errorMessage}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// バリデーションタブコンポーネント
interface ValidationTabProps {
  validationResults: any;
  onRefresh: () => void;
}

const ValidationTab: React.FC<ValidationTabProps> = ({ validationResults, onRefresh }) => {
  if (!validationResults) {
    return (
      <div className="validation-tab">
        <div className="loading-message">
          <p>データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 90) return '#28a745'; // 緑
    if (coverage >= 80) return '#ffc107'; // 黄
    if (coverage >= 70) return '#fd7e14'; // オレンジ
    return '#dc3545'; // 赤
  };

  const getCoverageStatus = (coverage: number) => {
    if (coverage >= 90) return '優秀';
    if (coverage >= 80) return '良好';
    if (coverage >= 70) return '改善推奨';
    return '要改善';
  };

  return (
    <div className="validation-tab">
      <div className="validation-header">
        <h3>📊 図書データ品質レポート</h3>
        <button className="refresh-button" onClick={onRefresh}>
          🔄 更新
        </button>
      </div>

      {/* 推薦カバレッジ概要 */}
      <div className="coverage-overview">
        <h4>推薦カバレッジ</h4>
        <div className="coverage-card">
          <div className="coverage-main">
            <div 
              className="coverage-circle"
              style={{ 
                background: `conic-gradient(${getCoverageColor(validationResults.coverage)} ${validationResults.coverage * 3.6}deg, #e9ecef 0deg)`
              }}
            >
              <div className="coverage-inner">
                <span className="coverage-percent">{Math.round(validationResults.coverage)}%</span>
                <span className="coverage-label">カバー率</span>
              </div>
            </div>
            <div className="coverage-status">
              <span className="status-badge" style={{ backgroundColor: getCoverageColor(validationResults.coverage) }}>
                {getCoverageStatus(validationResults.coverage)}
              </span>
            </div>
          </div>
          <div className="coverage-details">
            <div className="coverage-stat">
              <span className="stat-label">総図書数:</span>
              <span className="stat-value">{validationResults.totalBooks}冊</span>
            </div>
            <div className="coverage-stat">
              <span className="stat-label">推薦可能:</span>
              <span className="stat-value green">{validationResults.recommendableBooks}冊</span>
            </div>
            <div className="coverage-stat">
              <span className="stat-label">推薦困難:</span>
              <span className="stat-value red">{validationResults.unrecommendableBooks.length}冊</span>
            </div>
          </div>
        </div>
      </div>

      {/* 推薦困難な図書のリスト */}
      {validationResults.unrecommendableBooks.length > 0 && (
        <div className="problematic-books">
          <h4>⚠️ 推薦困難な図書 ({validationResults.unrecommendableBooks.length}冊)</h4>
          <div className="books-list">
            {validationResults.unrecommendableBooks.slice(0, 10).map((book: any, index: number) => {
              const validation = validateNewBook(book);
              return (
                <div key={book.id || index} className="book-item problematic">
                  <div className="book-header">
                    <span className="book-title">「{book.title}」</span>
                    <span className="book-author">{book.author}</span>
                    <span className="validation-score">
                      スコア: {validation.score}点
                    </span>
                  </div>
                  <div className="book-issues">
                    {validation.errors.map((error, i) => (
                      <div key={i} className="issue error">❌ {error}</div>
                    ))}
                    {validation.warnings.map((warning, i) => (
                      <div key={i} className="issue warning">⚠️ {warning}</div>
                    ))}
                  </div>
                  {validation.recommendations.length > 0 && (
                    <div className="book-recommendations">
                      <strong>改善提案:</strong>
                      {validation.recommendations.map((rec, i) => (
                        <div key={i} className="recommendation">💡 {rec}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {validationResults.unrecommendableBooks.length > 10 && (
              <div className="more-books-notice">
                ...他 {validationResults.unrecommendableBooks.length - 10}冊
              </div>
            )}
          </div>
        </div>
      )}

      {/* データ品質ガイドライン */}
      <div className="quality-guidelines">
        <h4>📋 図書登録品質ガイドライン</h4>
        <div className="guidelines-grid">
          <div className="guideline-item">
            <div className="guideline-icon">🎯</div>
            <div className="guideline-content">
              <h5>年齢範囲</h5>
              <p>6-15歳の範囲内で適切に設定</p>
            </div>
          </div>
          <div className="guideline-item">
            <div className="guideline-icon">❤️</div>
            <div className="guideline-content">
              <h5>興味分野</h5>
              <p>標準項目から最低1つ、合計3つ以上推奨</p>
            </div>
          </div>
          <div className="guideline-item">
            <div className="guideline-icon">📚</div>
            <div className="guideline-content">
              <h5>読書レベル</h5>
              <p>年齢に適した適切なレベル設定</p>
            </div>
          </div>
          <div className="guideline-item">
            <div className="guideline-icon">⭐</div>
            <div className="guideline-content">
              <h5>推薦スコア</h5>
              <p>60点以上推奨、40点未満は登録不可</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Vision検索タブコンポーネント
interface VisionTabProps {
  visionStats: any;
  onRefresh: () => void;
}

const VisionTab: React.FC<VisionTabProps> = ({ visionStats, onRefresh }) => {
  const integratedService = IntegratedImageSearchService.getInstance();

  const handleClearVisionCache = () => {
    const confirmed = window.confirm(
      '🧹 Vision検索キャッシュクリア\n\n' +
      'Gemini Vision APIの検索結果キャッシュを\n' +
      'クリアして、新しい検索を強制実行します。\n\n' +
      '実行しますか？'
    );

    if (confirmed) {
      integratedService.clearCache();
      onRefresh();
      alert('✅ Vision検索キャッシュをクリアしました');
    }
  };

  const handleTestVisionSearch = async () => {
    const title = prompt('テスト検索する書籍タイトルを入力してください:');
    const author = prompt('著者名を入力してください:');
    
    if (title && author) {
      const testBook = {
        id: 'test_' + Date.now(),
        title,
        author,
        isbn: '',
        coverImage: '',
        description: 'テスト書籍',
        ageRange: { min: 6, max: 12 },
        readingLevel: '小学校低学年' as const,
        vocabularyLevel: 3,
        interests: ['冒険'],
        categories: ['児童書'],
        rating: 4.0,
        publishedDate: '2024',
        publisher: 'テスト出版',
        lastUpdated: new Date().toISOString(),
        source: 'manual' as const
      };

      try {
        console.log('🔍 Vision検索テスト開始...');
        const result = await integratedService.getImageForBook(testBook);
        console.log('✅ Vision検索テスト完了:', result);
        alert(`Vision検索テスト完了！\nコンソール（F12）で詳細ログを確認してください。`);
        onRefresh();
      } catch (error) {
        console.error('❌ Vision検索テストエラー:', error);
        alert('Vision検索テストでエラーが発生しました。');
      }
    }
  };

  if (!visionStats) {
    return (
      <div className="vision-tab">
        <div className="loading-message">
          <p>Vision統計を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vision-tab">
      <div className="vision-header">
        <h3>👁️ Gemini Vision API 表紙画像検索</h3>
        <p>AI画像認識による高精度な表紙画像マッチング</p>
      </div>

      {/* Vision API 利用状況 */}
      <div className="vision-status">
        <div className="status-card">
          <h4>🔧 API利用状況</h4>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Vision API:</span>
              <span className={`status-value ${visionStats.visionAvailable ? 'success' : 'error'}`}>
                {visionStats.visionAvailable ? '✅ 利用可能' : '❌ 利用不可'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">総検索数:</span>
              <span className="status-value">{visionStats.totalSearches}件</span>
            </div>
            <div className="status-item">
              <span className="status-label">最終更新:</span>
              <span className="status-value">
                {new Date(visionStats.lastUpdate).toLocaleString('ja-JP')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 検索成功率統計 */}
      <div className="success-rates">
        <h4>📊 検索成功率</h4>
        <div className="rates-grid">
          <div className="rate-card vision">
            <div className="rate-header">
              <span className="rate-icon">👁️</span>
              <span className="rate-title">Vision API検索</span>
            </div>
            <div className="rate-value">{visionStats.visionSuccessRate}</div>
            <div className="rate-description">画像認識による高精度マッチング</div>
          </div>
          
          <div className="rate-card strict">
            <div className="rate-header">
              <span className="rate-icon">🔍</span>
              <span className="rate-title">厳格検索</span>
            </div>
            <div className="rate-value">{visionStats.strictSuccessRate}</div>
            <div className="rate-description">著者一致必須の従来検索</div>
          </div>
          
          <div className="rate-card placeholder">
            <div className="rate-header">
              <span className="rate-icon">📋</span>
              <span className="rate-title">プレースホルダー</span>
            </div>
            <div className="rate-value">{visionStats.placeholderRate}</div>
            <div className="rate-description">適切な画像が見つからない場合</div>
          </div>
        </div>
      </div>

      {/* 管理機能 */}
      <div className="vision-controls">
        <h4>🛠️ Vision検索管理</h4>
        <div className="controls-grid">
          <button 
            className="control-button primary"
            onClick={handleTestVisionSearch}
          >
            🧪 Vision検索テスト
          </button>
          
          <button 
            className="control-button secondary"
            onClick={handleClearVisionCache}
          >
            🗑️ キャッシュクリア
          </button>
          
          <button 
            className="control-button secondary"
            onClick={onRefresh}
          >
            🔄 統計更新
          </button>
        </div>
      </div>

      {/* Vision検索の特徴 */}
      <div className="vision-features">
        <h4>✨ Vision検索の特徴</h4>
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon">🎯</div>
            <div className="feature-content">
              <h5>高精度マッチング</h5>
              <p>画像内のタイトル・著者を直接認識</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🔍</div>
            <div className="feature-content">
              <h5>複数候補検証</h5>
              <p>複数の検索結果から最適な画像を選択</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🚫</div>
            <div className="feature-content">
              <h5>誤認防止</h5>
              <p>著者不一致の画像を確実に排除</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">💾</div>
            <div className="feature-content">
              <h5>インテリジェントキャッシュ</h5>
              <p>高信頼度の結果を効率的に保存</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export Tab Component
interface ExportTabProps {
  onExportCSV: () => void;
  onCopyToClipboard: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  importResult: ImportResult | null;
  isImporting: boolean;
  statistics: any;
}

const ExportTab: React.FC<ExportTabProps> = ({
  onExportCSV,
  onCopyToClipboard, 
  onFileUpload,
  importResult,
  isImporting,
  statistics
}) => {
  return (
    <div className="export-tab">
      <div className="export-header">
        <h3>📄 データエクスポート・インポート</h3>
        <p>書籍データのCSVエクスポートとスプレッドシート連携</p>
      </div>

      {/* データエクスポート */}
      <div className="export-section">
        <h4>📤 データエクスポート</h4>
        <div className="export-controls">
          <button 
            className="control-button primary"
            onClick={onExportCSV}
          >
            💾 CSVファイルダウンロード
          </button>
          <button 
            className="control-button secondary"
            onClick={onCopyToClipboard}
          >
            📋 スプレッドシート用コピー
          </button>
        </div>
        <div className="export-info">
          <p><strong>総書籍数:</strong> {statistics?.total || 0}冊</p>
          <p><strong>表紙画像あり:</strong> {statistics?.withCoverImage || 0}冊</p>
          <p><strong>ISBNあり:</strong> {statistics?.withISBN || 0}冊</p>
        </div>
      </div>

      {/* 新規書籍追加 */}
      <div className="add-book-section">
        <h4>📖 新規書籍追加</h4>
        <div className="add-book-controls">
          <button 
            className="control-button primary"
            onClick={() => {
              const template = `新規書籍_${Date.now()}\t著者名\t出版社\t2024\t8\t12\t小学校中学年\t5\t物語;冒険\t冒険;友情\t4.0\t200\t\tあらすじを入力してください\t\t\t\t${new Date().toISOString().split('T')[0]}\tmanual`;
              navigator.clipboard.writeText(`ID\tタイトル\t著者\t出版社\t出版日\t対象年齢（最小）\t対象年齢（最大）\t読書レベル\t語彙レベル\tジャンル\t興味分野\t評価\tページ数\tISBN\tあらすじ\t表紙画像URL\tAmazonURL\t図書館URL\t更新日\tデータソース\n${template}`);
              alert('新規書籍テンプレートをクリップボードにコピーしました。スプレッドシートに貼り付けて編集してください。');
            }}
          >
            ➕ 新規書籍テンプレート生成
          </button>
        </div>
      </div>

      {/* データインポート */}
      <div className="import-section">
        <h4>📥 データインポート</h4>
        <div className="import-controls">
          <label className="file-upload-label">
            <input 
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={onFileUpload}
              disabled={isImporting}
            />
            📁 ファイルを選択
          </label>
          {isImporting && (
            <div className="importing-status">
              ⏳ インポート中...
            </div>
          )}
        </div>
        
        {/* インポート手順 */}
        <div className="import-instructions">
          <h5>📈 Googleスプレッドシート連携手順</h5>
          <ol>
            <li>「スプレッドシート用コピー」ボタンでデータをコピー</li>
            <li>Googleスプレッドシートに貼り付け</li>
            <li>表紙画像が不正確な書籍の正しい画像URLを編集</li>
            <li>スプレッドシートをTSV形式でエクスポート</li>
            <li>エクスポートしたファイルをアップロード</li>
          </ol>
        </div>
      </div>

      {/* インポート結果 */}
      {importResult && (
        <div className="import-result">
          <h4>📈 インポート結果</h4>
          <div className="result-stats">
            <div className="stat-item success">
              <span className="stat-label">追加:</span>
              <span className="stat-value">{importResult.addedBooks}冊</span>
            </div>
            <div className="stat-item info">
              <span className="stat-label">更新:</span>
              <span className="stat-value">{importResult.updatedBooks}冊</span>
            </div>
            <div className="stat-item error">
              <span className="stat-label">エラー:</span>
              <span className="stat-value">{importResult.errors.length}件</span>
            </div>
          </div>
          
          {importResult.errors.length > 0 && (
            <div className="error-details">
              <h5>⚠️ エラー詳細</h5>
              <ul>
                {importResult.errors.map((error, index) => (
                  <li key={index}>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;