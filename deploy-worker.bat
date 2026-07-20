@echo off
cd /d "%~dp0"
echo This script will deploy the Cloudflare Worker.
echo.
echo Before running, register a workers.dev subdomain at:
echo https://dash.cloudflare.com/d1a5de344b0a24f657d6320e6781f5cc/workers/onboarding
echo.
pause
wrangler deploy
if %errorlevel% neq 0 (
  echo.
  echo Deployment failed. Make sure you registered a workers.dev subdomain first.
  pause
  exit /b 1
)
echo.
echo SUCCESS! Your Worker is live at:
echo https://prudential-tax-partners-api.your-subdomain.workers.dev
echo.
pause
