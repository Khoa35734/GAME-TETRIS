# Tạo Windows Firewall Rules cho Tetris Game
# Chạy file này với quyền Administrator

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Tetris Game - Firewall Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ ERROR: Script phải chạy với quyền Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Cách chạy:" -ForegroundColor Yellow
    Write-Host "1. Right-click vào PowerShell" -ForegroundColor Yellow
    Write-Host "2. Chọn 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "3. Chạy lại script này" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

Write-Host "✅ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Port 4000 - Server
Write-Host "🔥 Tạo rule cho Server (Port 4000)..." -ForegroundColor Yellow
try {
    # Xóa rule cũ nếu có
    Remove-NetFirewallRule -DisplayName "Tetris Server" -ErrorAction SilentlyContinue
    
    # Tạo rule mới
    New-NetFirewallRule `
        -DisplayName "Tetris Server" `
        -Description "Allow inbound TCP traffic on port 4000 for Tetris Game Server" `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort 4000 `
        -Action Allow `
        -Profile Domain,Private,Public | Out-Null
    
    Write-Host "   ✅ Port 4000 (Server) - OK" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Port 4000 (Server) - FAILED: $_" -ForegroundColor Red
}

# Port 5173 - Vite Dev Server
Write-Host "🔥 Tạo rule cho Vite Dev Server (Port 5173)..." -ForegroundColor Yellow
try {
    # Xóa rule cũ nếu có
    Remove-NetFirewallRule -DisplayName "Vite Dev Server (Tetris)" -ErrorAction SilentlyContinue
    
    # Tạo rule mới
    New-NetFirewallRule `
        -DisplayName "Vite Dev Server (Tetris)" `
        -Description "Allow inbound TCP traffic on port 5173 for Tetris Game Client (Vite)" `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort 5173 `
        -Action Allow `
        -Profile Domain,Private,Public | Out-Null
    
    Write-Host "   ✅ Port 5173 (Vite) - OK" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Port 5173 (Vite) - FAILED: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Firewall Setup Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Kiểm tra rules đã tạo:" -ForegroundColor Yellow
Write-Host "  netsh advfirewall firewall show rule name=all | Select-String 'Tetris'" -ForegroundColor Gray
Write-Host ""
Write-Host "Xóa rules (nếu cần):" -ForegroundColor Yellow
Write-Host "  Remove-NetFirewallRule -DisplayName 'Tetris Server'" -ForegroundColor Gray
Write-Host "  Remove-NetFirewallRule -DisplayName 'Vite Dev Server (Tetris)'" -ForegroundColor Gray
Write-Host ""

pause
