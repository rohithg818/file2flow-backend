@echo off
echo ============================================
echo   File2Flow — Development Server Startup
echo ============================================
echo.

REM Start Python Engine
echo [1/3] Starting Python Conversion Engine...
start "File2Flow Engine" cmd /k "cd engine && python server.py"

REM Wait for engine to start
timeout /t 3 /nobreak >nul

REM Start Node Backend
echo [2/3] Starting Node Backend Server...
start "File2Flow Backend" cmd /k "cd server && node server.js"

REM Wait for backend to start
timeout /t 2 /nobreak >nul

REM Start Vite Frontend
echo [3/3] Starting Vite Frontend...
echo.
echo ============================================
echo   All services starting!
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:3001
echo   Engine:    http://localhost:5000
echo ============================================
echo.
npm run dev
