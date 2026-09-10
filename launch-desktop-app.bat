@echo off
title Launching LBM Mirror Desktop App
cls
echo ========================================================
echo   Launching LBM Mirror Full Desktop Application...
echo   (Enables Apple AirPlay Bonjour and USB Cable Scrcpy)
echo ========================================================
start "" "%~dp0release\win-unpacked\LBM Mirror.exe"
echo Done. You can close this window.
timeout /t 3 >nul
