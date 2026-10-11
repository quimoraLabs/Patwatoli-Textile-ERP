@echo off
title Patwatoli Textile ERP - Launcher
echo ===================================================
echo     PATWATOLI TEXTILE ERP - STARTING SERVICES
echo ===================================================
echo.

echo [1/3] Starting Docker containers (PostgreSQL 18 ^& Redis 7)...
docker compose up -d
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start Docker containers. Please ensure Docker Desktop is running.
    pause
    exit /b %errorlevel%
)
echo [OK] Docker containers are running!
echo.

echo [2/3] Starting Go Backend API (Port 8080)...
start "Patwatoli ERP - Backend API (Port 8080)" cmd /k "cd /d "%~dp0backend" && go run ./cmd/api"
echo [OK] Backend API process launched in a new terminal window.
echo.

echo [3/3] Starting Next.js Frontend (Port 3000)...
start "Patwatoli ERP - Frontend (Port 3000)" cmd /k "cd /d "%~dp0frontend" && npm.cmd run dev"
echo [OK] Frontend development server launched in a new terminal window.
echo.

echo ===================================================
echo   ALL SERVICES ARE STARTING UP!
echo   - Backend API:  http://localhost:8080/api/v1
echo   - Health Check: http://localhost:8080/health
echo   - Web Frontend: http://localhost:3000
echo   - Default Login: owner@patwatoli.example / S3cure#Pass
echo ===================================================
echo.
pause
