# ⚡ Quick Start - LAN Mode

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Tetris Game - LAN Quick Start" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Lấy IP
Write-Host "🔍 Detecting server IP..." -ForegroundColor Yellow
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"} | Select-Object -First 1).IPAddress

if ($ip) {
    Write-Host "   ✅ Server IP: $ip" -ForegroundColor Green
} else {
    Write-Host "   ❌ Could not detect IP!" -ForegroundColor Red
    $ip = Read-Host "   Enter your LAN IP manually"
}

Write-Host ""
Write-Host "📝 Creating .env file..." -ForegroundColor Yellow

# Tạo .env file
$envContent = @"
# API Base URL - Automatically generated
# Server IP: $ip

# For LAN access (other computers)
VITE_API_URL=http://${ip}:4000/api

# For localhost only (uncomment if testing locally)
# VITE_API_URL=http://localhost:4000/api
"@

$envContent | Out-File -FilePath "client\.env" -Encoding UTF8
Write-Host "   ✅ Created client\.env with IP: $ip" -ForegroundColor Green

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Start Server:" -ForegroundColor White
Write-Host "   cd server" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Start Client:" -ForegroundColor White
Write-Host "   cd client" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Access from other computers:" -ForegroundColor White
Write-Host "   http://${ip}:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Access from this computer:" -ForegroundColor White
Write-Host "   http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Make sure firewall is configured!" -ForegroundColor Yellow
Write-Host "   Run: .\setup-firewall.ps1 (as Administrator)" -ForegroundColor Gray
Write-Host ""

pause
