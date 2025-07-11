import React, { useState, useEffect } from 'react';
import { AdminUser } from '../types/User';
import { adminAuthService } from '../services/adminAuthService';
import './AdminLogin.css';

interface AdminLoginProps {
  onAdminLogin: (admin: AdminUser) => void;
  onClose: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onAdminLogin, onClose }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [securityStats, setSecurityStats] = useState<any>(null);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    // セキュリティ統計を取得
    const stats = adminAuthService.getSecurityStats();
    setSecurityStats(stats);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await adminAuthService.adminLogin(formData.username, formData.password);
      
      if (result.success && result.admin) {
        onAdminLogin(result.admin);
        onClose();
      } else {
        setError(result.error || 'ログインに失敗しました');
      }
    } catch (err) {
      setError('システムエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setFormData({
      username: 'admin',
      password: 'admin123'
    });
  };

  return (
    <div className="admin-login-overlay">
      <div className="admin-login-modal">
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="admin-login-header">
          <h2>🏛️ 本部管理者ログイン</h2>
          <p className="security-notice">
            🔐 セキュアな管理者専用エリアです
          </p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="username">管理者ID:</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              placeholder="管理者IDを入力"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">パスワード:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="パスワードを入力"
              autoComplete="current-password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              キャンセル
            </button>
            <button type="submit" disabled={loading} className="login-button">
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </div>
        </form>

        <div className="admin-demo-section">
          <div className="demo-info">
            <h3>🧪 デモアカウント</h3>
            <p>管理者機能をテストするためのデモアカウントです</p>
            <button onClick={handleDemoLogin} className="demo-button">
              デモアカウントを使用
            </button>
          </div>
        </div>

        <div className="security-info">
          <button 
            className="stats-toggle"
            onClick={() => setShowStats(!showStats)}
          >
            📊 セキュリティ統計 {showStats ? '▲' : '▼'}
          </button>
          
          {showStats && securityStats && (
            <div className="security-stats">
              <div className="stat-item">
                <span className="stat-label">過去24時間のログイン:</span>
                <span className="stat-value">{securityStats.totalLogins}回</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">失敗したログイン:</span>
                <span className="stat-value error">{securityStats.failedLogins}回</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">アクティブ管理者:</span>
                <span className="stat-value">{securityStats.activeAdmins}人</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">アクティブセッション:</span>
                <span className="stat-value">{securityStats.activeSessions}個</span>
              </div>
              
              {securityStats.recentFailures.length > 0 && (
                <div className="recent-failures">
                  <h4>最近の失敗したログイン:</h4>
                  <ul>
                    {securityStats.recentFailures.slice(-3).map((failure: any, index: number) => (
                      <li key={index}>
                        <span className="failure-username">{failure.username}</span>
                        <span className="failure-time">
                          {new Date(failure.timestamp).toLocaleString()}
                        </span>
                        <span className="failure-reason">{failure.failureReason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="admin-footer">
          <p>⚠️ 管理者権限の不正使用は法的責任を問われる場合があります</p>
          <p>🔒 このシステムはセキュリティログが記録されています</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;