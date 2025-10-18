# 🔧 Quick Fix: IP Address Changed

## ❌ Problem
```
Failed to load resource: net::ERR_CONNECTION_TIMED_OUT
172.20.10.3:4000/api/auth/login:1
```

## 🔍 Root Cause
IP address đã thay đổi do:
- Chuyển mạng WiFi/Ethernet khác
- DHCP cấp IP mới
- Router restart

**Old IP:** `172.20.10.3`  
**New IP:** `192.168.10.108` ✅

## ✅ Fixed
Updated `client/.env`:
```properties
VITE_API_URL=http://192.168.10.108:4000/api
```

## 🚀 Action Required

### **MUST DO: Restart Vite**
```bash
# In Vite terminal (client)
# Press Ctrl+C to stop

cd client
npm run dev
```

### Expected Output:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.10.108:5173/  ← New IP!
```

## 🧪 Test
1. **Server PC:** Access `http://localhost:5173` or `http://192.168.10.108:5173`
2. **Client PC:** Access `http://192.168.10.108:5173`
3. Try login - should work now! ✅

## 📝 Note
Server đang chạy đúng trên `192.168.10.108:4000` (verified với netstat):
```
TCP    192.168.10.108:4000    0.0.0.0:0    LISTENING ✅
TCP    192.168.10.108:4000    192.168.10.246:52076    ESTABLISHED
```

Có client khác (192.168.10.246) đang kết nối thành công!

## 🔄 Auto-Fix Script (Optional)
Để tự động update IP mỗi khi thay đổi:

```powershell
# Run in client folder
cd e:\PBL4\GAME-TETRIS\client

$serverIp = (Get-NetIPAddress -AddressFamily IPv4 | 
  Where-Object {$_.IPAddress -like "192.168.*" -and $_.PrefixOrigin -eq "Dhcp"} | 
  Select-Object -First 1).IPAddress

"VITE_API_URL=http://${serverIp}:4000/api" | Out-File -FilePath ".env" -Encoding utf8 -Force

Write-Host "✅ Updated to IP: $serverIp" -ForegroundColor Green
Write-Host "⚠️  Please restart Vite (Ctrl+C then npm run dev)" -ForegroundColor Yellow
```

---

**Status:** ✅ IP updated, waiting for Vite restart
