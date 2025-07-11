#!/bin/bash

# 通知スクリプト
# 使用方法: ./notify.sh [メッセージ]

MESSAGE=${1:-"タスクが完了しました"}

# 音声通知
say "$MESSAGE"

# コンソール表示
echo "🔔 $MESSAGE"

# サーバー状況も確認
if [ -f "./server-check.sh" ]; then
    echo ""
    ./server-check.sh
fi