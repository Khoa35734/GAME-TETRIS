# ✅ FIXED: LAN Connection Setup Complete

## 🎯 What Was Done

### 1. ✅ Updated .env File
```properties
VITE_API_URL=http://172.20.10.3:4000/api
```
**Your server IP:** `172.20.10.3`

### 2. ✅ Created Firewall Rules
- Port 4000 (Server API) - ALLOWED
- Port 5173 (Vite Client) - ALLOWED

### 3. ✅ Server Configuration
- Binding: `0.0.0.0` (all interfaces) ✅
- CORS: Enabled for all origins ✅

---

## 🚀 Next Steps

### On Server PC (Current Machine - 172.20.10.3)

**1. Restart Vite Dev Server:**
```bash
# Go to Vite terminal (where npm run dev is running)
# Press Ctrl+C to stop

# Then restart:
cd e:\PBL4\GAME-TETRIS\client
npm run dev
```

**Expected Output:**
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://172.20.10.3:5173/     ← This is what client uses!
```

**2. Server should already be running on port 4000**
- Check server terminal shows: `Server running on http://0.0.0.0:4000`

---

### On Client PC (Other Computer - e.g., 172.20.10.5)

**1. Open Browser**

**Access this URL:**
```
http://172.20.10.3:5173
```
⚠️ **NOT `localhost`** - use server IP!

**2. Test API Directly (Optional)**

Open in browser first to test:
```
http://172.20.10.3:4000/health
```

Should show:
```json
{"ok": true}
```

**3. If Still Fails - Manual Override**

Press F12 → Console → Paste:
```javascript
localStorage.setItem('tetris:apiUrl', 'http://172.20.10.3:4000/api');
location.reload();
```

---

## 🧪 Quick Test

### Test 1: From Server PC
```powershell
# Should respond
Invoke-WebRequest http://172.20.10.3:4000/health
Invoke-WebRequest http://localhost:4000/health
```

### Test 2: From Client PC
```powershell
# Should respond from client computer
Invoke-WebRequest http://172.20.10.3:4000/health
```

### Test 3: Browser DevTools (Client PC)

**After opening http://172.20.10.3:5173:**

**Console Tab (F12):**
```javascript
// Check detected hostname
console.log('Hostname:', window.location.hostname);
// Should show: "172.20.10.3" (NOT "localhost")

// Check API URL
console.log('API URL env:', import.meta.env.VITE_API_URL);
// Should show: "http://172.20.10.3:4000/api"
```

**Network Tab:**
- Filter: `api` or `auth`
- Click any request
- Check **Request URL** starts with `http://172.20.10.3:4000`

---

## 🔥 Common Issues

### Issue 1: "NET::ERR_CONNECTION_REFUSED"

**Cause:** Firewall blocking or server not running

**Fix:**
```powershell
# Check if ports are open
netstat -an | Select-String ":4000"
netstat -an | Select-String ":5173"

# Both should show "LISTENING"
```

### Issue 2: "Still using localhost"

**Cause:** Vite not restarted after .env change

**Fix:**
1. Stop Vite (Ctrl+C)
2. Start again: `npm run dev`
3. Check terminal output shows Network URL with correct IP

### Issue 3: "CORS Error"

**Check:** Server terminal should NOT show CORS errors

**If shows errors:** Server CORS is already configured correctly, likely different issue

### Issue 4: "Firewall blocking"

**Test from client PC:**
```powershell
Test-NetConnection -ComputerName 172.20.10.3 -Port 4000
Test-NetConnection -ComputerName 172.20.10.3 -Port 5173
```

Both should show: `TcpTestSucceeded : True`

---

## 📊 Current Configuration

| Setting | Value | Status |
|---------|-------|--------|
| Server IP | 172.20.10.3 | ✅ Detected |
| Server Port | 4000 | ✅ Listening |
| Client Port | 5173 | ✅ Listening |
| Firewall | Rules created | ✅ Done |
| .env | Updated with IP | ✅ Done |
| Server Binding | 0.0.0.0 | ✅ All interfaces |
| CORS | Enabled | ✅ All origins |

---

## 🎮 Action Required

### RIGHT NOW:
1. **Restart Vite** (Ctrl+C → `npm run dev` in client folder)
2. **Tell client to access:** `http://172.20.10.3:5173`
3. **NOT:** `http://localhost:5173`

### Then Test:
- Client opens browser → `http://172.20.10.3:5173`
- Game should load
- Try login/register
- Check DevTools Network tab for API calls

---

## 📝 Debug Info

**If still not working, collect this info:**

### From Client PC Browser (F12):
```javascript
// Console tab
console.log({
  hostname: window.location.hostname,
  apiUrl: localStorage.getItem('tetris:apiUrl'),
  envApiUrl: import.meta.env.VITE_API_URL
});
```

### From Server PC:
```powershell
# Check what's listening
netstat -an | Select-String ":4000|:5173"

# Check IP
ipconfig | Select-String "IPv4"
```

### From Client PC:
```powershell
# Test connectivity
ping 172.20.10.3
Test-NetConnection -ComputerName 172.20.10.3 -Port 4000
Test-NetConnection -ComputerName 172.20.10.3 -Port 5173
```

---

## ✨ Summary

**What changed:**
- ✅ `.env` now has correct server IP (172.20.10.3)
- ✅ Firewall rules allow ports 4000 & 5173
- ✅ Server already configured correctly

**What to do:**
1. Restart Vite dev server
2. Client accesses `http://172.20.10.3:5173`
3. Should work now! 🎉

**Nếu vẫn không được, báo ngay và cung cấp:**
- Screenshot lỗi từ client browser (F12 Console + Network tab)
- Output từ server terminal
- Kết quả Test-NetConnection từ client PC
