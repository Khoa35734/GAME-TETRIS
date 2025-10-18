# Test Matchmaking với Redis

Write-Host "🧪 Testing Matchmaking System với Redis" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check Redis
Write-Host "📋 Test 1: Kiểm tra Redis đang chạy..." -ForegroundColor Yellow
try {
    $redisTest = redis-cli ping 2>$null
    if ($redisTest -eq "PONG") {
        Write-Host "✅ Redis đang chạy!" -ForegroundColor Green
    } else {
        Write-Host "❌ Redis không chạy. Chạy lệnh: redis-server" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Redis CLI không tìm thấy. Cài đặt Redis trước." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Check Server
Write-Host "📋 Test 2: Kiểm tra Server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -TimeoutSec 2 -UseBasicParsing 2>$null
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Server đang chạy!" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Server không chạy. Chạy lệnh: cd server && npm run dev" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 3: Check Matchmaking Stats
Write-Host "📋 Test 3: Kiểm tra Matchmaking Stats..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "http://localhost:4000/api/matchmaking/stats" -Method Get 2>$null
    Write-Host "✅ Matchmaking API hoạt động!" -ForegroundColor Green
    Write-Host "   Casual Queue: $($stats.casual.players) người" -ForegroundColor Gray
    Write-Host "   Ranked Queue: $($stats.ranked.players) người" -ForegroundColor Gray
    Write-Host "   Active Matches: $($stats.activeMatches)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Không thể lấy stats. Kiểm tra server log." -ForegroundColor Red
}
Write-Host ""

# Test 4: Check Redis Keys
Write-Host "📋 Test 4: Kiểm tra Redis Keys..." -ForegroundColor Yellow
$socketKeys = redis-cli KEYS "socket:user:*" 2>$null
$userKeys = redis-cli KEYS "user:socket:*" 2>$null

if ($socketKeys) {
    Write-Host "✅ Có $($socketKeys.Count) socket đang authenticated" -ForegroundColor Green
    $socketKeys | ForEach-Object {
        $accountId = redis-cli GET $_
        Write-Host "   $_ → User ID: $accountId" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Không có socket nào đang authenticated" -ForegroundColor Yellow
    Write-Host "   Đăng nhập vào client để test" -ForegroundColor Gray
}
Write-Host ""

# Instructions
Write-Host "📖 Hướng dẫn test:" -ForegroundColor Cyan
Write-Host "1. Mở 2 browser (1 normal, 1 incognito)" -ForegroundColor White
Write-Host "2. Đăng nhập 2 tài khoản khác nhau" -ForegroundColor White
Write-Host "3. Cả 2 vào Đối kháng → TÌM TRẬN" -ForegroundColor White
Write-Host "4. Quan sát console log và matchmaking" -ForegroundColor White
Write-Host ""

Write-Host "🔍 Debug commands:" -ForegroundColor Cyan
Write-Host "   redis-cli KEYS 'socket:user:*'     # Xem sockets đang auth" -ForegroundColor Gray
Write-Host "   redis-cli GET socket:user:{id}     # Xem accountId của socket" -ForegroundColor Gray
Write-Host "   redis-cli FLUSHDB                  # Clear tất cả Redis data" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Tất cả tests hoàn tất!" -ForegroundColor Green
