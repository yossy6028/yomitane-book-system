#!/bin/bash

# Hooksテストスクリプト
echo "🔧 Hooksテスト開始"
echo "現在時刻: $(date)"
echo "作業ディレクトリ: $(pwd)"

# sayコマンドの直接テスト
echo "1. sayコマンド直接実行テスト:"
say "直接実行テスト"

# hooks設定の内容確認
echo -e "\n2. 現在のhooks設定:"
cat ~/.claude/settings.json | grep -A 3 "hooks"

# 実際のhooksコマンドをシミュレート
echo -e "\n3. hooksコマンドのシミュレート実行:"
eval "echo '✅ タスク完了' && if [ -f './server-check.sh' ]; then ./server-check.sh; else echo '🔍 サーバー確認中...' && (ps aux | grep -E 'react-scripts|node.*start' | grep -v grep > /dev/null && echo '✅ サーバー起動中' || echo '❌ サーバー停止中 - npm start が必要です'); fi && say 'タスクが完了しました'"

echo -e "\n✅ テスト完了"