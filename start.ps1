# Patwatoli Textile ERP - Single-Command PowerShell Launcher
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "    PATWATOLI TEXTILE ERP - STARTING SERVICES     " -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = $PSScriptRoot

# Step 1: Start Docker
Write-Host "[1/3] Starting Docker containers (PostgreSQL 18 & Redis 7)..." -ForegroundColor Green
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker failed to start. Make sure Docker Desktop is running." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Docker containers are active!`n" -ForegroundColor Green

# Step 2: Start Backend
Write-Host "[2/3] Starting Go Backend API (Port 8080)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\backend'; Write-Host '--- PATWATOLI BACKEND API (8080) ---' -ForegroundColor Cyan; go run ./cmd/api"
Write-Host "[OK] Backend started in separate window.`n" -ForegroundColor Green

# Step 3: Start Frontend
Write-Host "[3/3] Starting Next.js Frontend (Port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\frontend'; Write-Host '--- PATWATOLI FRONTEND (3000) ---' -ForegroundColor Magenta; npm.cmd run dev"
Write-Host "[OK] Frontend started in separate window.`n" -ForegroundColor Green

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  SERVICES ARE RUNNING:" -ForegroundColor Yellow
Write-Host "  -> Backend API:  http://localhost:8080/api/v1" -ForegroundColor White
Write-Host "  -> Health Check: http://localhost:8080/health" -ForegroundColor White
Write-Host "  -> Frontend App: http://localhost:3000" -ForegroundColor White
Write-Host "  -> Login Email:  owner@patwatoli.example" -ForegroundColor Gray
Write-Host "  -> Password:     S3cure#Pass" -ForegroundColor Gray
Write-Host "===================================================" -ForegroundColor Cyan
