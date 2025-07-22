import React, { useState } from 'react';
import { UserProfile } from '../services/recommendationService';
import { bookService } from '../services/bookService';
import { Ruby, RubyText } from './Ruby';
import standardTagDictionary from '../data/standardTagDictionary.json';
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

  // 標準タグ辞書を使用したカテゴリー定義
  const interestCategories = {
    '📚 本のタイプで探す': standardTagDictionary.genres,
    '🔬 知りたいことで探す': standardTagDictionary.subjects,
    '💭 気持ちで探す': standardTagDictionary.themes
  };

  // カテゴリーごとの説明文
  const categoryDescriptions = {
    '📚 本のタイプで探す': '例：物語の本、なぞときの本、ぼうけんの本、絵がたくさんの本など',
    '🔬 知りたいことで探す': '例：動物のこと、宇宙のこと、スポーツのこと、歴史のことなど',
    '💭 気持ちで探す': '例：友だちっていいな、勇気が出る、希望がわく、大人になるってどんな感じ？など'
  };

  // 子ども向けの表示名変換
  const getChildFriendlyName = (tag: string): string => {
    const friendlyNames: Record<string, string> = {
      // ジャンル
      '小説': '物語の本',
      '児童文学': '子どものための物語',
      'ミステリー／推理': 'なぞときの本',
      'ファンタジー': 'まほうや冒険の本',
      'ＳＦ': '未来やロボットの本',
      '歴史・時代': '昔の時代の本',
      '恋愛': '恋や友情の本',
      'ホラー': 'ちょっとこわい本',
      '冒険': 'ぼうけんの本',
      'ノンフィクション': '本当にあった話',
      '伝記・自伝': '有名な人の本',
      'エッセイ／随筆': '作者の思い出の本',
      '詩': '詩の本',
      '戯曲': '劇の本',
      '絵本': '絵がたくさんの本',
      'グラフィックノベル／漫画': 'マンガの本',
      
      // 興味分野
      '科学': '科学の本',
      'テクノロジー': 'コンピューターの本',
      '自然': '自然の本',
      '動物': '動物の本',
      '植物': '植物の本',
      '宇宙': '宇宙の本',
      '環境': '地球環境の本',
      '歴史': '歴史の本',
      '地理・旅行': '地理と旅行の本',
      '社会': '社会のしくみの本',
      '政治': '政治の本',
      '経済': 'お金や経済の本',
      '文化': '文化の本',
      '芸術': '芸術の本',
      '音楽': '音楽の本',
      'スポーツ': 'スポーツの本',
      '料理・食': 'お料理の本',
      '心理': '心の本',
      '哲学': '考える本',
      '宗教': '宗教の本',
      '民俗': '昔からの習慣の本',
      
      // テーマ
      '友情': '友だちの本',
      '家族': '家族の本',
      '成長・自立': '大人になる本',
      '多様性・共生': 'みんなちがってみんないい本',
      'いじめ': 'いじめについて考える本',
      '勇気': '勇気が出る本',
      '希望': '希望がわく本',
      '正義': '正しいことを考える本',
      '犠牲': 'だれかのために頑張る本',
      '戦争と平和': '戦争と平和の本',
      '環境保護': '地球を守る本',
      '自己発見': '自分を見つける本',
      '障がい': 'ハンディキャップの本',
      '老い': '年をとることの本',
      '死と生': 'いのちの本',
      '移民・ルーツ': '外国から来た人の本',
      '社会正義': 'みんなが幸せになる本',
      'ジェンダー': '男の子女の子の本'
    };
    
    return friendlyNames[tag] || tag;
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

  // 年齢に適したタグのみ表示するフィルタ
  const isAgeAppropriate = (tag: string): boolean => {
    if (!userProfile.age) return true;
    
    const ageRestrictedTags = {
      8: ['恋愛', '戦争と平和', '死と生', '老い', 'ジェンダー'],
      10: ['戦争と平和', '死と生', '老い'],
      12: ['老い']
    };
    
    for (const [ageLimit, restrictedTags] of Object.entries(ageRestrictedTags)) {
      if (userProfile.age <= parseInt(ageLimit) && restrictedTags.includes(tag)) {
        return false;
      }
    }
    
    return true;
  };

  return (
    <div className="step-container">
      <h2>🎯 今の気分で読みたい本は？</h2>
      <p className="step-description">
        きみのプロフィールに合わせて、ぴったりの本を探します。<br/>
        <strong>今の気分</strong>で読みたいものを選んでください。いつでも変えられるよ！
      </p>
      
      <div className="test-result-summary">
        <h3>📊 きみのプロフィール</h3>
        <div className="profile-summary">
          <span className="profile-item"><RubyText.年齢 />: {userProfile.age}歳</span>
          {userProfile.gradeInfo && (
            <span className="profile-item">
              <RubyText.学年 />: {userProfile.gradeInfo.gradeLabel}
              {userProfile.gradeInfo.isNewGrade && <span className="new-grade">🌸<Ruby text="新学年" ruby="しんがくねん" /></span>}
            </span>
          )}
          <span className="profile-item">読書レベル: {userProfile.readingLevel}</span>
          {userProfile.testResult && (
            <>
              <span className="profile-item"><RubyText.語彙力 />: {userProfile.testResult.vocabularyScore}/100</span>
              <span className="profile-item"><RubyText.常識力 />: {userProfile.testResult.commonSenseScore}/100</span>
            </>
          )}
        </div>
      </div>

      <div className="interest-selector">
        <div className="category-selector">
          <label>どうやって本を探したい？</label>
          <select 
            value={selectedCategory} 
            onChange={handleCategoryChange}
            className="category-select"
          >
            <option value="">⬇️ ここから選んでね</option>
            {Object.keys(interestCategories).map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          {selectedCategory && (
            <p className="category-description">
              {categoryDescriptions[selectedCategory as keyof typeof categoryDescriptions]}
            </p>
          )}
        </div>
      
        {currentSubcategories.length > 0 && (
          <div className="subcategory-selector">
            <label>気になるものをえらんでね（いくつでもOK！）:</label>
            <div className="subcategory-grid">
              {currentSubcategories
                .filter(tag => isAgeAppropriate(tag))
                .map(interest => {
                  const bookCount = getAvailableBookCount(interest);
                  const displayName = getChildFriendlyName(interest);
                  return (
                    <label key={interest} className="interest-checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={selectedInterests.includes(interest)}
                        onChange={(e) => handleInterestChange(interest, e.target.checked)}
                      />
                      <span className="interest-text">
                        {displayName}
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
            <label>選んだもの:</label>
            <div className="selected-tags">
              {selectedInterests.map(interest => (
                <span key={interest} className="selected-tag">
                  {getChildFriendlyName(interest)}
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
        <p>💡 <strong>ヒント:</strong> 気分が変わったら、いつでも違うものを選んで新しい本を探せるよ！</p>
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