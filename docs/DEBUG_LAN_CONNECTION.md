# 🔍 Troubleshooting: Client Không Kết Nối Được

## 📊 Current Status

### ✅ Server Status (OK)
```
Port 4000: LISTENING on 0.0.0.0 ✅
Port 5173: LISTENING on 0.0.0.0 ✅
Server IP: 172.20.10.3 (changed from 192.168.23.19)
Client IP: 172.20.10.5 (có kết nối TCP đến server)
```

### ❌ Problem
Client từ máy khác (172.20.10.5) vẫn không thể kết nối API

---

## 🐛 Debugging Steps

### 1. Kiểm tra API URL trong Browser (Máy Client)

**Trên máy client (172.20.10.5), mở Chrome DevTools:**

```javascript
// 1. Mở Console Tab (F12)
// 2. Paste và chạy:
console.log('Current API URL:', window.localStorage.getItem('tetris:apiUrl'));
console.log('Detected hostname:', window.location.hostname);

// 3. Test import apiConfig
import('./src/services/apiConfig.js').then(m => {
  console.log('API Base URL:', m.getApiBaseUrl());
});
```

**Expected Output:**
```
API Base URL: http://172.20.10.3:4000/api  ✅ (should be server IP)
```

**Wrong Output:**
```
API Base URL: http://localhost:4000/api  ❌ (this is the problem!)
```

---

### 2. Kiểm tra Network Requests

**Chrome DevTools → Network Tab:**
1. Refresh trang
2. Filter: `auth` hoặc `api`
3. Click vào request bất kỳ
4. Xem **Request URL**

**Should be:**
```
http://172.20.10.3:4000/api/auth/...  ✅
```

**Wrong:**
```
http://localhost:4000/api/auth/...  ❌
```

---

## 🔧 Solutions

### Solution 1: Update .env File (Server PC)

**Problem:** `.env` vẫn dùng localhost

**Fix:**
```bash
# On Server PC (172.20.10.3)
cd e:\PBL4\GAME-TETRIS\client

# Edit .env
# Change from:
VITE_API_URL=http://localhost:4000/api

# To:
VITE_API_URL=http://172.20.10.3:4000/api

# Restart Vite
# Press Ctrl+C in Vite terminal
npm run dev
```

### Solution 2: Setup Firewall (If Not Done)

```powershell
# Run as Administrator
cd e:\PBL4\GAME-TETRIS
.\setup-firewall.ps1

# Verify
Get-NetFirewallRule -DisplayName "Tetris*" | Select-Object DisplayName, Enabled
```

### Solution 3: Clear Browser Cache (Client PC)

**On client machine (172.20.10.5):**
```javascript
// Browser Console (F12)
localStorage.clear();
sessionStorage.clear();
location.reload(true); // Hard refresh
```

### Solution 4: Force API URL (Client PC - Temporary)

**If auto-detect fails, manually set on client browser:**
```javascript
// Browser Console on client PC
localStorage.setItem('tetris:apiUrl', 'http://172.20.10.3:4000/api');
location.reload();
```

---

## 🧪 Testing

### Test 1: Direct API Access (Client PC Browser)

Open in browser on **client PC (172.20.10.5)**:

```
http://172.20.10.3:4000/health
```

**Expected:**
```json
{"ok": true}
```

**If this fails:** Firewall issue or server not accessible

### Test 2: Server Info Endpoint

```
http://172.20.10.3:4000/api/server-info
```

**Expected:**
```json
{
  "ok": true,
  "serverIPs": ["172.20.10.3"],
  "port": 4000,
  "apiBaseUrl": "http://172.20.10.3:4000/api"
}
```

### Test 3: Vite Client Access

```
http://172.20.10.3:5173
```

**Expected:** Tetris game loads

**If this fails:** Firewall blocks port 5173

### Test 4: Check API from Client Console

**On client PC browser (after loading http://172.20.10.3:5173):**

```javascript
// DevTools Console
fetch('http://172.20.10.3:4000/health')
  .then(r => r.json())
  .then(d => console.log('API OK:', d))
  .catch(e => console.error('API FAILED:', e));
```

---

## 🔥 Quick Fix Script

**Run này trên Server PC:**

```powershell
# 1. Update .env với IP hiện tại
cd e:\PBL4\GAME-TETRIS\client

$serverIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "172.*" -or $_.IPAddress -like "192.168.*"} | Select-Object -First 1).IPAddress

Write-Host "Detected Server IP: $serverIp" -ForegroundColor Green

$envContent = @"
# API Base URL
# Server IP: $serverIp
VITE_API_URL=http://${serverIp}:4000/api
"@

$envContent | Out-File -FilePath ".env" -Encoding utf8 -Force

Write-Host ".env updated with server IP: $serverIp" -ForegroundColor Green
Write-Host "Please restart Vite server (npm run dev)" -ForegroundColor Yellow

# 2. Show client access URL
Write-Host "`nClient should access:" -ForegroundColor Cyan
Write-Host "http://${serverIp}:5173" -ForegroundColor Green
```

---

## 📝 Checklist

### Server PC (172.20.10.3)
- [ ] `.env` có `VITE_API_URL=http://172.20.10.3:4000/api`
- [ ] Firewall rules enabled cho ports 4000 & 5173
- [ ] Server running: `npm run dev` (in server folder)
- [ ] Vite running: `npm run dev` (in client folder)
- [ ] Check terminal: "Network: http://172.20.10.3:5173"

### Client PC (172.20.10.5)
- [ ] Browser mở: `http://172.20.10.3:5173`
- [ ] DevTools Console không có CORS errors
- [ ] Network tab shows requests to `172.20.10.3:4000`
- [ ] NOT `localhost:4000`

### Network
- [ ] Ping works: `ping 172.20.10.3` (from client PC)
- [ ] Port 4000 accessible: `telnet 172.20.10.3 4000`
- [ ] Port 5173 accessible: `telnet 172.20.10.3 5173`
- [ ] Same subnet: 172.20.10.x

---

## 🚨 Common Issues

### Issue 1: "VITE_API_URL không work"

**Reason:** Vite cần restart sau khi thay đổi .env

**Fix:**
```bash
# Kill Vite (Ctrl+C)
npm run dev  # Start lại
```

### Issue 2: "Client vẫn dùng localhost"

**Reason:** Browser cache hoặc auto-detect lỗi

**Debug:**
```javascript
// Browser Console (Client PC)
console.log(window.location.hostname);  // Should be "172.20.10.3"
```

**Fix:**
```javascript
localStorage.setItem('tetris:apiUrl', 'http://172.20.10.3:4000/api');
location.reload();
```

### Issue 3: "Connection refused"

**Reason:** Firewall blocks hoặc server không bind đúng

**Check:**
```bash
# Server PC
netstat -an | Select-String ":4000"
# Must show: 0.0.0.0:4000 (not 127.0.0.1:4000)
```

### Issue 4: "CORS error"

**Check server console:** Should show:
```
cors: { origin: '*', methods: ['GET','POST'] }
```

**If missing:** Update server/src/index.ts

---

## 🎯 Most Likely Solution

**99% vấn đề là .env file vẫn dùng localhost.**

**Quick Fix:**
```powershell
# Server PC - Run PowerShell as Admin
cd e:\PBL4\GAME-TETRIS\client

# Create .env with correct IP
@"
VITE_API_URL=http://172.20.10.3:4000/api
"@ | Out-File -FilePath ".env" -Encoding utf8 -Force

# Restart Vite
# Ctrl+C in Vite terminal, then:
npm run dev

# Tell client to access:
# http://172.20.10.3:5173
```

**Then on Client PC:**
1. Open `http://172.20.10.3:5173` (NOT localhost)
2. F12 → Console
3. Check: `console.log(window.location.hostname)` → Should be "172.20.10.3"
4. If still fails: `localStorage.setItem('tetris:apiUrl', 'http://172.20.10.3:4000/api')`

---

**Next:** Chạy Quick Fix Script phía trên và báo kết quả! 🚀
