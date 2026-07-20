@echo off
cd /d "%~dp0"
echo Starting PRUDENTIAL TAX PARTNERS server...
start /B node server.js
timeout /t 3 >nul
echo Server is running at http://localhost:3000
start http://localhost:3000
