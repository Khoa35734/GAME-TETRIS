# 🧪 Test BO3 Matchmaking

Write-Host "🎮 Testing BO3 Matchmaking System" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Redis
Write-Host "1️⃣  Checking Redis..." -ForegroundColor Yellow
try {
    redis-cli ping | Out-Null
    Write-Host "   ✅ Redis is running" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Redis is NOT running!" -ForegroundColor Red
    Write-Host "   Please start Redis: redis-server" -ForegroundColor Yellow
    exit 1
}

# 2. Check PostgreSQL
Write-Host ""
Write-Host "2️⃣  Checking PostgreSQL..." -ForegroundColor Yellow
$null = psql -U postgres -c "SELECT 1;" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ PostgreSQL is running" -ForegroundColor Green
} else {
    Write-Host "   ❌ PostgreSQL is NOT running!" -ForegroundColor Red
    Write-Host "   Please start PostgreSQL service" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Services..." -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# 3. Start Server
Write-Host "3️⃣  Starting Server (Port 4000)..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd server; Write-Host '🖥️  SERVER (Port 4000)' -ForegroundColor Magenta; npm run dev"
Start-Sleep -Seconds 3
Write-Host "   ✅ Server started in new terminal" -ForegroundColor Green

# 4. Start Client
Write-Host ""
Write-Host "4️⃣  Starting Client (Port 5173)..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd client; Write-Host '🌐 CLIENT (Port 5173)' -ForegroundColor Blue; npm run dev"
Start-Sleep -Seconds 3
Write-Host "   ✅ Client started in new terminal" -ForegroundColor Green

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ ALL SERVICES STARTED!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Test Steps:" -ForegroundColor Yellow
Write-Host "   1. Open Browser 1: http://localhost:5173" -ForegroundColor White
Write-Host "   2. Login with User 1 (e.g. username: test1, password: 123)" -ForegroundColor White
Write-Host "   3. Click 'Casual' or 'Ranked' matchmaking" -ForegroundColor White
Write-Host ""
Write-Host "   4. Open Browser 2: http://localhost:5173 (new window)" -ForegroundColor White
Write-Host "   5. Login with User 2 (e.g. username: test2, password: 123)" -ForegroundColor White
Write-Host "   6. Click 'Casual' or 'Ranked' matchmaking" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Expected Results:" -ForegroundColor Cyan
Write-Host "   ✅ Server console: '🎮 ĐÃ TÌM THẤY TRẬN ĐẤU!'" -ForegroundColor White
Write-Host "   ✅ Both clients: Popup with 10s countdown" -ForegroundColor White
Write-Host "   ✅ Click 'Chấp nhận' on Browser 1" -ForegroundColor White
Write-Host "   ✅ Browser 1: Show 'Đang chờ đối thủ chấp nhận...'" -ForegroundColor White
Write-Host "   ✅ Server: '⏳ Đang chờ đối thủ...'" -ForegroundColor White
Write-Host "   ✅ Click 'Chấp nhận' on Browser 2" -ForegroundColor White
Write-Host "   ✅ Server: '✅ BO3 Match created successfully!'" -ForegroundColor White
Write-Host "   ✅ Both navigate to /room/match_xxx" -ForegroundColor White
Write-Host "   ✅ Game starts in BO3 format!" -ForegroundColor White
Write-Host ""
Write-Host "📊 Server Console Logs to Check:" -ForegroundColor Cyan
Write-Host "   🎮 [Matchmaking] ĐÃ TÌM THẤY TRẬN ĐẤU!" -ForegroundColor Gray
Write-Host "   ⏰ Có 10 giây để chấp nhận..." -ForegroundColor Gray
Write-Host "   ✅ [Matchmaking] User1 đã chấp nhận" -ForegroundColor Gray
Write-Host "   ⏳ Đang chờ đối thủ..." -ForegroundColor Gray
Write-Host "   ✅ [Matchmaking] User2 đã chấp nhận" -ForegroundColor Gray
Write-Host "   ✅ Cả 2 người chơi đã chấp nhận! Bắt đầu tạo BO3 match..." -ForegroundColor Gray
Write-Host "   [BO3] Match created: xxx (User1 vs User2)" -ForegroundColor Gray
Write-Host "   ✅ BO3 Match created successfully!" -ForegroundColor Gray
Write-Host "   Room ID: match_xxx" -ForegroundColor Gray
Write-Host "   Mode: casual/ranked (Best of 3)" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
