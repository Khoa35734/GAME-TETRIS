# ⚡ FIX: Login/Register bị CONNECTION_REFUSED từ máy khác

**Problem:** Test page works nhưng login/register fails  
**Cause:** Client `.env` đang dùng `localhost` thay vì LAN IP  
**Status:** ✅ FIXED

---

## 🎯 VẤN ĐỀ

**Triệu chứng:**
- ✅ `http://192.168.10.108:4000/test-connection` → Works
- ✅ Socket.IO connects → Green status
- ❌ Login/Register → CONNECTION_REFUSED
- ❌ API calls fail

**Nguyên nhân:**
Client app đang dùng `VITE_API_URL=http://localhost:4000/api` trong `.env`, mà `localhost` từ máy khác không trỏ về máy server.

---

## ✅ GIẢI PHÁP

### **Step 1: Update Client `.env`**

File `client/.env` đã được update từ:
```properties
VITE_API_URL=http://localhost:4000/api
```

Thành:
```properties
VITE_API_URL=http://192.168.10.108:4000/api
```

---

### **Step 2: Restart Vite Dev Server**

**QUAN TRỌNG:** Vite **không tự động reload** `.env` file. Bạn PHẢI restart!

```powershell
# Vào terminal đang chạy Vite (terminal esbuild or client)
# Nhấn Ctrl+C để stop

# Sau đó restart
cd client
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.10.108:5173/
➜  press h + enter to show help
```

✅ Chú ý dòng **Network:** - đây là URL để truy cập từ máy khác!

---

### **Step 3: Clear Browser Cache**

Trên máy đang test (máy khác), clear cache:

**Option A: Hard Refresh**
```
Ctrl + Shift + R  (Windows/Linux)
Cmd + Shift + R   (Mac)
```

**Option B: Clear localStorage**
```javascript
// Mở console (F12), paste dòng này:
localStorage.clear();
location.reload();
```

---

### **Step 4: Test Login/Register**

1. Truy cập: `http://192.168.10.108:5173`
2. Thử login/register
3. ✅ Giờ phải work!

---

## 🔍 VERIFY CONNECTION

### **Check 1: Client Console (F12)**

Sau khi restart Vite, check console:
```javascript
// Paste vào browser console:
import.meta.env.VITE_API_URL
// Should output: "http://192.168.10.108:4000/api"
```

Hoặc check trong Network tab (F12):
- Login request URL phải là: `http://192.168.10.108:4000/api/auth/login`
- KHÔNG phải: `http://localhost:4000/api/auth/login`

---

### **Check 2: Server Logs**

Khi login từ máy khác, server phải log:
```
🔌 [Socket.IO Engine] New connection from ::ffff:192.168.10.246 via polling
POST /api/auth/login 200 xxx ms
🔐 [Login] Authenticating socket with accountId: 123
🟢 [Online] User 123 connected (socket: abc123xyz)
```

---

## 🐛 TROUBLESHOOTING

### **Issue 1: Vite shows old IP after restart**

**Symptom:**
```
➜  Network: http://172.20.10.3:5173/  ← Old IP!
```

**Fix:**
1. Check if VPN/WiFi changed
2. Restart Vite again
3. Update `.env` with new IP
4. Use `ipconfig` to verify current IP

---

### **Issue 2: Still CONNECTION_REFUSED after restart**

**Check `.env` loaded correctly:**
```powershell
# In client terminal, check logs for:
VITE v5.x.x  ready in xxx ms
```

If Vite crashes or errors → Check syntax in `.env`

**Manually verify in browser:**
```javascript
// Open DevTools Console (F12)
// Type:
window.location.origin
// Should show: http://192.168.10.108:5173

// Then check API URL in code:
// Open any file in Sources tab that imports apiConfig
// Add breakpoint and check getApiBaseUrl() returns correct IP
```

---

### **Issue 3: CORS errors**

**Error in console:**
```
Access to fetch at 'http://192.168.10.108:4000/api/auth/login' from origin 'http://192.168.10.108:5173' has been blocked by CORS
```

**Fix:**
```typescript
// Check server/src/index.ts line ~33
app.use(cors());  // ← Must be called BEFORE routes

// If still fails, use explicit config:
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
```

Restart server after changes.

---

### **Issue 4: Mixed Content (HTTPS/HTTP)**

**Error:**
```
Mixed Content: The page at 'https://...' was loaded over HTTPS, but requested an insecure resource 'http://...'
```

**Fix:** Đảm bảo cả client và server đều dùng HTTP (không HTTPS) khi test local.

---

## 📊 CHECKLIST

Trước khi test, verify:

- [x] `.env` updated với IP đúng: `192.168.10.108`
- [ ] Vite restarted (Ctrl+C then `npm run dev`)
- [ ] Browser cache cleared (Ctrl+Shift+R)
- [ ] Server running and shows correct IP in logs
- [ ] Both machines on same WiFi
- [ ] Firewall rules created (from previous step)
- [ ] Test page works: `http://192.168.10.108:4000/test-connection`

---

## 🎯 EXPECTED BEHAVIOR

### **From Same Machine (localhost):**
```
http://localhost:5173 → Works
Login → http://localhost:4000/api/auth/login → Success
```

### **From Other Machine (LAN):**
```
http://192.168.10.108:5173 → Works
Login → http://192.168.10.108:4000/api/auth/login → Success
```

### **Server Logs:**
```
POST /api/auth/login 200 45 ms
🔐 [Login] Authenticating socket with accountId: 123
🟢 [Online] User 123 connected (socket: abc123xyz)
   📊 Total online users: 1
   👥 Online user IDs: [123]
```

---

## 💡 UNDERSTANDING THE FIX

### **Why localhost doesn't work from other machines:**

- `localhost` = `127.0.0.1` = "this computer"
- When you access from **Machine A** → `localhost` means **Machine A**
- When you access from **Machine B** → `localhost` means **Machine B**
- To connect to **Machine A** from **Machine B** → Must use Machine A's LAN IP

### **Why .env needs LAN IP:**

```
Client on Machine B → Opens http://192.168.10.108:5173
Client tries to call API → Uses VITE_API_URL
If VITE_API_URL = localhost → Calls http://localhost:4000/api
localhost on Machine B → Not the server! → CONNECTION_REFUSED

Fix: VITE_API_URL = http://192.168.10.108:4000/api
Now calls correct IP → Server on Machine A → Success! ✅
```

---

## 🚀 FOR DEVELOPMENT FLEXIBILITY

### **Option 1: Use LAN IP (recommended for multi-device testing)**

```properties
# client/.env
VITE_API_URL=http://192.168.10.108:4000/api
```

✅ Works from any device on same WiFi  
❌ Must update when IP changes

---

### **Option 2: Use localhost (only for single-machine testing)**

```properties
# client/.env
VITE_API_URL=http://localhost:4000/api
```

✅ Works without knowing IP  
❌ Only works on same machine as server

---

### **Option 3: Auto-detection (already implemented!)**

Client có `apiConfig.ts` với auto-detection:
```typescript
// Automatically uses window.location.hostname
// If accessed via http://192.168.10.108:5173
// → API calls go to http://192.168.10.108:4000
```

**To enable auto-detection:**
```properties
# Remove or comment out VITE_API_URL in .env
# VITE_API_URL=http://192.168.10.108:4000/api
```

Then client will auto-detect based on access URL!

---

## ✅ FINAL VERIFICATION

After all fixes:

1. **Server terminal:**
   ```
   Versus server listening on http://0.0.0.0:4000
   ```

2. **Client terminal:**
   ```
   ➜  Network: http://192.168.10.108:5173/
   ```

3. **Test page (from other machine):**
   ```
   http://192.168.10.108:4000/test-connection
   ✅ Socket.IO Connected
   ```

4. **Client app (from other machine):**
   ```
   http://192.168.10.108:5173
   ✅ Login works
   ✅ No CONNECTION_REFUSED
   ```

5. **Server logs (when login from other machine):**
   ```
   POST /api/auth/login 200
   🟢 [Online] User connected
   ```

---

## 🎉 SUCCESS!

When all the above works:
- ✅ Other devices can access game
- ✅ Login/Register works from any device
- ✅ Online status updates in real-time
- ✅ Socket.IO connections stable

---

## 📚 RELATED DOCS

- `FIX_CONNECTION_REFUSED.md` - Main troubleshooting guide
- `AUTO_IP_SYNC.md` - IP auto-detection system
- `QUICKSTART_ONLINE_STATUS.md` - Testing online status

---

**Fix Applied:** ✅ `.env` updated to use LAN IP  
**Next Step:** Restart Vite dev server  
**Estimated Time:** 1 minute  
**Last Updated:** 2024-10-13
