import React, { useState, useEffect } from 'react';
import './App.css';
import BookList from './components/BookList';
import AdminPanel from './components/AdminPanel';
import AdminDashboard from './components/AdminDashboard';
import UserAuth from './components/UserAuth';
import AdminLogin from './components/AdminLogin';
import InterestSelection from './components/InterestSelection';
import { CoverImage } from './components/CoverImage';
import { Ruby, RubyText } from './components/Ruby';
import { UserProfile, recommendationService } from './services/recommendationService';
import { userService } from './services/userService';
import { adminAuthService } from './services/adminAuthService';
import { User, AdminUser } from './types/User';
import { generateMixedTest, calculateTestResult, analyzeTestPerformance, MixedTestQuestion } from './data/mixedTestQuestions';
import { filterTextForGrade, ageToGradeLevel } from './utils/kanjiFilter';
import { calculateGradeFromAge, getNewGradeMessage } from './utils/gradeCalculator';

// Utility function for reading level labels
const getReadingLevelLabel = (level: string) => {
  switch (level) {
    case '小学校低学年': return '小学校低学年';
    case '小学校中学年': return '小学校中学年';
    case '小学校低・中学年': return '小学校低・中学年'; // 旧形式との互換性
    case '小学校高学年〜中学1・2年': return '小学校高学年〜中学1・2年';
    case '高校受験レベル': return '高校受験レベル';
    // 旧形式との互換性
    case 'elementary-low': return '小学校低学年';
    case 'elementary-mid': return '小学校中学年';
    case 'elementary-high': return '小学校高学年';
    case 'junior-high': return '小学校高学年〜中学1・2年';
    default: return level;
  }
};

function App() {
  const [currentView, setCurrentView] = useState<'main' | 'books' | 'admin' | 'dashboard'>('main');
  const [currentStep, setCurrentStep] = useState(1);
  const [userProfile, setUserProfile] = useState<Partial<UserProfile>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [showUserAuth, setShowUserAuth] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // 初回レンダリング時に問題書籍のキャッシュをクリアし、ログイン状態を確認
  useEffect(() => {
    
    // ログイン状態を確認
    const user = userService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      // ユーザー情報から UserProfile を構築
      setUserProfile({
        age: user.age,
        interests: user.interests,
        readingLevel: user.readingLevel,
        vocabularyScore: user.vocabularyScore,
        personalityTraits: user.personalityTraits,
        previousBooks: [] // 読書履歴から後で設定
      });
    }

    // 管理者ログイン状態を確認
    const admin = adminAuthService.getCurrentAdmin();
    if (admin) {
      setCurrentAdmin(admin);
    }
  }, []);

  const handleUserLogin = (user: User) => {
    setCurrentUser(user);
    setUserProfile({
      age: user.age,
      interests: user.interests,
      readingLevel: user.readingLevel,
      vocabularyScore: user.vocabularyScore,
      personalityTraits: user.personalityTraits,
      previousBooks: [] // 読書履歴から後で設定
    });
  };

  const handleUserLogout = () => {
    userService.logoutUser();
    setCurrentUser(null);
    setUserProfile({});
    setCurrentStep(1);
    setCurrentView('main');
  };

  const handleAdminLogin = (admin: AdminUser) => {
    setCurrentAdmin(admin);
    setCurrentView('dashboard'); // 管理者ログイン後はダッシュボードに移動
  };

  const handleAdminLogout = () => {
    adminAuthService.adminLogout();
    setCurrentAdmin(null);
    setCurrentView('main');
  };

  const renderView = () => {
    switch(currentView) {
      case 'books':
        return <BookList onBack={() => setCurrentView('main')} />;
      case 'admin':
        return <AdminPanel onBack={() => setCurrentView('main')} />;
      case 'dashboard':
        return <AdminDashboard onBack={() => setCurrentView('main')} />;
      case 'main':
      default:
        return renderMainSteps();
    }
  };

  const renderMainSteps = () => {
    switch(currentStep) {
      case 1:
        return <WelcomeStep 
          onNext={() => setCurrentStep(2)} 
          onViewBooks={() => setCurrentView('books')}
          onAdmin={() => setCurrentView('admin')}
          onDashboard={() => setCurrentView('dashboard')}
          onAdminLogin={() => setShowAdminLogin(true)}
          currentUser={currentUser}
          currentAdmin={currentAdmin}
        />;
      case 2:
        return <SurveyStep 
          onNext={() => setCurrentStep(3)} 
          onBack={() => setCurrentStep(1)}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
        />;
      case 3:
        return <TestStep 
          onNext={() => setCurrentStep(4)} 
          onBack={() => setCurrentStep(2)}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
        />;
      case 4:
        return <InterestSelection 
          onNext={() => setCurrentStep(5)} 
          onBack={() => setCurrentStep(3)}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
        />;
      case 5:
        return <ResultsStep 
          userProfile={userProfile as UserProfile} 
          onBack={() => setCurrentStep(4)} 
          onRestart={() => setCurrentStep(1)} 
        />;
      default:
        return <WelcomeStep 
          onNext={() => setCurrentStep(2)} 
          onViewBooks={() => setCurrentView('books')}
          onAdmin={() => setCurrentView('admin')}
          onDashboard={() => setCurrentView('dashboard')}
          onAdminLogin={() => setShowAdminLogin(true)}
          currentUser={currentUser}
          currentAdmin={currentAdmin}
        />;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <img src="/yomitane-logo.png" alt="ヨミタネ" className="yomitane-logo" />
          <p className="app-subtitle">ＡＩと育てるあなただけの読書の森</p>
          <div className="header-auth">
            {currentAdmin ? (
              <div className="admin-info">
                <span className="admin-welcome-text">
                  🏛️ 管理者 {currentAdmin.displayName}さん
                </span>
                <button className="admin-logout-button" onClick={handleAdminLogout}>
                  管理者ログアウト
                </button>
              </div>
            ) : currentUser ? (
              <div className="user-info">
                <span className="welcome-text">こんにちは、{currentUser.displayName}さん</span>
                <button className="logout-button" onClick={handleUserLogout}>
                  ログアウト
                </button>
              </div>
            ) : (
              <button className="login-button" onClick={() => setShowUserAuth(true)}>
                ログイン / <RubyText.登録 />
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="App-main">
        {renderView()}
      </main>
      <footer className="App-footer">
        <img src="/tanemo-logo.png" alt="TANEMO" className="tanemo-footer-logo" />
      </footer>
      {showUserAuth && (
        <UserAuth 
          onUserLogin={handleUserLogin}
          onClose={() => setShowUserAuth(false)}
        />
      )}
      {showAdminLogin && (
        <AdminLogin 
          onAdminLogin={handleAdminLogin}
          onClose={() => setShowAdminLogin(false)}
        />
      )}
    </div>
  );
}

// Welcome Step Component
const WelcomeStep: React.FC<{
  onNext: () => void;
  onViewBooks: () => void;
  onAdmin: () => void;
  onDashboard: () => void;
  onAdminLogin: () => void;
  currentUser: User | null;
  currentAdmin: AdminUser | null;
}> = ({ onNext, onViewBooks, onAdmin, onDashboard, onAdminLogin, currentUser, currentAdmin }) => (
  <div className="step-container">
    <h2>✨ 読書の旅をはじめましょう</h2>
    <p className="welcome-description">
      あなたの<RubyText.興味 />と読書レベルに合わせて、<br />
      最適な本をAIがセレクトします
    </p>
    
    {currentUser && (
      <div className="user-welcome">
        <p>👋 {currentUser.displayName}さん、お帰りなさい！</p>
        <p><RubyText.年齢 />: {currentUser.age}歳 | 読書レベル: {currentUser.readingLevel}</p>
        <p><RubyText.興味 /><RubyText.分野 />: {currentUser.interests.join('・')}</p>
      </div>
    )}

    {currentAdmin && (
      <div className="admin-welcome">
        <p>🏛️ 管理者 {currentAdmin.displayName}さん、お疲れ様です</p>
        <p>役割: {currentAdmin.role} | 部署: {currentAdmin.department}</p>
        <p>最終ログイン: {new Date(currentAdmin.lastLoginAt).toLocaleString()}</p>
      </div>
    )}
    
    <div className="welcome-buttons">
      <button className="primary-button" onClick={onNext}>
        📖 おすすめ本を調べる
      </button>
      
      <button className="secondary-button" onClick={onViewBooks}>
        📚 <RubyText.図書 />ライブラリー
      </button>
      
      {currentAdmin ? (
        <>
          <button className="admin-button" onClick={onAdmin}>
            ⚙️ 管理者パネル
          </button>
          <button className="dashboard-button" onClick={onDashboard}>
            📊 本部ダッシュボード
          </button>
        </>
      ) : (
        <button className="admin-login-button" onClick={onAdminLogin}>
          🏛️ 本部ログイン
        </button>
      )}
    </div>
  </div>
);

// Survey Step Component  
const SurveyStep: React.FC<{
  onNext: () => void, 
  onBack: () => void,
  userProfile: Partial<UserProfile>,
  setUserProfile: (profile: Partial<UserProfile>) => void
}> = ({ onNext, onBack, userProfile, setUserProfile }) => {
  const [age, setAge] = useState<number>(userProfile.age || 0);
  const [readingLevel, setReadingLevel] = useState<string>(userProfile.readingLevel || '');

  // 学年情報を計算
  const gradeInfo = age > 0 ? calculateGradeFromAge(age) : null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const newGradeMessage = gradeInfo ? getNewGradeMessage(gradeInfo) : '';

  const handleNext = () => {
    setUserProfile({
      ...userProfile,
      age,
      readingLevel: readingLevel as '小学校低学年' | '小学校中学年' | '小学校高学年〜中学1・2年' | '高校受験レベル',
      personalityTraits: [],
      gradeInfo: gradeInfo || undefined
    });
    onNext();
  };

  return (
    <div className="step-container">
      <h2>📝 プロフィール設定</h2>
      
      <div className="form-group">
        <label><RubyText.年齢 />:</label>
        <select value={age} onChange={(e) => setAge(Number(e.target.value))}>
          <option value={0}><RubyText.年齢 />を選んでね</option>
          {Array.from({length: 10}, (_, i) => i + 6).map(age => (
            <option key={age} value={age}>{age}歳</option>
          ))}
        </select>
        {/* 初期年齢入力時は学年表示を行わない
        {gradeInfo && (
          <div className="grade-info" style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f8f0', borderRadius: '8px' }}>
            <p><strong>学年：{gradeInfo.gradeLabel}</strong></p>
            {newGradeMessage && (
              <p style={{ color: '#ff6b9d', fontWeight: 'bold' }}>{newGradeMessage}</p>
            )}
          </div>
        )}
        */}
      </div>

      <div className="form-group">
        <label>読書レベル（どんな本が読める？）:</label>
        <select value={readingLevel} onChange={(e) => setReadingLevel(e.target.value)}>
          <option value="">読みたい本の難しさを選んでね</option>
          <option value="小学校低学年"><RubyText.初級 />レベル（やさしい本）</option>
          <option value="小学校中学年"><RubyText.中級 />レベル（普通の本）</option>
          <option value="小学校高学年〜中学1・2年"><RubyText.上級 />レベル（少し難しい本）</option>
          <option value="高校受験レベル"><RubyText.上級 />プラス（難しい本・古典文学）</option>
        </select>
        {gradeInfo && (
          <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>
            おすすめレベル: {gradeInfo.readingLevel}
          </p>
        )}
      </div>

      <div className="button-group">
        <button className="secondary-button" onClick={onBack}>戻る</button>
        <button 
          className="primary-button" 
          onClick={handleNext}
          disabled={!age || !readingLevel}
        >
          次へ
        </button>
      </div>
    </div>
  );
};

// Test Step Component
const TestStep: React.FC<{
  onNext: () => void, 
  onBack: () => void,
  userProfile: Partial<UserProfile>,
  setUserProfile: (profile: Partial<UserProfile>) => void
}> = ({ onNext, onBack, userProfile, setUserProfile }) => {
  const [answers, setAnswers] = useState<{[key: string]: string}>({});
  const [questions, setQuestions] = useState<MixedTestQuestion[]>([]);

  useEffect(() => {
    // 年齢に応じた語彙+常識の混合テストを生成（語彙5問 + 常識5問）
    const mixedQuestions = generateMixedTest(userProfile.age || 7, 5, 5);
    setQuestions(mixedQuestions);
    setAnswers({}); // 問題が変わったら回答をリセット
  }, [userProfile.age]);

  // 問題が読み込まれていない場合のフォールバック
  if (questions.length === 0) {
    return (
      <div className="step-container">
        <h2>🧠 適性テスト</h2>
        <p>問題を準備しています...</p>
        <div className="button-group">
          <button className="secondary-button" onClick={onBack}>戻る</button>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    // 新しい総合テスト結果計算
    const testResult = calculateTestResult(questions, answers, userProfile.age || 10);
    const analysis = analyzeTestPerformance(testResult);
    
    setUserProfile({
      ...userProfile,
      vocabularyScore: testResult.overallLevel, // 総合レベルを語彙スコアとして使用
      testResult: testResult, // 詳細な結果も保存
      testAnalysis: analysis // 分析結果も保存
    });
    onNext();
  };

  // フィルタリングオプションを定数として定義（重複削減）
  const filterOptions = {
    gradeLevel: ageToGradeLevel(userProfile.age || 7),
    allowHiragana: true,
    allowKatakana: true,
    strictMode: true
  };

  return (
    <div className="step-container">
      <h2>🧠 総合テスト（{userProfile.age}歳向け）</h2>
      <p>きみの語彙力（ことばの学力）と常識力（いろんなことを知っているか）をチェックするよ！全部で{questions.length}問です。</p>
      <p className="test-info">💡 このテストできみにぴったりの本を見つけられるよ！問題は毎回変わります</p>
      
      {questions.map((q, index) => (
        <div key={q.id} className="question">
          <div className="question-header">
            <p><strong>{filterTextForGrade('問題', filterOptions)}{index + 1}:</strong> {filterTextForGrade(q.question, filterOptions)}</p>
            <span className={`question-type ${q.type}`}>
              {q.type === 'vocabulary' ? '📝語彙' : '🧭常識'}
            </span>
          </div>
          <div className="radio-group">
            {q.options.map((option, optIndex) => (
              <label key={optIndex}>
                <input 
                  type="radio" 
                  name={q.id} 
                  value={optIndex}
                  checked={answers[q.id] === optIndex.toString()}
                  onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                /> 
                {filterTextForGrade(option, filterOptions)}
              </label>
            ))}
          </div>
        </div>
      ))}
      
      <div className="button-group">
        <button className="secondary-button" onClick={onBack}>もどる</button>
        <button 
          className="primary-button" 
          onClick={handleNext}
          disabled={Object.keys(answers).length < questions.length}
        >
          結果を見る
        </button>
      </div>
    </div>
  );
};

// Results Step Component
const ResultsStep: React.FC<{
  userProfile: UserProfile,
  onBack: () => void, 
  onRestart: () => void
}> = ({ userProfile, onBack, onRestart }) => {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoading(true);
      try {
        const recs = await recommendationService.getRecommendations(userProfile, 6);
        setRecommendations(recs);
      } catch (error) {
        console.error('推薦取得エラー:', error);
        setRecommendations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [userProfile]);


  const getStarRating = (rating: number) => {
    return '⭐'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
  };

  return (
    <div className="step-container">
      <h2>🎉 きみにぴったりのおすすめ本（{userProfile.age}歳）</h2>
      
      <div className="user-summary">
        <h3>📋 きみの情報（プロフィール）</h3>
        <div className="profile-summary">
          <span className="profile-item">年齢: {userProfile.age}歳</span>
          <span className="profile-item">読書レベル: {getReadingLevelLabel(userProfile.readingLevel || '')}</span>
          <span className="profile-item">総合レベル: {userProfile.vocabularyScore}/10</span>
          {userProfile.testResult && (
            <>
              <span className="profile-item">語彙力: {userProfile.testResult.vocabularyScore}/100</span>
              <span className="profile-item">常識力: {userProfile.testResult.commonSenseScore}/100</span>
            </>
          )}
        </div>
        {userProfile.gradeInfo && (
          <div className="profile-interests">
            <strong>学年:</strong> {userProfile.gradeInfo.gradeLabel}
            {userProfile.gradeInfo.isNewGrade && <span style={{ color: '#ff6b9d' }}> 🌸新学年</span>}
          </div>
        )}
        {userProfile.interests && userProfile.interests.length > 0 && (
          <div className="profile-interests">
            <strong>今回選んだ分野:</strong> {userProfile.interests.join('・')}
          </div>
        )}
        
      </div>

      <div className="recommendations">
        <h3>📚 きみにぴったりの本 ({recommendations.length}冊)</h3>
        
        {isLoading ? (
          <div className="loading">
            <p>🔍 きみにぴったりの本を探しています...</p>
            <div className="spinner">🌟</div>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="no-recommendations">
            <p>申し訳ありません。現在の図書データベースでは、きみのプロフィールに合う本が見つかりませんでした。</p>
            <p>管理者パネルから図書更新を行うと、より多くの本が見つかるかもしれません。</p>
          </div>
        ) : (
          <div className="recommendation-list">
            {recommendations.map((rec, index) => (
              <div 
                key={rec.book.id} 
                className={`recommendation-card ${selectedBook?.book?.id === rec.book.id ? 'selected' : ''}`}
                onClick={() => setSelectedBook(selectedBook?.book?.id === rec.book.id ? null : rec)}
              >
                <div className="recommendation-header">
                  <div className="book-basic-info">
                    <h4>#{index + 1} 「{rec.book.title}」</h4>
                    <p className="book-author">著者: {rec.book.author}</p>
                    <div className="book-meta-compact">
                      <span className="age-range">{rec.book.ageRange.min}-{rec.book.ageRange.max}歳</span>
                      <span className="reading-level">{getReadingLevelLabel(rec.book.readingLevel)}</span>
                      <span className="rating">{getStarRating(rec.book.rating)}</span>
                      <span className="match-score">マッチ度: {Math.round(rec.score)}%</span>
                    </div>
                  </div>
                  <CoverImage book={rec.book} className="recommendation-cover" />
                </div>

                <div className="recommendation-reasons">
                  <strong>📍 おすすめの理由:</strong>
                  <ul>
                    {rec.reasons.map((reason: string, i: number) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>

                {selectedBook?.book?.id === rec.book.id && (
                  <div className="book-details">
                    <div className="book-description">
                      <strong>📖 あらすじ:</strong>
                      <p>{rec.book.description}</p>
                    </div>
                    
                    <div className="book-categories">
                      <strong>🏷️ ジャンル:</strong>
                      {Array.from(new Set(rec.book.categories as string[])).map((cat, index) => (
                        <span key={`${cat}-${index}`} className="category-tag">{cat}</span>
                      ))}
                    </div>

                    <div className="book-interests">
                      <strong>🎯 興味分野:</strong>
                      {Array.from(new Set(rec.book.interests as string[])).map((interest, index) => (
                        <span key={`${interest}-${index}`} className="interest-tag">{interest}</span>
                      ))}
                    </div>

                    <div className="detailed-match">
                      <strong>🔍 詳細マッチ分析:</strong>
                      <div className="match-indicators">
                        <span className={`match-indicator ${rec.matchDetails.ageMatch ? 'match' : 'no-match'}`}>
                          年齢: {rec.matchDetails.ageMatch ? '✅' : '❌'}
                        </span>
                        <span className={`match-indicator ${rec.matchDetails.levelMatch ? 'match' : 'no-match'}`}>
                          レベル: {rec.matchDetails.levelMatch ? '✅' : '❌'}
                        </span>
                        <span className={`match-indicator ${rec.matchDetails.vocabularyMatch ? 'match' : 'no-match'}`}>
                          語彙力: {rec.matchDetails.vocabularyMatch ? '✅' : '❌'}
                        </span>
                        <span className={`match-indicator ${rec.matchDetails.interestMatch.length > 0 ? 'match' : 'no-match'}`}>
                          興味: {rec.matchDetails.interestMatch.length > 0 ? '✅' : '❌'}
                        </span>
                      </div>
                    </div>

                    {rec.book.pageCount && (
                      <div className="reading-time">
                        <strong>📄 ページ数:</strong> 約{rec.book.pageCount}ページ
                      </div>
                    )}
                  </div>
                )}

                <div className="click-hint">
                  {selectedBook?.book?.id === rec.book.id ? '▲ クリックして閉じる' : '▼ クリックして詳細を見る'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="button-group">
        <button className="secondary-button" onClick={onBack}>もどる</button>
        <button className="primary-button" onClick={onRestart}>もう一度やる</button>
      </div>
    </div>
  );
};


export default App;
