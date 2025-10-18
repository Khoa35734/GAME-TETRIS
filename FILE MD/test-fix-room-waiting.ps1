# 🚀 TEST FIX - Room không tồn tại + UI Đang chờ

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     🔧 TEST FIX: Room + Waiting UI                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ CÁC VẤN ĐỀ ĐÃ FIX:" -ForegroundColor Green
Write-Host "   1. ✅ Lỗi 'Phòng không tồn tại' - Added 500ms delay + verify" -ForegroundColor White
Write-Host "   2. ✅ UI 'Đang chờ đối thủ' - Enhanced với spinner + countdown" -ForegroundColor White
Write-Host "   3. ✅ Timer countdown - Chạy cho cả 'found' và 'waiting'" -ForegroundColor White
Write-Host ""

# Check services
Write-Host "🔍 Checking Services..." -ForegroundColor Yellow
Write-Host ""

# Redis
Write-Host "   [1/3] Redis..." -NoNewline
try {
    $null = redis-cli ping 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌ NOT RUNNING!" -ForegroundColor Red
        Write-Host "         Run: redis-server" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host " ❌ NOT FOUND!" -ForegroundColor Red
    exit 1
}

# PostgreSQL
Write-Host "   [2/3] PostgreSQL..." -NoNewline
$null = psql -U postgres -c "SELECT 1;" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✅" -ForegroundColor Green
} else {
    Write-Host " ⚠️  Warning (optional)" -ForegroundColor Yellow
}

# Node
Write-Host "   [3/3] Node.js..." -NoNewline
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✅ ($nodeVersion)" -ForegroundColor Green
} else {
    Write-Host " ❌" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     🚀 Starting Services...                               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Start Server
Write-Host "   [1/2] Server (Port 4000)..." -NoNewline
Start-Process pwsh -ArgumentList "-NoExit", "-Command", @"
`$Host.UI.RawUI.WindowTitle = 'SERVER - Port 4000';
Write-Host '╔════════════════════════════════════════╗' -ForegroundColor Magenta;
Write-Host '║   🖥️  TETRIS SERVER - Port 4000       ║' -ForegroundColor Magenta;
Write-Host '╚════════════════════════════════════════╝' -ForegroundColor Magenta;
Write-Host '';
cd server;
npm run dev
"@
Start-Sleep -Seconds 2
Write-Host " ✅" -ForegroundColor Green

# Start Client
Write-Host "   [2/2] Client (Port 5173)..." -NoNewline
Start-Process pwsh -ArgumentList "-NoExit", "-Command", @"
`$Host.UI.RawUI.WindowTitle = 'CLIENT - Port 5173';
Write-Host '╔════════════════════════════════════════╗' -ForegroundColor Blue;
Write-Host '║   🌐 TETRIS CLIENT - Port 5173        ║' -ForegroundColor Blue;
Write-Host '╚════════════════════════════════════════╝' -ForegroundColor Blue;
Write-Host '';
cd client;
npm run dev
"@
Start-Sleep -Seconds 2
Write-Host " ✅" -ForegroundColor Green

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     ✅ ALL SERVICES STARTED!                              ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📋 TEST STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   BROWSER 1:" -ForegroundColor Cyan
Write-Host "   1. Open: http://localhost:5173" -ForegroundColor White
Write-Host "   2. Login (test1 / 123)" -ForegroundColor White
Write-Host "   3. Click 'Casual' matchmaking" -ForegroundColor White
Write-Host ""
Write-Host "   BROWSER 2:" -ForegroundColor Cyan
Write-Host "   4. Open: http://localhost:5173 (new window)" -ForegroundColor White
Write-Host "   5. Login (test2 / 123)" -ForegroundColor White
Write-Host "   6. Click 'Casual' matchmaking" -ForegroundColor White
Write-Host ""
Write-Host "   BOTH BROWSERS:" -ForegroundColor Cyan
Write-Host "   7. ✅ See popup: 'ĐÃ TÌM THẤY ĐỐI THỦ' with 10s countdown" -ForegroundColor White
Write-Host ""
Write-Host "   BROWSER 1:" -ForegroundColor Cyan
Write-Host "   8. Click '✓ Chấp Nhận'" -ForegroundColor White
Write-Host "   9. ✅ UI MUST SHOW:" -ForegroundColor Green
Write-Host "      • Title: '✅ ĐÃ XÁC NHẬN' (size 28, green, glowing)" -ForegroundColor Gray
Write-Host "      • Spinner: Large (80x80), spinning continuously" -ForegroundColor Gray
Write-Host "      • Message: '🕐 ĐANG CHỜ ĐỐI THỦ XÁC NHẬN...' (gradient)" -ForegroundColor Gray
Write-Host "      • Opponent: Card with name (e.g. 'Đối thủ: test2')" -ForegroundColor Gray
Write-Host "      • Countdown: '⏱️ Thời gian còn lại: 8s' (orange, counting down)" -ForegroundColor Gray
Write-Host "      • Helper: 'Nếu đối thủ không xác nhận...'" -ForegroundColor Gray
Write-Host ""
Write-Host "   BROWSER 2:" -ForegroundColor Cyan
Write-Host "   10. Click '✓ Chấp Nhận'" -ForegroundColor White
Write-Host ""
Write-Host "   SERVER CONSOLE MUST SHOW:" -ForegroundColor Magenta
Write-Host "   • '[BO3] Match created: xxx (test1 vs test2)'" -ForegroundColor Gray
Write-Host "   • '✅ BO3 Match created successfully!'" -ForegroundColor Gray
Write-Host "   • '✅ Room verified in Redis, notifying clients...' ← IMPORTANT!" -ForegroundColor Green
Write-Host "   • '✅ Match xxx started successfully (BO3)'" -ForegroundColor Gray
Write-Host ""
Write-Host "   BOTH BROWSERS:" -ForegroundColor Cyan
Write-Host "   11. ✅ Navigate to /room/match_xxx" -ForegroundColor White
Write-Host "   12. ✅ NO ERROR 'Phòng không tồn tại'!" -ForegroundColor Green
Write-Host "   13. ✅ Room loads successfully" -ForegroundColor Green
Write-Host "   14. ✅ BO3 game ready to start!" -ForegroundColor Green
Write-Host ""

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║     🔍 VERIFY CHECKLIST                                   ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""
Write-Host "   [ ] Match found popup shows countdown 10s → 0s" -ForegroundColor White
Write-Host "   [ ] Click 'Chấp nhận' → UI changes to 'ĐANG CHỜ'" -ForegroundColor White
Write-Host "   [ ] Large spinner (80x80) spinning smoothly" -ForegroundColor White
Write-Host "   [ ] Message 'ĐANG CHỜ ĐỐI THỦ XÁC NHẬN' with gradient" -ForegroundColor White
Write-Host "   [ ] Opponent name displayed in card" -ForegroundColor White
Write-Host "   [ ] Countdown '8s → 7s → 6s...' running" -ForegroundColor White
Write-Host "   [ ] Server log shows 'Room verified in Redis'" -ForegroundColor White
Write-Host "   [ ] Both browsers navigate successfully" -ForegroundColor White
Write-Host "   [ ] NO 'Phòng không tồn tại' error" -ForegroundColor White
Write-Host "   [ ] Room loads with 2 players" -ForegroundColor White
Write-Host ""

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║     🐛 TROUBLESHOOTING                                    ║" -ForegroundColor Red
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""
Write-Host "   IF 'Phòng không tồn tại':" -ForegroundColor Yellow
Write-Host "   → Check server log for 'Room verified in Redis'" -ForegroundColor White
Write-Host "   → Run: redis-cli KEYS 'match:match_*'" -ForegroundColor White
Write-Host "   → Should see room key before navigation" -ForegroundColor White
Write-Host ""
Write-Host "   IF UI not showing 'Đang chờ':" -ForegroundColor Yellow
Write-Host "   → Check browser console for 'matchmaking:waiting' event" -ForegroundColor White
Write-Host "   → Status should change: 'found' → 'waiting' → navigate" -ForegroundColor White
Write-Host ""
Write-Host "   IF countdown not running:" -ForegroundColor Yellow
Write-Host "   → Check timer useEffect runs for 'waiting' status" -ForegroundColor White
Write-Host "   → Should countdown from 10 to 0" -ForegroundColor White
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Press any key to close..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
