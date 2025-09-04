@echo off
chcp 65001 > nul
title RSS Feed Generator - 100%health

echo.
echo ===============================================
echo     100%health RSS Feed Generator
echo ===============================================
echo.

echo [1/3] Node.jsの確認中...
node --version > nul 2>&1
if errorlevel 1 (
    echo ❌ エラー: Node.jsがインストールされていません
    echo    https://nodejs.org/ からダウンロードしてください
    echo.
    pause
    exit /b 1
)
echo ✅ Node.js が利用可能です

echo.
echo [2/3] 依存関係の確認中...
if not exist "node_modules" (
    echo 📦 初回セットアップ: npm install を実行中...
    npm install
    if errorlevel 1 (
        echo ❌ エラー: npm install に失敗しました
        pause
        exit /b 1
    )
    echo ✅ セットアップ完了
) else (
    echo ✅ 依存関係は既にインストール済みです
)

echo.
echo [3/3] RSS生成中...
echo 📄 changelog.html を解析しています...

node rss-generator.js
if errorlevel 1 (
    echo ❌ エラー: RSS生成に失敗しました
    echo    changelog.htmlの形式を確認してください
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ RSS生成完了！
echo 📁 ファイル: rss.xml
echo 🌐 サイズ: 
for %%A in (rss.xml) do echo    %%~zA bytes

echo.
echo 📋 次のステップ:
echo    1. rss.xml をNeocitiesにアップロード
echo    2. サイトで https://your-site.neocities.org/rss.xml を確認
echo.
echo ===============================================
echo            処理が完了しました
echo ===============================================
echo.
pause
