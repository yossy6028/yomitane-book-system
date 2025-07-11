import React, { useState } from 'react';
import { User } from '../types/User';
import { userService } from '../services/userService';
import './UserAuth.css';

interface UserAuthProps {
  onUserLogin: (user: User) => void;
  onClose: () => void;
}

const UserAuth: React.FC<UserAuthProps> = ({ onUserLogin, onClose }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    email: '',
    age: 0,
    readingLevel: '' as User['readingLevel'],
    interests: [] as string[],
    parentEmail: '',
    schoolGrade: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const availableInterests = [
    '冒険', 'ファンタジー', 'スポーツ', '音楽', '科学', '動物', '推理', 'ユーモア',
    '歴史', '友情・恋愛', '家族', '学校生活', '料理', '工作・手芸', '映画・アニメ',
    '旅行・地理', '宇宙・天体', '乗り物', '自然', '読書'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'age' ? Number(value) : value
    }));
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = userService.loginUser(formData.username);
      if (user) {
        onUserLogin(user);
        onClose();
      } else {
        setError('ユーザーが見つかりません');
      }
    } catch (err) {
      setError('ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // バリデーション
      if (!formData.username || !formData.displayName) {
        throw new Error('ユーザー名と表示名は必須です');
      }

      if (!formData.age || formData.age < 6 || formData.age > 18) {
        throw new Error('年齢は6歳から18歳までで入力してください');
      }

      if (!formData.readingLevel) {
        throw new Error('読書レベルを選択してください');
      }

      if (formData.interests.length === 0) {
        throw new Error('興味のある分野を少なくとも1つ選択してください');
      }

      const newUser = userService.createUser({
        username: formData.username,
        displayName: formData.displayName,
        email: formData.email,
        age: formData.age,
        readingLevel: formData.readingLevel as User['readingLevel'],
        interests: formData.interests,
        vocabularyScore: 5, // 初期値
        personalityTraits: [],
        parentEmail: formData.parentEmail,
        schoolGrade: formData.schoolGrade
      });

      onUserLogin(newUser);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="auth-form">
      <h2>📚 ログイン</h2>
      
      <div className="form-group">
        <label htmlFor="username">ユーザー名:</label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleInputChange}
          required
          placeholder="ユーザー名を入力してください"
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <button type="button" onClick={onClose} className="cancel-button">
          キャンセル
        </button>
        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </div>

      <div className="mode-switch">
        <button 
          type="button" 
          onClick={() => setMode('register')} 
          className="link-button"
        >
          新規登録はこちら
        </button>
      </div>
    </form>
  );

  const renderRegisterForm = () => (
    <form onSubmit={handleRegister} className="auth-form register-form">
      <h2>🌟 新規登録</h2>
      
      <div className="form-group">
        <label htmlFor="username">ユーザー名 *:</label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleInputChange}
          required
          placeholder="英数字で入力してください"
        />
      </div>

      <div className="form-group">
        <label htmlFor="displayName">表示名 *:</label>
        <input
          type="text"
          id="displayName"
          name="displayName"
          value={formData.displayName}
          onChange={handleInputChange}
          required
          placeholder="画面に表示される名前"
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">メールアドレス:</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="オプション"
        />
      </div>

      <div className="form-group">
        <label htmlFor="age">年齢 *:</label>
        <select
          id="age"
          name="age"
          value={formData.age}
          onChange={handleInputChange}
          required
        >
          <option value={0}>年齢を選択してください</option>
          {Array.from({ length: 13 }, (_, i) => i + 6).map(age => (
            <option key={age} value={age}>{age}歳</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="readingLevel">読書レベル *:</label>
        <select
          id="readingLevel"
          name="readingLevel"
          value={formData.readingLevel}
          onChange={handleInputChange}
          required
        >
          <option value="">読書レベルを選択してください</option>
          <option value="小学校低学年">初級レベル（やさしい本）</option>
          <option value="小学校中学年">中級レベル（普通の本）</option>
          <option value="小学校高学年〜中学1・2年">上級レベル（少し難しい本）</option>
          <option value="高校受験レベル">上級プラス（難しい本・古典文学）</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="schoolGrade">学年:</label>
        <select
          id="schoolGrade"
          name="schoolGrade"
          value={formData.schoolGrade}
          onChange={handleInputChange}
        >
          <option value="">学年を選択してください</option>
          <option value="小学1年">小学1年</option>
          <option value="小学2年">小学2年</option>
          <option value="小学3年">小学3年</option>
          <option value="小学4年">小学4年</option>
          <option value="小学5年">小学5年</option>
          <option value="小学6年">小学6年</option>
          <option value="中学1年">中学1年</option>
          <option value="中学2年">中学2年</option>
          <option value="中学3年">中学3年</option>
          <option value="高校1年">高校1年</option>
          <option value="高校2年">高校2年</option>
          <option value="高校3年">高校3年</option>
        </select>
      </div>

      <div className="form-group">
        <label>興味のある分野 * (複数選択可):</label>
        <div className="interests-grid">
          {availableInterests.map(interest => (
            <label key={interest} className="interest-item">
              <input
                type="checkbox"
                checked={formData.interests.includes(interest)}
                onChange={() => handleInterestToggle(interest)}
              />
              <span>{interest}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="parentEmail">保護者のメールアドレス:</label>
        <input
          type="email"
          id="parentEmail"
          name="parentEmail"
          value={formData.parentEmail}
          onChange={handleInputChange}
          placeholder="12歳以下の場合は推奨"
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <button type="button" onClick={onClose} className="cancel-button">
          キャンセル
        </button>
        <button type="submit" disabled={loading} className="submit-button">
          {loading ? '登録中...' : '登録'}
        </button>
      </div>

      <div className="mode-switch">
        <button 
          type="button" 
          onClick={() => setMode('login')} 
          className="link-button"
        >
          既にアカウントをお持ちの方
        </button>
      </div>
    </form>
  );

  return (
    <div className="auth-overlay">
      <div className="auth-modal">
        <button className="close-button" onClick={onClose}>×</button>
        {mode === 'login' ? renderLoginForm() : renderRegisterForm()}
      </div>
    </div>
  );
};

export default UserAuth;