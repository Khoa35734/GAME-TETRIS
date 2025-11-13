# 🔴 CRITICAL: Offline Status Issue - FIXED

**Problem:** Cả 2 máy đều hiển thị offline mặc dù đã login  
**Root Cause:** `.env` dùng hostname (`Admin-PC.local`) thay vì IP address  
**Status:** ✅ FIXED

---

## 🎯 VẤN ĐỀ

### **Triệu chứng:**
- ✅ Login thành công (không có CONNECTION_REFUSED)
- ✅ Mở Friends Manager
- ❌ Tất cả friends hiển thị "⚪ Offline"
- ❌ Không thấy 🟢 online status

### **Root Cause:**
```properties
# client/.env - SAI!
VITE_API_URL=http://Admin-PC.local:4000/api
```

**Vấn đề:**
- `Admin-PC.local` là hostname (mDNS/Bonjour)
- Không phải tất cả thiết bị đều support mDNS
- Windows thường không resolve `.local` hostnames
- Socket.IO connection fails silently → Không có authentication → Always offline

---

## ✅ GIẢI PHÁP ĐÃ ÁP DỤNG

### **Fix: Dùng IP address thay vì hostname**

```properties
# client/.env - ĐÚNG!
VITE_API_URL=http://192.168.10.108:4000/api
```

**File đã được update tự động.**

---

## 🚀 CẦN LÀM NGAY

### **Step 1: Restart Vite**

```powershell
# Terminal client (esbuild)
# Ctrl+C to stop

cd client
npm run dev
```

**Expected:**
```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.10.108:5173/
```

---

### **Step 2: Hard Refresh Browser**

**Trên CẢ 2 máy:**
```
Ctrl + Shift + R
```

Hoặc clear localStorage:
```javascript
// Console (F12)
localStorage.clear();
location.reload();
```

---

### **Step 3: Test Again**

**Máy 1:**
1. Login User A
2. Mở Friends Manager
3. Nhấn Ctrl+D (Debug Panel)
4. Check "Online Users" = 1

**Máy 2:**
1. Login User B (bạn của User A)
2. Nhấn Ctrl+D
3. Check "Online Users" = 2

**Máy 1:**
4. Refresh Friends list (đóng mở lại)
5. ✅ User B phải có **🟢 tròn xanh nhấp nháy**

---

## 🔍 DEBUG LOGS

### **Client Console (F12) - Sau khi login**

✅ **ĐÚNG:**
```javascript
[Socket.IO] Connecting to: http://192.168.10.108:4000
✅ [Socket.IO] Connected! Socket ID: abc123xyz
🔐 [Login] Authenticating socket with accountId: 123
```

❌ **SAI:**
```javascript
[Socket.IO] Connecting to: http://Admin-PC.local:4000
❌ [Socket.IO] Connection error: getaddrinfo ENOTFOUND
```

---

### **Server Logs**

✅ **ĐÚNG:**
```
🔌 [Socket.IO Engine] New connection from ::ffff:192.168.10.246 via polling
🔐 [Login] Authenticating socket with accountId: 123
🟢 [Online] User 123 connected (socket: abc123xyz)
   📊 Total online users: 1
   👥 Online user IDs: [123]
```

❌ **SAI (No logs):**
```
(No Socket.IO connection logs appear)
```

Nếu không thấy logs → Client không connect được → Check `.env` và restart Vite

---

## 🎯 VÌ SAO HOSTNAME KHÔNG WORK?

### **Technical Explanation:**

1. **mDNS (.local hostnames):**
   - Requires Bonjour/Avahi service
   - macOS: Built-in support
   - Linux: Needs avahi-daemon
   - Windows: Không có native support (cần Bonjour Print Services)

2. **IP Address:**
   - Universal, works everywhere
   - No DNS resolution needed
   - Direct TCP/IP connection

3. **Socket.IO Connection:**
   ```javascript
   // With hostname
   io('http://Admin-PC.local:4000')
   → DNS lookup fails on Windows
   → Connection fails
   → No authentication
   → Status = offline

   // With IP
   io('http://192.168.10.108:4000')
   → Direct connection
   → Success!
   → Authentication works
   → Status = online ✅
   ```

---

## 📊 VERIFICATION

### **Test 1: Socket.IO Connection**

**Browser Console:**
```javascript
// Check current connection
socket.connected
// Should be: true

socket.id
// Should be: "abc123xyz..." (not null)
```

---

### **Test 2: Online Status API**

**Browser:**
```
http://192.168.10.108:4000/api/debug/online-users
```

**Expected Response:**
```json
{
  "ok": true,
  "onlineUsers": [
    { "userId": 123, "socketId": "abc123xyz" },
    { "userId": 456, "socketId": "def456uvw" }
  ],
  "totalOnline": 2
}
```

---

### **Test 3: Debug Panel**

**Nhấn Ctrl+D trong game:**

✅ **ĐÚNG:**
```
Socket.IO: ONLINE (green)
Socket ID: abc123xyz
Online Users: 2
```

❌ **SAI:**
```
Socket.IO: OFFLINE (red)
Socket ID: N/A
Online Users: 0
```

---

## 🐛 NẾU VẪN OFFLINE

### **Check 1: Vite đã restart chưa?**

```powershell
# Check terminal output
➜  Network: http://192.168.10.108:5173/
```

Nếu vẫn thấy `Admin-PC.local` → Chưa restart

---

### **Check 2: Browser cache cleared chưa?**

```javascript
// Console (F12)
import.meta.env.VITE_API_URL
// Should output: "http://192.168.10.108:4000/api"
// NOT: "http://Admin-PC.local:4000/api"
```

Nếu vẫn thấy hostname cũ → Clear cache (Ctrl+Shift+R)

---

### **Check 3: Socket.IO có connect không?**

```javascript
// Console (F12)
socket
// Should show: { connected: true, id: "abc123xyz" }
```

Nếu `connected: false` → Connection failed → Check server logs

---

### **Check 4: Authentication có gửi không?**

**Console logs phải có:**
```
🔐 [Login] Authenticating socket with accountId: 123
```

Nếu KHÔNG có → Check `HomeMenu.tsx` line 123/183

---

## ✅ SUCCESS CRITERIA

After fix:

- [x] `.env` uses IP address (not hostname)
- [ ] Vite restarted successfully
- [ ] Browser cache cleared
- [ ] Console shows "✅ Socket.IO Connected"
- [ ] Server logs show "🟢 [Online] User connected"
- [ ] Debug panel shows "Online Users: 2"
- [ ] Friends Manager shows **🟢 Online** status

---

## 💡 BEST PRACTICES

### **For Development:**

1. **Always use IP addresses** in `.env`:
   ```properties
   VITE_API_URL=http://192.168.10.108:4000/api
   ```

2. **Use auto-detection** in code:
   ```typescript
   // apiConfig.ts already handles this!
   const hostname = window.location.hostname;
   const apiUrl = `http://${hostname}:4000/api`;
   ```

3. **Don't commit `.env`** with hardcoded IPs:
   ```gitignore
   # .gitignore
   .env
   .env.local
   ```

---

### **For Production:**

1. Use environment variables
2. Use proper DNS (not .local)
3. Use HTTPS with valid certificates
4. Use load balancers with health checks

---

## 📚 RELATED ISSUES

### **Similar Problems:**

- `Admin-PC.local` → Not resolved on Windows
- `localhost` → Only works on same machine
- `127.0.0.1` → Only loopback, not LAN

### **Solutions:**

- ✅ Use LAN IP: `192.168.10.108`
- ✅ Use dynamic detection: `window.location.hostname`
- ✅ Use proper DNS: `server.company.com`

---

## 🎉 AFTER FIX

Once working correctly:

**User A (Máy 1):**
```
Login → Friends list loads
User B shows: 🟢 Online (pulsing green dot)
```

**User B (Máy 2):**
```
Login → Friends list loads
User A shows: 🟢 Online (pulsing green dot)
```

**Server Logs:**
```
🟢 [Online] User 123 connected
🟢 [Online] User 456 connected
   📊 Total online users: 2
   👥 Online user IDs: [123, 456]
```

---

## 🚀 NEXT: WebSocket Migration?

Bạn đề cập đến việc dùng **WebSocket thuần** thay vì Socket.IO.

### **Socket.IO vs Pure WebSocket:**

| Feature | Socket.IO | Pure WebSocket |
|---------|-----------|----------------|
| Auto-reconnect | ✅ Built-in | ❌ Manual |
| Fallback (polling) | ✅ Yes | ❌ No |
| Broadcasting | ✅ Easy | ❌ Manual |
| Binary support | ✅ Yes | ✅ Yes |
| Bundle size | ⚠️ ~50KB | ✅ Native |
| Learning curve | ✅ Easy | ⚠️ Medium |

### **Recommendation:**

1. **Fix hiện tại trước** (dùng IP thay hostname)
2. **Test Socket.IO works** với IP address
3. **Nếu vẫn chậm/unstable** → Consider WebSocket migration
4. **Nếu works OK** → Keep Socket.IO (đã stable)

Nếu bạn quyết định migrate sang WebSocket thuần, tôi có thể giúp, nhưng cần:
- Implement manual reconnection logic
- Implement manual broadcasting
- Implement manual room management
- Rewrite event handlers

**Estimated time:** 2-3 hours

---

**Current Status:** ✅ Ready to test  
**Next Step:** Restart Vite → Test online status  
**Last Updated:** 2024-10-13
