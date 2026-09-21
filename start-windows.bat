@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing project dependencies...
  call npm install --legacy-peer-deps
  if errorlevel 1 (
    echo.
    echo Dependency installation failed. Copy the error above and send it to support.
    pause
    exit /b 1
  )
)
echo.
echo Starting ONE INVERTER...
echo Open http://127.0.0.1:3000
call npm run dev
pause
