# 🔧 Auto Fix Cache + Restart Services

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║     🔧 FIX: Cache Issue (setHasConfirmed error)          ║" -ForegroundColor Red
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""

# 1. Stop all Node processes
Write-Host "🛑 Stopping all Node processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Write-Host "   ✅ Stopped" -ForegroundColor Green
Write-Host ""

# 2. Clear client cache
Write-Host "🗑️  Clearing client cache..." -ForegroundColor Yellow
$clientPath = Join-Path $PSScriptRoot "..\client"

if (Test-Path "$clientPath\.vite") {
    Remove-Item -Recurse -Force "$clientPath\.vite" -ErrorAction SilentlyContinue
    Write-Host "   ✅ Removed .vite" -ForegroundColor Green
}

if (Test-Path "$clientPath\node_modules\.vite") {
    Remove-Item -Recurse -Force "$clientPath\node_modules\.vite" -ErrorAction SilentlyContinue
    Write-Host "   ✅ Removed node_modules/.vite" -ForegroundColor Green
}

if (Test-Path "$clientPath\dist") {
    Remove-Item -Recurse -Force "$clientPath\dist" -ErrorAction SilentlyContinue
    Write-Host "   ✅ Removed dist" -ForegroundColor Green
}

Write-Host ""

# 3. Start services
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     🚀 Starting Services...                               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$serverPath = Join-Path $PSScriptRoot "..\server"

# Start Server
Write-Host "   [1/2] Server (Port 4000)..." -NoNewline
Start-Process pwsh -ArgumentList "-NoExit", "-Command", @"
`$Host.UI.RawUI.WindowTitle = 'SERVER - Port 4000 (Fresh Start)';
Write-Host '╔════════════════════════════════════════╗' -ForegroundColor Magenta;
Write-Host '║   🖥️  TETRIS SERVER - Port 4000       ║' -ForegroundColor Magenta;
Write-Host '║   (Restarted - Fresh)                 ║' -ForegroundColor Magenta;
Write-Host '╚════════════════════════════════════════╝' -ForegroundColor Magenta;
Write-Host '';
cd '$serverPath';
npm run dev
"@
Start-Sleep -Seconds 2
Write-Host " ✅" -ForegroundColor Green

# Start Client
Write-Host "   [2/2] Client (Port 5173)..." -NoNewline
Start-Process pwsh -ArgumentList "-NoExit", "-Command", @"
`$Host.UI.RawUI.WindowTitle = 'CLIENT - Port 5173 (Cache Cleared)';
Write-Host '╔════════════════════════════════════════╗' -ForegroundColor Blue;
Write-Host '║   🌐 TETRIS CLIENT - Port 5173        ║' -ForegroundColor Blue;
Write-Host '║   (Cache Cleared - Fresh Start)       ║' -ForegroundColor Blue;
Write-Host '╚════════════════════════════════════════╝' -ForegroundColor Blue;
Write-Host '';
cd '$clientPath';
npm run dev
"@
Start-Sleep -Seconds 2
Write-Host " ✅" -ForegroundColor Green

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     ✅ SERVICES RESTARTED WITH CLEAN CACHE!               ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "🌐 BROWSER STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Open browser at: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "   2. HARD REFRESH (IMPORTANT!):" -ForegroundColor Red
Write-Host "      • Press: Ctrl + Shift + R" -ForegroundColor White
Write-Host "      OR" -ForegroundColor Gray
Write-Host "      • F12 → Right-click Reload → 'Empty Cache and Hard Reload'" -ForegroundColor White
Write-Host ""
Write-Host "   3. (Optional) Clear browser cache:" -ForegroundColor Yellow
Write-Host "      • Press: Ctrl + Shift + Delete" -ForegroundColor White
Write-Host "      • Select: 'Cached images and files'" -ForegroundColor White
Write-Host "      • Click: 'Clear data'" -ForegroundColor White
Write-Host "      • Reload page" -ForegroundColor White
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 AFTER BROWSER REFRESH - TEST:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Login (test1 / 123)" -ForegroundColor White
Write-Host "   2. Click 'Casual' matchmaking" -ForegroundColor White
Write-Host "   3. Open new window: http://localhost:5173" -ForegroundColor White
Write-Host "   4. Login (test2 / 123)" -ForegroundColor White
Write-Host "   5. Click 'Casual' matchmaking" -ForegroundColor White
Write-Host "   6. Both: Click 'Chấp nhận'" -ForegroundColor White
Write-Host ""
Write-Host "✅ EXPECTED RESULT:" -ForegroundColor Green
Write-Host "   • NO 'setHasConfirmed is not defined' error" -ForegroundColor White
Write-Host "   • UI shows: '✅ ĐÃ XÁC NHẬN'" -ForegroundColor White
Write-Host "   • Message: '🕐 ĐANG CHỜ ĐỐI THỦ XÁC NHẬN...'" -ForegroundColor White
Write-Host "   • Spinner spinning" -ForegroundColor White
Write-Host "   • Countdown running: 10s → 9s → 8s..." -ForegroundColor White
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""
Write-Host "⚠️  IMPORTANT: Don't forget browser hard refresh! (Ctrl+Shift+R)" -ForegroundColor Red
Write-Host ""
Write-Host "Press any key to close..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
