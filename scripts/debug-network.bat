@echo off
REM ============================================
REM Sentinel Debug Script - Network & API Tests
REM ============================================
echo.
echo ========================================
echo Sentinel Network Debug Script
echo ========================================
echo.

REM Check DNS resolution
echo [1/4] Testing DNS resolution...
echo.
echo Testing generativelanguage.googleapis.com:
nslookup generativelanguage.googleapis.com 2>nul
if errorlevel 1 (
    echo FAILED: DNS resolution failed. Check your internet connection or DNS settings.
) else (
    echo OK: DNS resolution working
)
echo.

echo Testing img.youtube.com:
nslookup img.youtube.com 2>nul
if errorlevel 1 (
    echo FAILED: YouTube DNS failed
) else (
    echo OK: YouTube DNS working
)
echo.

REM Test local proxy server
echo [2/4] Testing local proxy server (http://localhost:4000)...
echo.
curl -s -o nul -w "Health check: HTTP %%{http_code}\n" http://localhost:4000/health
if errorlevel 1 (
    echo FAILED: Proxy server not running. Start with: npm run server
) else (
    echo.
    echo Proxy server response:
    curl -s http://localhost:4000/health
)
echo.
echo.

REM Test YouTube thumbnail endpoint
echo [3/4] Testing YouTube thumbnail extraction...
echo.
curl -s "http://localhost:4000/youtube-thumbnail?url=https://www.youtube.com/shorts/1NdD7A1VIpA"
echo.
echo.

REM Test Gemini API (if key configured)
echo [4/4] Testing Gemini API endpoint...
echo.
echo Sending test request to /gemini/analyze...
curl -s -X POST -H "Content-Type: application/json" ^
  -d "{\"imageUrl\":\"https://img.youtube.com/vi/1NdD7A1VIpA/hqdefault.jpg\"}" ^
  http://localhost:4000/gemini/analyze
echo.
echo.

echo ========================================
echo Debug complete
echo ========================================
echo.
echo If you see errors:
echo - DNS errors: Check internet connection
echo - Proxy errors: Run 'npm run server' first
echo - Gemini errors: Set GEMINI_API_KEY environment variable
echo.
pause
