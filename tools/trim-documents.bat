@echo off
title PRUDENTIAL - Document Page Trimmer
echo.
echo  ==========================================================
echo   PRUDENTIAL TAX PARTNERS - Document Page Trimmer
echo  ==========================================================
echo.
echo   Drop a file or a folder onto this window to trim it.
echo   - PDF  : white borders are cropped from every page
echo   - DOCX : page margins are tightened
echo   Output is saved to the "trimmed-output" folder.
echo.
set /p INPUT=  Enter file or folder path: 
echo.
if "%INPUT%"=="" goto end
cd /d "%~dp0.."
node tools/trim-documents.js "%INPUT%"
echo.
pause
:end
