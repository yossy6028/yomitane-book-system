// UI Implementation Recommendations Based on Age-Genre Analysis
// This script generates specific recommendations for implementing dynamic interest filtering

const fs = require('fs');
const path = require('path');

// Read the analysis report
const reportPath = path.join(__dirname, 'age-genre-mapping-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// Generate UI-specific recommendations
const uiRecommendations = {
  analysisDate: new Date().toISOString(),
  totalBooks: report.totalBooks,
  
  // Age-based filtering recommendations
  ageBasedFiltering: {},
  
  // Interest availability by age
  interestAvailability: {},
  
  // Alternative suggestions for poor coverage
  alternativeSuggestions: {},
  
  // Implementation strategies
  implementationStrategies: {
    dynamicFiltering: {},
    coverageIndicators: {},
    fallbackStrategies: {}
  }
};

// Analyze each age group for UI recommendations
report.ageRanges.forEach(age => {
  const ageData = report.ageAnalysis[age];
  const coverageData = report.coverageAnalysis[age];
  
  // Get available interests for this age
  const availableInterests = [];
  const limitedInterests = [];
  const unavailableInterests = [];
  
  report.keyInterests.forEach(interest => {
    const bookCount = coverageData[interest];
    if (bookCount >= 3) {
      availableInterests.push({ interest, count: bookCount, status: 'good' });
    } else if (bookCount >= 1) {
      limitedInterests.push({ interest, count: bookCount, status: 'limited' });
    } else {
      unavailableInterests.push({ interest, count: bookCount, status: 'unavailable' });
    }
  });
  
  uiRecommendations.ageBasedFiltering[age] = {
    totalInterests: report.keyInterests.length,
    availableInterests: availableInterests,
    limitedInterests: limitedInterests,
    unavailableInterests: unavailableInterests,
    coveragePercentage: ageData.coveragePercentage,
    recommendation: getAgeRecommendation(ageData.coveragePercentage)
  };
});

function getAgeRecommendation(coverage) {
  if (coverage >= 80) return 'Show all available interests with counts';
  if (coverage >= 60) return 'Show available interests, group limited ones';
  if (coverage >= 40) return 'Show only well-covered interests, suggest alternatives';
  return 'Show limited selection, add explanatory text';
}

// Generate interest-specific recommendations
report.keyInterests.forEach(interest => {
  const interestData = report.interestAnalysis[interest];
  
  // Find best age ranges for this interest
  const bestAges = [];
  const limitedAges = [];
  const unavailableAges = [];
  
  report.ageRanges.forEach(age => {
    const count = report.coverageAnalysis[age][interest];
    if (count >= 3) {
      bestAges.push(age);
    } else if (count >= 1) {
      limitedAges.push(age);
    } else {
      unavailableAges.push(age);
    }
  });
  
  uiRecommendations.interestAvailability[interest] = {
    totalBooks: interestData.totalBooks,
    coveragePercentage: interestData.coveragePercentage,
    bestAges: bestAges,
    limitedAges: limitedAges,
    unavailableAges: unavailableAges,
    recommendation: getInterestRecommendation(interestData.coveragePercentage, bestAges.length)
  };
});

function getInterestRecommendation(coverage, bestAgeCount) {
  if (coverage >= 80 && bestAgeCount >= 5) return 'Always show with confidence';
  if (coverage >= 60 && bestAgeCount >= 3) return 'Show with age-specific warnings';
  if (coverage >= 40) return 'Show with limited availability notice';
  if (coverage >= 20) return 'Show only for specific ages with warnings';
  return 'Consider removing or providing alternatives';
}

// Generate alternative suggestions for poorly covered interests
const poorlyCoveredInterests = ['スポーツ・運動', 'ゲーム', '映画・アニメ', '絵を描く', '工作・手芸', '宇宙・天体', '乗り物'];

poorlyCoveredInterests.forEach(interest => {
  const alternatives = getAlternativeInterests(interest);
  uiRecommendations.alternativeSuggestions[interest] = {
    alternatives: alternatives,
    strategy: 'Suggest related interests with better coverage'
  };
});

function getAlternativeInterests(interest) {
  const alternatives = {
    'スポーツ・運動': ['冒険', '友情・恋愛', '学校生活'],
    'ゲーム': ['推理・謎解き', '冒険', 'ファンタジー'],
    '映画・アニメ': ['ファンタジー', '冒険', 'ユーモア'],
    '絵を描く': ['工作・手芸', '芸術', '創作'],
    '工作・手芸': ['科学', '料理', '創作'],
    '宇宙・天体': ['科学', '冒険', 'ファンタジー'],
    '乗り物': ['冒険', '旅行・地理', '科学']
  };
  
  return alternatives[interest] || [];
}

// Generate implementation strategies
uiRecommendations.implementationStrategies = {
  dynamicFiltering: {
    strategy: 'Show only interests with books available for selected age',
    implementation: [
      'Filter interests array based on age selection',
      'Show book count for each interest',
      'Gray out or hide interests with 0 books',
      'Prioritize interests with 3+ books'
    ],
    codeExample: `
// Example implementation
function getAvailableInterests(selectedAge) {
  return keyInterests.filter(interest => {
    const bookCount = getBookCountForAgeAndInterest(selectedAge, interest);
    return bookCount > 0;
  }).map(interest => ({
    interest,
    count: getBookCountForAgeAndInterest(selectedAge, interest),
    priority: getBookCountForAgeAndInterest(selectedAge, interest) >= 3 ? 'high' : 'low'
  }));
}
`
  },
  
  coverageIndicators: {
    strategy: 'Show book counts and coverage quality indicators',
    implementation: [
      'Display book count next to each interest',
      'Use color coding (green: 3+, yellow: 1-2, red: 0)',
      'Show confidence indicators',
      'Add tooltips explaining coverage'
    ],
    codeExample: `
// Example UI component
function InterestBadge({ interest, count, age }) {
  const quality = count >= 3 ? 'good' : count >= 1 ? 'limited' : 'none';
  return (
    <div className={\`interest-badge \${quality}\`}>
      <span>{interest}</span>
      <span className="count">({count}冊)</span>
    </div>
  );
}
`
  },
  
  fallbackStrategies: {
    strategy: 'Handle cases with poor coverage gracefully',
    implementation: [
      'Show alternative interests when selection is poor',
      'Expand age range automatically for limited interests',
      'Provide explanatory messages',
      'Suggest manual book search for unavailable combinations'
    ],
    codeExample: `
// Example fallback logic
function handlePoorCoverage(selectedAge, selectedInterests) {
  const unavailableInterests = selectedInterests.filter(interest => 
    getBookCountForAgeAndInterest(selectedAge, interest) === 0
  );
  
  if (unavailableInterests.length > 0) {
    return {
      suggestions: getAlternativeInterests(unavailableInterests),
      expandedAgeRange: getExpandedAgeRange(selectedAge),
      message: 'いくつかの興味について、選択した年齢の本が見つかりませんでした。関連する分野の本をおすすめします。'
    };
  }
}
`
  }
};

// Generate specific UI component recommendations
uiRecommendations.uiComponents = {
  ageSelector: {
    recommendation: 'Show coverage preview for each age',
    implementation: 'Display available interest count for each age button'
  },
  
  interestSelector: {
    recommendation: 'Dynamic filtering with visual indicators',
    implementation: 'Show/hide interests based on age, add book counts'
  },
  
  recommendationResults: {
    recommendation: 'Explain filtering decisions to users',
    implementation: 'Show why certain books were recommended'
  }
};

// Generate critical fixes needed
uiRecommendations.criticalFixes = {
  immediateActions: [
    'Add book count indicators to interest selection',
    'Filter out interests with 0 books for selected age',
    'Add alternative suggestions for poorly covered interests',
    'Implement age-specific interest prioritization'
  ],
  
  mediumTermActions: [
    'Add more books for スポーツ・運動, ゲーム, 映画・アニメ categories',
    'Improve coverage for ages 6-8 (currently 47.6%-57.1%)',
    'Create better category mappings for existing books',
    'Add explanatory text for users about book availability'
  ],
  
  longTermActions: [
    'Implement machine learning for interest correlation',
    'Add user feedback system for interest matching',
    'Create dynamic age range expansion for limited interests',
    'Develop personalized interest suggestions based on reading history'
  ]
};

// Save the recommendations
const recommendationsPath = path.join(__dirname, 'ui-implementation-recommendations.json');
fs.writeFileSync(recommendationsPath, JSON.stringify(uiRecommendations, null, 2));

// Generate a practical implementation guide
const implementationGuide = `# UI Implementation Guide for Dynamic Interest Filtering

## 🎯 Executive Summary
Based on analysis of ${report.totalBooks} books across ${report.ageRanges.length} age groups and ${report.keyInterests.length} interests:
- **${report.summary.missingCombinations}** age-interest combinations have NO books
- **${report.summary.poorlyCoveredCombinations}** combinations have limited books (1-2)
- **${report.summary.wellCoveredCombinations}** combinations have good coverage (3+)

## 🚨 Critical Issues to Address

### 1. Completely Missing Interests
- **スポーツ・運動**: 0 books across all ages
- **ゲーム**: 0 books across all ages
- **映画・アニメ**: Only 1 book total

### 2. Poor Coverage for Young Ages
- **Age 6**: Only 47.6% interest coverage
- **Age 7**: Only 52.4% interest coverage
- **Age 8**: Only 57.1% interest coverage

### 3. Limited Availability Interests
- **絵を描く**: 50% age coverage, only 5 books total
- **工作・手芸**: 70% age coverage, only 7 books total
- **宇宙・天体**: 50% age coverage, only 8 books total

## 🔧 Implementation Strategies

### Strategy 1: Dynamic Interest Filtering
\`\`\`javascript
// Filter interests based on age selection
function getAvailableInterests(selectedAge) {
  return interests.filter(interest => {
    const bookCount = getBookCountForAgeAndInterest(selectedAge, interest);
    return bookCount > 0; // Only show interests with books
  }).map(interest => ({
    name: interest,
    count: getBookCountForAgeAndInterest(selectedAge, interest),
    quality: getBookCountForAgeAndInterest(selectedAge, interest) >= 3 ? 'good' : 'limited'
  }));
}
\`\`\`

### Strategy 2: Coverage Indicators
\`\`\`javascript
// Show book counts and quality indicators
function InterestButton({ interest, count, isSelected, onClick }) {
  const quality = count >= 3 ? 'good' : count >= 1 ? 'limited' : 'none';
  
  return (
    <button 
      className={\`interest-btn \${quality} \${isSelected ? 'selected' : ''}\`}
      onClick={onClick}
      disabled={count === 0}
    >
      {interest}
      <span className="count">({count}冊)</span>
    </button>
  );
}
\`\`\`

### Strategy 3: Alternative Suggestions
\`\`\`javascript
// Suggest alternatives for poorly covered interests
const alternativeMap = {
  'スポーツ・運動': ['冒険', '友情・恋愛', '学校生活'],
  'ゲーム': ['推理・謎解き', '冒険', 'ファンタジー'],
  '映画・アニメ': ['ファンタジー', '冒険', 'ユーモア']
};

function getAlternativeSuggestions(unavailableInterests) {
  return unavailableInterests.flatMap(interest => 
    alternativeMap[interest] || []
  ).filter((item, index, arr) => arr.indexOf(item) === index);
}
\`\`\`

## 📊 Age-Specific Recommendations

${report.ageRanges.map(age => {
  const ageData = uiRecommendations.ageBasedFiltering[age];
  return `
### Age ${age} (${ageData.coveragePercentage}% coverage)
- **Available interests**: ${ageData.availableInterests.length} with good coverage
- **Limited interests**: ${ageData.limitedInterests.length} with 1-2 books
- **Unavailable interests**: ${ageData.unavailableInterests.length} with no books
- **UI Strategy**: ${ageData.recommendation}
`;
}).join('')}

## 🎨 UI Component Specifications

### Age Selector Component
\`\`\`jsx
function AgeSelector({ selectedAge, onAgeChange }) {
  return (
    <div className="age-selector">
      {ages.map(age => (
        <button
          key={age}
          className={\`age-btn \${selectedAge === age ? 'selected' : ''}\`}
          onClick={() => onAgeChange(age)}
        >
          {age}歳
          <small>({getAvailableInterestCount(age)}項目)</small>
        </button>
      ))}
    </div>
  );
}
\`\`\`

### Interest Selector Component
\`\`\`jsx
function InterestSelector({ selectedAge, selectedInterests, onInterestChange }) {
  const availableInterests = getAvailableInterests(selectedAge);
  
  return (
    <div className="interest-selector">
      {availableInterests.map(({ name, count, quality }) => (
        <InterestButton
          key={name}
          interest={name}
          count={count}
          quality={quality}
          isSelected={selectedInterests.includes(name)}
          onClick={() => onInterestChange(name)}
        />
      ))}
    </div>
  );
}
\`\`\`

## 🚀 Implementation Checklist

### Phase 1: Immediate Fixes (High Priority)
- [ ] Add book count indicators to interest buttons
- [ ] Filter out interests with 0 books for selected age
- [ ] Add visual quality indicators (good/limited/none)
- [ ] Implement alternative interest suggestions

### Phase 2: Enhanced Features (Medium Priority)
- [ ] Add explanatory tooltips for coverage indicators
- [ ] Implement age range expansion for limited interests
- [ ] Add user feedback mechanism for interest matching
- [ ] Create fallback messages for poor coverage

### Phase 3: Content Improvements (Long Term)
- [ ] Add books for missing interests (especially スポーツ・運動, ゲーム)
- [ ] Improve coverage for ages 6-8
- [ ] Review and update interest categorization
- [ ] Add machine learning for better interest correlation

## 📝 Testing Scenarios

1. **Test Age 6 Selection**: Should show only ~10 interests with books
2. **Test スポーツ・運動 Selection**: Should show alternative suggestions
3. **Test Age 12+ Selection**: Should show most interests with good coverage
4. **Test Multiple Interest Selection**: Should handle combinations gracefully

## 🔍 Monitoring and Analytics

Track these metrics to measure improvement:
- Interest selection success rate by age
- User satisfaction with recommendations
- Coverage improvement over time
- Alternative suggestion effectiveness

Generated on: ${new Date().toLocaleString()}
`;

const guidePath = path.join(__dirname, 'ui-implementation-guide.md');
fs.writeFileSync(guidePath, implementationGuide);

console.log('✅ UI Implementation Recommendations Generated!');
console.log(`📊 Detailed analysis: ${recommendationsPath}`);
console.log(`📋 Implementation guide: ${guidePath}`);
console.log('\n🎯 Key Findings:');
console.log(`- ${report.summary.missingCombinations} missing age-interest combinations`);
console.log(`- ${report.summary.poorlyCoveredCombinations} poorly covered combinations`);
console.log(`- Critical gaps in: スポーツ・運動, ゲーム, 映画・アニメ`);
console.log(`- Young ages (6-8) need more book coverage`);