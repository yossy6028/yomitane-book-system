#!/bin/bash

# サーバー状況確認スクリプト
echo "🔍 サーバー状況を確認中..."

# React開発サーバーのプロセス確認
SERVER_PROCESS=$(ps aux | grep -E 'react-scripts|node.*start' | grep -v grep)

if [ -n "$SERVER_PROCESS" ]; then
    echo "✅ サーバー起動中:"
    echo "$SERVER_PROCESS"
    
    # ポート使用状況確認
    PORT_INFO=$(lsof -i :3000 2>/dev/null)
    if [ -n "$PORT_INFO" ]; then
        echo "📡 ポート3000使用状況:"
        echo "$PORT_INFO"
        echo "🌐 アクセス先: http://localhost:3000"
    else
        echo "⚠️  ポート3000が使用されていません"
    fi
else
    echo "❌ サーバーが停止中です"
    echo "💡 サーバーを起動するには: npm start"
fi

echo ""
echo "📋 利用可能なコマンド:"
echo "  npm start     - 開発サーバー起動"
echo "  npm run build - プロダクションビルド"
echo "  npm test      - テスト実行"
echo "  ./server-check.sh - サーバー状況確認"