#!/bin/bash

# RSS Feed Generator for 100%health
# Linux/Mac用シェルスクリプト

set -e  # エラー時に停止

# 色付きメッセージ用の関数
print_green() { echo -e "\033[32m$1\033[0m"; }
print_red() { echo -e "\033[31m$1\033[0m"; }
print_blue() { echo -e "\033[34m$1\033[0m"; }
print_yellow() { echo -e "\033[33m$1\033[0m"; }

echo
print_blue "==============================================="
print_blue "     100%health RSS Feed Generator"
print_blue "==============================================="
echo

# Node.jsの確認
print_yellow "[1/3] Node.jsの確認中..."
if ! command -v node &> /dev/null; then
    print_red "❌ エラー: Node.jsがインストールされていません"
    echo "   https://nodejs.org/ からダウンロードしてください"
    echo
    exit 1
fi
print_green "✅ Node.js $(node --version) が利用可能です"

echo

# 依存関係の確認
print_yellow "[2/3] 依存関係の確認中..."
if [ ! -d "node_modules" ]; then
    print_yellow "📦 初回セットアップ: npm install を実行中..."
    npm install
    print_green "✅ セットアップ完了"
else
    print_green "✅ 依存関係は既にインストール済みです"
fi

echo

# RSS生成
print_yellow "[3/4] RSS生成中..."
print_yellow "📄 changelog.html を解析しています..."

if ! node rss-generator.js; then
    echo
    print_red "❌ エラー: RSS生成に失敗しました"
    echo "   changelog.htmlの形式を確認してください"
    exit 1
fi

echo
print_green "✅ RSS生成完了！"
echo "📁 ファイル: rss.xml"
if [ -f "rss.xml" ]; then
    echo "🌐 サイズ: $(wc -c < rss.xml) bytes"
fi

echo
print_yellow "[4/4] sitemap.xml 生成中..."

if ! node sitemap-generator.js; then
    echo
    print_red "❌ エラー: sitemap 生成に失敗しました"
    exit 1
fi

echo
print_green "✅ sitemap 生成完了！"
if [ -f "sitemap.xml" ]; then
    echo "🌐 サイズ: $(wc -c < sitemap.xml) bytes"
fi

echo
print_blue "📋 次のステップ:"
echo "   1. rss.xml と sitemap.xml を Neocities にアップロード"
echo "   2. /rss.xml と /sitemap.xml を確認"
echo "   3. 未配置なら robots.txt もアップロード"
echo
print_blue "==============================================="
print_blue "            処理が完了しました"
print_blue "==============================================="

echo
