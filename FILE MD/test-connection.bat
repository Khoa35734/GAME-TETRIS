@echo off
REM Quick connection test for Tetris Game Server
REM Run this to quickly check if server is accessible

echo ========================================
echo   TETRIS SERVER QUICK TEST
echo ========================================
echo.

echo [1/4] Checking server IP addresses...
powershell -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.InterfaceAlias -notlike '*VirtualBox*' } | ForEach-Object { Write-Host \"  * $($_.IPAddress) [$($_.InterfaceAlias)]\" -ForegroundColor Cyan }"
echo.

echo [2/4] Checking if port 4000 is listening...
netstat -an | findstr ":4000.*LISTENING" > nul
if %errorlevel% == 0 (
    echo   [OK] Server is LISTENING on port 4000
    netstat -an | findstr ":4000.*LISTENING"
) else (
    echo   [FAIL] Server is NOT listening on port 4000
    echo   Start server: cd server ^&^& npm run dev
)
echo.

echo [3/4] Testing HTTP connection...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:4000/health' -UseBasicParsing -TimeoutSec 3; Write-Host '  [OK] HTTP localhost:4000 is responding' -ForegroundColor Green } catch { Write-Host '  [FAIL] Cannot connect to localhost:4000' -ForegroundColor Red }"
echo.

echo [4/4] Getting connection URLs...
echo.
echo   To test from THIS computer:
echo   http://localhost:4000/test-connection
echo.
echo   To test from OTHER computers (same WiFi):
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4" ^| findstr /V "127.0.0.1"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        if not "%%b"=="192.168.56.1" (
            echo   http://%%b:4000/test-connection
            echo   http://%%b:5173 ^(Client App^)
        )
    )
)
echo.

echo ========================================
echo   NEXT STEPS
echo ========================================
echo.
echo 1. Open test page in browser ^(see URLs above^)
echo 2. If fails from other computer, run:
echo    setup-firewall.ps1 ^(as Administrator^)
echo.
echo Press any key to exit...
pause > nul
