import React, { useState, useEffect, useCallback } from 'react';
import { UserStats, User, ActivityLog } from '../types/User';
import { userService } from '../services/userService';
import { bookService } from '../services/bookService';
import './AdminDashboard.css';

interface AdminDashboardProps {
  onBack: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'users' | 'books' | 'activity'>('overview');
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const userStats = userService.getUserStats();
      const allUsers = userService.getAllUsers();
      const logs = userService.getAllActivityLogs();
      
      // 日付範囲でフィルタリング
      const filteredLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        return logDate >= startDate && logDate <= endDate;
      });

      setStats(userStats);
      setUsers(allUsers);
      setActivityLogs(filteredLogs);
    } catch (error) {
      console.error('Dashboard data loading failed:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const exportData = (type: 'users' | 'activity' | 'stats') => {
    const timestamp = new Date().toISOString().split('T')[0];
    let data: any;
    let filename: string;

    switch (type) {
      case 'users':
        data = users.map(user => ({
          ユーザー名: user.username,
          表示名: user.displayName,
          年齢: user.age,
          読書レベル: user.readingLevel,
          興味分野: user.interests.join('・'),
          語彙スコア: user.vocabularyScore,
          登録日: user.createdAt.split('T')[0],
          最終アクティブ: user.lastActiveAt.split('T')[0],
          アクティブ: user.isActive ? 'はい' : 'いいえ'
        }));
        filename = `users_${timestamp}.json`;
        break;
      case 'activity':
        data = activityLogs.map(log => ({
          ユーザーID: log.userId,
          アクション: log.action,
          詳細: JSON.stringify(log.details),
          日時: log.timestamp
        }));
        filename = `activity_${timestamp}.json`;
        break;
      case 'stats':
        data = stats;
        filename = `stats_${timestamp}.json`;
        break;
      default:
        return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderOverview = () => {
    if (!stats) return <div>統計データを読み込んでいます...</div>;

    return (
      <div className="overview-grid">
        <div className="stat-card">
          <h3>👥 ユーザー統計</h3>
          <div className="stat-item">
            <span className="stat-number">{stats.totalUsers}</span>
            <span className="stat-label">総ユーザー数</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.activeUsers}</span>
            <span className="stat-label">アクティブユーザー</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.newUsersThisMonth}</span>
            <span className="stat-label">今月の新規ユーザー</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.averageAge.toFixed(1)}</span>
            <span className="stat-label">平均年齢</span>
          </div>
        </div>

        <div className="stat-card">
          <h3>📚 読書統計</h3>
          <div className="stat-item">
            <span className="stat-number">{stats.totalBooksRead}</span>
            <span className="stat-label">総読書冊数</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{Math.round(stats.totalReadingTime / 60)}h</span>
            <span className="stat-label">総読書時間</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{Math.round(stats.averageReadingTime)}</span>
            <span className="stat-label">平均読書時間（分）</span>
          </div>
        </div>

        <div className="stat-card">
          <h3>🎯 目標・習慣統計</h3>
          <div className="stat-item">
            <span className="stat-number">{stats.goalStats.totalGoals}</span>
            <span className="stat-label">設定された目標数</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.goalStats.completionRate.toFixed(1)}%</span>
            <span className="stat-label">目標達成率</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.streakStats.activeStreaks}</span>
            <span className="stat-label">継続中のストリーク</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.streakStats.longestStreak}</span>
            <span className="stat-label">最長連続記録</span>
          </div>
        </div>

        <div className="stat-card">
          <h3>📊 テスト統計</h3>
          <div className="stat-item">
            <span className="stat-number">{stats.testScoreDistribution.vocabularyAverage.toFixed(1)}</span>
            <span className="stat-label">語彙力平均点</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.testScoreDistribution.commonSenseAverage.toFixed(1)}</span>
            <span className="stat-label">常識力平均点</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.testScoreDistribution.overallAverage.toFixed(1)}</span>
            <span className="stat-label">総合レベル平均</span>
          </div>
        </div>

        <div className="stat-card full-width">
          <h3>📈 読書レベル分布</h3>
          <div className="distribution-chart">
            {Object.entries(stats.readingLevelDistribution).map(([level, count]) => (
              <div key={level} className="distribution-item">
                <span className="distribution-label">{level}</span>
                <div className="distribution-bar">
                  <div 
                    className="distribution-fill" 
                    style={{ width: `${(count / stats.totalUsers) * 100}%` }}
                  ></div>
                  <span className="distribution-count">{count}人</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="stat-card full-width">
          <h3>🏆 人気図書トップ10</h3>
          <div className="top-books">
            {stats.topBooks.slice(0, 10).map((book, index) => (
              <div key={book.bookId} className="book-rank-item">
                <span className="rank">#{index + 1}</span>
                <span className="book-title">{book.title || `図書ID: ${book.bookId}`}</span>
                <span className="read-count">{book.readCount}回読了</span>
                <span className="average-rating">⭐ {book.averageRating.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderUsers = () => (
    <div className="users-section">
      <div className="section-header">
        <h3>👥 ユーザー一覧 ({users.length}名)</h3>
        <button onClick={() => exportData('users')} className="export-button">
          📥 ユーザーデータをエクスポート
        </button>
      </div>
      
      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>ユーザー名</th>
              <th>表示名</th>
              <th>年齢</th>
              <th>読書レベル</th>
              <th>語彙スコア</th>
              <th>登録日</th>
              <th>最終アクティブ</th>
              <th>ステータス</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.displayName}</td>
                <td>{user.age}歳</td>
                <td>{user.readingLevel}</td>
                <td>{user.vocabularyScore}/10</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>{new Date(user.lastActiveAt).toLocaleDateString()}</td>
                <td>
                  <span className={`status ${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? 'アクティブ' : '非アクティブ'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderBooks = () => {
    const allBooks = bookService.getAllBooks();
    const allRecords = userService.getAllReadingRecords();
    
    // 図書ごとの統計を計算
    const bookStats = allBooks.map(book => {
      const bookRecords = allRecords.filter(r => r.bookId === book.id);
      const completedRecords = bookRecords.filter(r => r.status === 'completed');
      
      return {
        ...book,
        totalReads: bookRecords.length,
        completedReads: completedRecords.length,
        averageRating: completedRecords.length > 0 
          ? completedRecords.reduce((sum, r) => sum + (r.rating || 0), 0) / completedRecords.length 
          : 0,
        averageReadingTime: completedRecords.length > 0
          ? completedRecords.reduce((sum, r) => sum + r.readingTime, 0) / completedRecords.length
          : 0
      };
    });

    return (
      <div className="books-section">
        <div className="section-header">
          <h3>📚 図書統計 ({allBooks.length}冊)</h3>
          <button onClick={() => exportData('stats')} className="export-button">
            📊 統計データをエクスポート
          </button>
        </div>
        
        <div className="books-table">
          <table>
            <thead>
              <tr>
                <th>タイトル</th>
                <th>著者</th>
                <th>読書回数</th>
                <th>完読回数</th>
                <th>平均評価</th>
                <th>平均読書時間</th>
                <th>対象年齢</th>
                <th>読書レベル</th>
              </tr>
            </thead>
            <tbody>
              {bookStats
                .sort((a, b) => b.totalReads - a.totalReads)
                .map(book => (
                <tr key={book.id}>
                  <td>{book.title}</td>
                  <td>{book.author}</td>
                  <td>{book.totalReads}</td>
                  <td>{book.completedReads}</td>
                  <td>{book.averageRating > 0 ? `⭐ ${book.averageRating.toFixed(1)}` : '-'}</td>
                  <td>{book.averageReadingTime > 0 ? `${Math.round(book.averageReadingTime)}分` : '-'}</td>
                  <td>{book.ageRange.min}-{book.ageRange.max}歳</td>
                  <td>{book.readingLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderActivity = () => (
    <div className="activity-section">
      <div className="section-header">
        <h3>📊 アクティビティログ ({activityLogs.length}件)</h3>
        <div className="date-range-selector">
          <label>
            開始日:
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
          </label>
          <label>
            終了日:
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </label>
        </div>
        <button onClick={() => exportData('activity')} className="export-button">
          📥 アクティビティをエクスポート
        </button>
      </div>
      
      <div className="activity-table">
        <table>
          <thead>
            <tr>
              <th>日時</th>
              <th>ユーザー</th>
              <th>アクション</th>
              <th>詳細</th>
            </tr>
          </thead>
          <tbody>
            {activityLogs
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 100) // 最新100件のみ表示
              .map(log => {
                const user = users.find(u => u.id === log.userId);
                return (
                  <tr key={log.id}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>{user?.displayName || log.userId}</td>
                    <td>
                      <span className={`action-tag ${log.action}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>{JSON.stringify(log.details)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>ダッシュボードを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>🏛️ 本部管理ダッシュボード</h1>
        <button onClick={onBack} className="back-button">← 戻る</button>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={selectedTab === 'overview' ? 'active' : ''}
          onClick={() => setSelectedTab('overview')}
        >
          📊 概要
        </button>
        <button 
          className={selectedTab === 'users' ? 'active' : ''}
          onClick={() => setSelectedTab('users')}
        >
          👥 ユーザー
        </button>
        <button 
          className={selectedTab === 'books' ? 'active' : ''}
          onClick={() => setSelectedTab('books')}
        >
          📚 図書
        </button>
        <button 
          className={selectedTab === 'activity' ? 'active' : ''}
          onClick={() => setSelectedTab('activity')}
        >
          📊 アクティビティ
        </button>
      </div>

      <div className="dashboard-content">
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'users' && renderUsers()}
        {selectedTab === 'books' && renderBooks()}
        {selectedTab === 'activity' && renderActivity()}
      </div>
    </div>
  );
};

export default AdminDashboard;