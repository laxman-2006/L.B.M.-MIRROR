@echo off
setlocal
set "PATH=C:\Users\lc122\AppData\Local\Programs\Git\cmd;C:\Users\lc122\AppData\Local\Programs\Git\mingw64\bin;%PATH%"
title GitHub Push - LBM Mirror
cls
echo ========================================================
echo   Pushing LBM Mirror Web App and Desktop EXE to GitHub
echo ========================================================
echo.
git.exe push -u origin main
echo.
echo ========================================================
echo   Done! Press any key to close this window.
echo ========================================================
pause
