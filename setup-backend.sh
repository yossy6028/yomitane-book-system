#!/bin/bash

# バックエンドセットアップスクリプト

echo "📚 書籍表紙取得バックエンドのセットアップ開始"

# バックエンドディレクトリ作成
mkdir -p backend
cd backend

# package.json作成
cat > package.json << EOF
{
  "name": "book-cover-backend",
  "version": "1.0.0",
  "description": "Book cover scraping backend with Playwright and Gemini",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "playwright": "^1.40.0",
    "@google/generative-ai": "^0.1.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
EOF

# .env.example作成
cat > .env.example << EOF
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Server Port
PORT=3001

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Rakuten API (optional)
RAKUTEN_APP_ID=your_rakuten_app_id_here
EOF

# メインサーバーファイル作成
cat > server.js << EOF
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { BookCoverScraper } = require('./book-cover-scraper');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Book cover endpoint
app.post('/api/book-cover', async (req, res) => {
  try {
    const { title, author, isbn, genre } = req.body;
    
    if (!title || !author) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title and author are required' 
      });
    }
    
    const scraper = new BookCoverScraper(process.env.GEMINI_API_KEY);
    const imageUrl = await scraper.findBookCover({ title, author, isbn, genre });
    
    res.json({ 
      success: !!imageUrl,
      imageUrl: imageUrl || null,
      source: imageUrl ? 'scraper' : null
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Batch update endpoint (protected - should add authentication)
app.post('/api/book-covers/batch', async (req, res) => {
  try {
    const { books } = req.body;
    
    if (!Array.isArray(books)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Books array is required' 
      });
    }
    
    // Start batch process asynchronously
    res.json({ 
      success: true, 
      message: 'Batch process started',
      count: books.length 
    });
    
    // Process in background
    const { updateAllBookCovers } = require('./book-cover-scraper');
    updateAllBookCovers(books).catch(console.error);
    
  } catch (error) {
    console.error('Batch API Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(\`✅ Server running on http://localhost:\${PORT}\`);
  console.log('📌 Endpoints:');
  console.log(\`   GET  http://localhost:\${PORT}/health\`);
  console.log(\`   POST http://localhost:\${PORT}/api/book-cover\`);
  console.log(\`   POST http://localhost:\${PORT}/api/book-covers/batch\`);
});
EOF

echo "✅ バックエンドセットアップ完了"
echo ""
echo "📌 次のステップ:"
echo "1. cd backend"
echo "2. npm install"
echo "3. cp .env.example .env"
echo "4. .envファイルにGEMINI_API_KEYを設定"
echo "5. npm start でサーバー起動"