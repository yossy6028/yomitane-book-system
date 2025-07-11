// Generate Coverage Matrix Visualization
// Creates a CSV and HTML visualization of age-interest coverage

const fs = require('fs');
const path = require('path');

// Read the analysis report
const reportPath = path.join(__dirname, 'age-genre-mapping-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// Generate CSV matrix for easy viewing
function generateCoverageMatrix() {
  const matrix = [];
  
  // Header row
  const headerRow = ['Interest/Age', ...report.ageRanges.map(age => `Age ${age}`)];
  matrix.push(headerRow);
  
  // Data rows
  report.keyInterests.forEach(interest => {
    const row = [interest];
    report.ageRanges.forEach(age => {
      const count = report.coverageAnalysis[age][interest];
      row.push(count);
    });
    matrix.push(row);
  });
  
  return matrix;
}

// Generate HTML visualization
function generateHTMLVisualization() {
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Book Coverage Matrix - Age vs Interest</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        
        .summary {
            background: #e8f4f8;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .matrix-container {
            overflow-x: auto;
            margin: 20px 0;
        }
        
        .coverage-matrix {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        
        .coverage-matrix th,
        .coverage-matrix td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: center;
        }
        
        .coverage-matrix th {
            background-color: #4CAF50;
            color: white;
            font-weight: bold;
        }
        
        .coverage-matrix td:first-child {
            background-color: #f0f8ff;
            text-align: left;
            font-weight: bold;
            white-space: nowrap;
        }
        
        .coverage-0 { background-color: #ffebee; color: #c62828; }
        .coverage-1 { background-color: #fff3e0; color: #ef6c00; }
        .coverage-2 { background-color: #fff8e1; color: #f57c00; }
        .coverage-3 { background-color: #e8f5e8; color: #2e7d32; }
        .coverage-4 { background-color: #c8e6c9; color: #1b5e20; }
        .coverage-5 { background-color: #a5d6a7; color: #0d5016; }
        .coverage-high { background-color: #4caf50; color: white; font-weight: bold; }
        
        .legend {
            margin: 20px 0;
            padding: 15px;
            background: #f9f9f9;
            border-radius: 8px;
        }
        
        .legend-item {
            display: inline-block;
            margin: 5px 10px;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        
        .stat-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .stat-label {
            font-size: 12px;
            color: #7f8c8d;
            margin-top: 5px;
        }
        
        .recommendations {
            background: #fff3cd;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .recommendations h3 {
            color: #856404;
            margin-top: 0;
        }
        
        .recommendations ul {
            margin: 10px 0;
        }
        
        .recommendations li {
            margin: 5px 0;
            color: #533f03;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📚 Book Coverage Matrix: Age vs Interest</h1>
        
        <div class="summary">
            <strong>Analysis Summary:</strong> ${report.totalBooks} books analyzed across ${report.ageRanges.length} age groups and ${report.keyInterests.length} interests.
            Generated on: ${new Date().toLocaleString()}
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${report.summary.wellCoveredCombinations}</div>
                <div class="stat-label">Well Covered<br>(3+ books)</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.summary.poorlyCoveredCombinations}</div>
                <div class="stat-label">Poorly Covered<br>(1-2 books)</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.summary.missingCombinations}</div>
                <div class="stat-label">Missing<br>(0 books)</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${((report.summary.wellCoveredCombinations / report.summary.totalMappings) * 100).toFixed(1)}%</div>
                <div class="stat-label">Good Coverage<br>Percentage</div>
            </div>
        </div>
        
        <div class="legend">
            <strong>Legend:</strong>
            <span class="legend-item coverage-0">0 books</span>
            <span class="legend-item coverage-1">1 book</span>
            <span class="legend-item coverage-2">2 books</span>
            <span class="legend-item coverage-3">3-4 books</span>
            <span class="legend-item coverage-4">5-9 books</span>
            <span class="legend-item coverage-high">10+ books</span>
        </div>
        
        <div class="matrix-container">
            <table class="coverage-matrix">
                <thead>
                    <tr>
                        <th>Interest \\ Age</th>
                        ${report.ageRanges.map(age => `<th>${age}歳</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${report.keyInterests.map(interest => `
                        <tr>
                            <td>${interest}</td>
                            ${report.ageRanges.map(age => {
                                const count = report.coverageAnalysis[age][interest];
                                let cssClass = 'coverage-0';
                                if (count >= 10) cssClass = 'coverage-high';
                                else if (count >= 5) cssClass = 'coverage-4';
                                else if (count >= 3) cssClass = 'coverage-3';
                                else if (count === 2) cssClass = 'coverage-2';
                                else if (count === 1) cssClass = 'coverage-1';
                                
                                return `<td class="${cssClass}">${count}</td>`;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="recommendations">
            <h3>🎯 Key Recommendations for UI Implementation</h3>
            <ul>
                <li><strong>Critical Gap:</strong> スポーツ・運動 and ゲーム have NO books for any age - consider alternatives or content addition</li>
                <li><strong>Young Age Issues:</strong> Ages 6-8 have limited coverage - prioritize well-covered interests</li>
                <li><strong>Limited Interests:</strong> 映画・アニメ, 絵を描く, 工作・手芸 need fallback suggestions</li>
                <li><strong>Dynamic Filtering:</strong> Hide or gray out interests with 0 books for selected age</li>
                <li><strong>Coverage Indicators:</strong> Show book counts next to each interest</li>
                <li><strong>Alternative Suggestions:</strong> Implement related interest recommendations</li>
            </ul>
        </div>
    </div>
</body>
</html>
`;
  
  return html;
}

// Generate CSV file
const matrix = generateCoverageMatrix();
const csvContent = matrix.map(row => row.join(',')).join('\n');
const csvPath = path.join(__dirname, 'coverage-matrix.csv');
fs.writeFileSync(csvPath, csvContent);

// Generate HTML visualization
const htmlContent = generateHTMLVisualization();
const htmlPath = path.join(__dirname, 'coverage-matrix.html');
fs.writeFileSync(htmlPath, htmlContent);

// Generate quick reference for missing combinations
const missingCombinations = [];
report.ageRanges.forEach(age => {
  report.keyInterests.forEach(interest => {
    if (report.coverageAnalysis[age][interest] === 0) {
      missingCombinations.push(`${age}歳: ${interest}`);
    }
  });
});

const quickRef = `# Quick Reference: Missing Age-Interest Combinations

Total missing combinations: ${missingCombinations.length}

## Complete List:
${missingCombinations.join('\n')}

## By Interest:
${report.keyInterests.map(interest => {
  const missingAges = report.ageRanges.filter(age => 
    report.coverageAnalysis[age][interest] === 0
  );
  if (missingAges.length > 0) {
    return `- **${interest}**: Ages ${missingAges.join(', ')}`;
  }
  return null;
}).filter(Boolean).join('\n')}

## By Age:
${report.ageRanges.map(age => {
  const missingInterests = report.keyInterests.filter(interest => 
    report.coverageAnalysis[age][interest] === 0
  );
  if (missingInterests.length > 0) {
    return `- **Age ${age}**: ${missingInterests.join(', ')}`;
  }
  return null;
}).filter(Boolean).join('\n')}
`;

const quickRefPath = path.join(__dirname, 'missing-combinations-quick-ref.md');
fs.writeFileSync(quickRefPath, quickRef);

console.log('✅ Coverage Matrix Visualization Generated!');
console.log(`📊 CSV Matrix: ${csvPath}`);
console.log(`🌐 HTML Visualization: ${htmlPath}`);
console.log(`📋 Quick Reference: ${quickRefPath}`);
console.log(`\n🔍 Open ${htmlPath} in your browser to view the interactive matrix!`);