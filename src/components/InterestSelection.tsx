import React, { useState } from 'react';
import { UserProfile } from '../services/recommendationService';
import { bookService } from '../services/bookService';
import './InterestSelection.css';

interface InterestSelectionProps {
  onNext: () => void;
  onBack: () => void;
  userProfile: Partial<UserProfile>;
  setUserProfile: (profile: Partial<UserProfile>) => void;
}

const InterestSelection: React.FC<InterestSelectionProps> = ({ 
  onNext, 
  onBack, 
  userProfile, 
  setUserProfile 
}) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // 興味分野カテゴリ定義
  const interestCategories = {
    '冒険・ファンタジー': ['冒険', 'ファンタジー', '魔法', '神秘', '英雄', '挑戦'],
    '科学・技術': ['科学', '宇宙', '宇宙・天体', '技術', '実験', '未来技術', 'AI', 'SF', 'プログラミング'],
    '動物・自然': ['動物', '自然', '植物', '昆虫', '海', '季節', '夏', '環境'],
    'スポーツ・運動': ['スポーツ', 'サッカー', '野球', 'バスケットボール', '水泳', '競技', '運動'],
    '芸術・文化': ['芸術', '音楽', '絵を描く', '絵画', '楽器', 'アート', '映画・アニメ', '創作', '創造'],
    '歴史・社会': ['歴史', '江戸時代', '平安時代', '戦国時代', '明治時代', '社会', '政治', '経済', '文化'],
    '友情・家族': ['友情', '友情・恋愛', '家族', '愛情', '愛', '心の成長', '情意'],
    '学校・日常': ['学校生活', '日常', '成長', '青春', '学習', '教育', '子供'],
    '推理・ミステリー': ['推理・謎解き', 'なぞとき', 'サスペンス', '緊張感', '謎'],
    '料理・生活': ['料理', '食べ物', '食材', '健康', '生活', '日常生活'],
    'ユーモア・エンタメ': ['ユーモア', '楽しさ', 'コメディ', 'エンターテイメント'],
    '哲学・心理': ['哲学', '心理', '心理学', '思考', '精神', '意識', '内面'],
    '国際・地理': ['せかいの国ぐに', '国際', '旅行・地理', '中国', '国際理解', '地域', '文化交流'],
    '文学・言葉': ['文学', '言葉', '言語', '読書', '古典', '詩', '文章']
  };

  const handleNext = () => {
    setUserProfile({
      ...userProfile,
      interests: selectedInterests
    });
    onNext();
  };

  const handleInterestChange = (interest: string, checked: boolean) => {
    if (checked) {
      setSelectedInterests([...selectedInterests, interest]);
    } else {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
  };

  const currentSubcategories = selectedCategory ? interestCategories[selectedCategory as keyof typeof interestCategories] || [] : [];

  const getAvailableBookCount = (interest: string): number => {
    if (!userProfile.age || !userProfile.readingLevel) return 0;
    
    try {
      const filter = {
        ageRange: { min: Math.max(6, userProfile.age - 2), max: Math.min(15, userProfile.age + 2) },
        readingLevel: [userProfile.readingLevel as string],
        interests: [interest]
      };
      return bookService.getFilteredBooks(filter).length;
    } catch {
      return 0;
    }
  };

  return (
    <div className="step-container">
      <h2>🎯 今の気分で読みたい分野は？</h2>
      <p className="step-description">
        テスト結果に基づいて、きみにぴったりの本を探します。<br/>
        <strong>今の気分</strong>で読みたい分野を選んでください。興味は変わってもOK！
      </p>
      
      <div className="test-result-summary">
        <h3>📊 きみのプロフィール</h3>
        <div className="profile-summary">
          <span className="profile-item">年齢: {userProfile.age}歳</span>
          {userProfile.gradeInfo && (
            <span className="profile-item">
              学年: {userProfile.gradeInfo.gradeLabel}
              {userProfile.gradeInfo.isNewGrade && <span className="new-grade">🌸新学年</span>}
            </span>
          )}
          <span className="profile-item">読書レベル: {userProfile.readingLevel}</span>
          {userProfile.testResult && (
            <>
              <span className="profile-item">語彙力: {userProfile.testResult.vocabularyScore}/100</span>
              <span className="profile-item">常識力: {userProfile.testResult.commonSenseScore}/100</span>
            </>
          )}
        </div>
      </div>

      <div className="interest-selector">
        <div className="category-selector">
          <label>大きな分野から選んでね:</label>
          <select 
            value={selectedCategory} 
            onChange={handleCategoryChange}
            className="category-select"
          >
            <option value="">どんな分野に興味がある？</option>
            {Object.keys(interestCategories).map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      
        {currentSubcategories.length > 0 && (
          <div className="subcategory-selector">
            <label>具体的に選んでね:</label>
            <div className="subcategory-grid">
              {currentSubcategories.map(interest => {
                const bookCount = getAvailableBookCount(interest);
                return (
                  <label key={interest} className="interest-checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={selectedInterests.includes(interest)}
                      onChange={(e) => handleInterestChange(interest, e.target.checked)}
                    />
                    <span className="interest-text">
                      {interest}
                      {bookCount > 0 && <span className="book-count">({bookCount}冊)</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
        
        {selectedInterests.length > 0 && (
          <div className="selected-interests">
            <label>選んだ分野:</label>
            <div className="selected-tags">
              {selectedInterests.map(interest => (
                <span key={interest} className="selected-tag">
                  {interest}
                  <button 
                    type="button"
                    onClick={() => handleInterestChange(interest, false)}
                    className="remove-tag"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mood-note">
        <p>💡 <strong>ヒント:</strong> 気分が変わったら、また違う分野を選んで新しい本を探すことができるよ！</p>
      </div>

      <div className="button-group">
        <button className="secondary-button" onClick={onBack}>戻る</button>
        <button 
          className="primary-button" 
          onClick={handleNext}
          disabled={selectedInterests.length === 0}
        >
          おすすめ図書を見る
        </button>
      </div>
    </div>
  );
};

export default InterestSelection;