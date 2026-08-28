@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul

title RSS Feed Generator - 100%health

echo.
echo ===============================================
echo     100%health RSS Feed Generator
echo ===============================================
echo.

echo [1/3] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed.
    echo Download from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo OK: Node.js is available.

echo.
echo [2/3] Checking dependencies...
if not exist "node_modules" (
    echo Running npm install...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed.
        pause
        exit /b 1
    )
    echo OK: Setup complete.
) else (
    echo OK: node_modules already exists.
)

echo.
echo [3/3] Generating RSS from changelog.html...

node rss-generator.js
if errorlevel 1 (
    echo ERROR: RSS generation failed.
    echo Check include/changelog.html format.
    echo.
    pause
    exit /b 1
)

echo.
echo OK: rss.xml generated.
if exist "rss.xml" for %%A in (rss.xml) do echo Size: %%~zA bytes

echo.
echo Next steps:
echo   1. Upload rss.xml to Neocities
echo   2. Open /rss.xml on your site to verify
echo.
echo ===============================================
echo Done.
echo ===============================================
echo.
pause
endlocal
