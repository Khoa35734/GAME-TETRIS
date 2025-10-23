# 🔄 AUTO IP SYNC & ONLINE STATUS DEBUG GUIDE

## 📌 TÓM TẮT CÁC THAY ĐỔI

### 1️⃣ **Tự Động Sync IP Server**
- Socket.IO giờ dùng **cùng IP với API** (từ `apiConfig.ts`)
- Không cần cập nhật `.env` nữa khi IP thay đổi
- Tự động detect IP từ `window.location.hostname`

### 2️⃣ **Debug Tools**
- Thêm **ConnectionDebug** component để theo dõi kết nối realtime
- Debug endpoint: `GET /api/debug/online-users`
- Keyboard shortcut: **Ctrl+D** để mở/đóng debug panel

### 3️⃣ **Enhanced Logging**
- Server logs chi tiết khi user authenticate/disconnect
- Client logs chi tiết khi nhận online/offline events
- Dễ dàng debug vấn đề kết nối

---

## 🚀 CÁCH SỬ DỤNG

### **Bước 1: Restart Server**
```powershell
# Trong terminal server
cd server
npm run dev
```

### **Bước 2: Restart Client**
```powershell
# Trong terminal client
cd client
npm run dev
```

### **Bước 3: Mở Debug Panel**
1. Truy cập trang chủ: `http://localhost:5173` hoặc `http://192.168.10.108:5173`
2. Nhấn **Ctrl+D** để mở debug panel
3. Kiểm tra:
   - ✅ API URL có đúng không?
   - ✅ Socket.IO có kết nối thành công không? (màu xanh)
   - ✅ Socket ID có hiển thị không?

### **Bước 4: Test Online Status**
1. **Máy 1**: Đăng nhập với User A
2. Nhấn **Ctrl+D**, click "👥 Refresh Users" → Xem có User A trong list không
3. **Máy 2**: Đăng nhập với User B (là bạn của User A)
4. **Máy 1**: Click "👥 Refresh Users" lại → Nên thấy cả User A và User B
5. **Máy 1**: Mở Friends Manager → User B phải có **🟢 tròn xanh** và chữ "Online"

---

## 🔍 DEBUG CHECKLIST

### ✅ **Socket.IO Connection**
```
Check console logs:
- ✅ [Socket.IO] Connecting to: http://192.168.10.108:4000
- ✅ [Socket.IO] Connected! Socket ID: abc123xyz
```

Nếu thấy lỗi:
```
❌ [Socket.IO] Connection error: ...
```
→ Kiểm tra server có đang chạy không: `netstat -an | Select-String ":4000"`

---

### ✅ **User Authentication**
**Sau khi login, check console:**

**Client side:**
```
🔐 [Login] Authenticating socket with accountId: 123
```

**Server side:**
```
🟢 [Online] User 123 connected (socket: abc123xyz)
   📊 Total online users: 1
   👥 Online user IDs: [123]
   📡 Broadcasted user:online event for userId: 123
```

Nếu KHÔNG thấy log này → User không được authenticate → Online status sẽ không hoạt động!

---

### ✅ **Friends List Loading**
**Khi mở Friends Manager, check console:**

```
👂 [FriendsManager] Registering socket listeners for online/offline events
```

**Khi có bạn online:**
```
🟢 [FriendsManager] User came online: 456
   ✅ Matched friend: Bob (userId: 456)
   📋 Updated friends: [{id: 123, name: Alice, online: true}, {id: 456, name: Bob, online: true}]
```

Nếu KHÔNG thấy "✅ Matched friend" → userId không khớp → Kiểm tra database!

---

## 🐛 COMMON ISSUES

### **Issue 1: Socket.IO không kết nối**
**Triệu chứng:**
```
❌ [Socket.IO] Connection error: Error: xhr poll error
```

**Giải pháp:**
1. Check server có chạy không: `netstat -an | Select-String ":4000"`
2. Check firewall có block port 4000 không
3. Mở debug panel (Ctrl+D), click "🔄 Reconnect"

---

### **Issue 2: User đã login nhưng không xuất hiện trong Online Users**
**Triệu chứng:**
- Client thấy "✅ [Socket.IO] Connected!"
- Nhưng server KHÔNG có log "🟢 [Online] User X connected"

**Giải pháp:**
1. Check console có log "🔐 [Login] Authenticating socket with accountId" không?
2. Nếu KHÔNG có → Bug trong `HomeMenu.tsx`, line 123 hoặc 183
3. Nếu CÓ nhưng server không nhận → Check server logs có lỗi không

**Test bằng tay:**
```javascript
// Paste vào browser console sau khi login
socket.emit('user:authenticate', 123); // Thay 123 bằng accountId của bạn
```

Nếu server logs xuất hiện → Vấn đề ở frontend code
Nếu server logs KHÔNG xuất hiện → Vấn đề ở network/Socket.IO connection

---

### **Issue 3: Bạn bè không hiển thị online**
**Triệu chứng:**
- Debug panel thấy 2 users online
- Nhưng Friends Manager vẫn hiển thị "⚪ Offline"

**Giải pháp:**
1. Check console có log "🟢 [FriendsManager] User came online" không?
2. Nếu CÓ nhưng không match → Check log "✅ Matched friend"
3. Nếu KHÔNG match → `userId` từ server khác với `userId` trong friends list

**Debug:**
```sql
-- Check trong database
SELECT user_id, user_name FROM users WHERE user_name IN ('Alice', 'Bob');

-- So sánh với friends list
SELECT * FROM friendships WHERE user_id = 123;
```

**Most likely cause:** Database có user_id khác với accountId được gửi

---

### **Issue 4: IP thay đổi nhưng vẫn connect vào IP cũ**
**Triệu chứng:**
- Server chạy ở `192.168.10.108`
- Client vẫn connect vào `172.20.10.3` (IP cũ)

**Giải pháp:**
1. Clear cache: `localStorage.clear()` trong browser console
2. Hard refresh: **Ctrl+Shift+R**
3. Restart Vite dev server
4. Xóa `.env` file và dùng auto-detection

**Verify:**
```javascript
// Browser console
import { getApiBaseUrl } from './services/apiConfig';
console.log(getApiBaseUrl()); // Phải là IP mới
```

---

## 🛠️ API ENDPOINTS

### **1. Server Info (Auto-detect IP)**
```http
GET http://192.168.10.108:4000/api/server-info

Response:
{
  "ok": true,
  "serverIPs": ["192.168.10.108"],
  "port": 4000,
  "apiBaseUrl": "http://192.168.10.108:4000/api"
}
```

### **2. Debug Online Users**
```http
GET http://192.168.10.108:4000/api/debug/online-users

Response:
{
  "ok": true,
  "onlineUsers": [
    { "userId": 123, "socketId": "abc123xyz" },
    { "userId": 456, "socketId": "def456uvw" }
  ],
  "totalOnline": 2
}
```

### **3. Check Your IP**
```http
GET http://192.168.10.108:4000/whoami

Response:
{
  "ip": "192.168.10.246"
}
```

---

## 📊 MONITORING

### **Server Logs**
```bash
# Theo dõi realtime
cd server
npm run dev | grep -E "Online|Offline|authenticate"
```

Expected output:
```
🟢 [Online] User 123 connected (socket: abc123xyz)
   📊 Total online users: 1
   👥 Online user IDs: [123]
🟢 [Online] User 456 connected (socket: def456uvw)
   📊 Total online users: 2
   👥 Online user IDs: [123, 456]
⚪ [Offline] User 123 disconnected (socket: abc123xyz)
   📊 Total online users: 1
   👥 Remaining online user IDs: [456]
```

### **Client Logs (Browser Console)**
```javascript
// Bật verbose logging
localStorage.setItem('debug', 'socket.io-client:*');
location.reload();
```

---

## 🎯 TESTING WORKFLOW

### **Test Case 1: Single User**
1. Login với User A
2. Open debug panel (Ctrl+D)
3. Check "Online Users" = 1
4. Check Socket ID hiển thị

✅ **Expected:** Thấy User A trong online list

---

### **Test Case 2: Two Users Same Machine**
1. Browser 1: Login User A
2. Browser 2 (Incognito): Login User B
3. Browser 1: Open Friends Manager
4. Check User B có **🟢 Online** không

✅ **Expected:** User B hiển thị online trong friends list của User A

---

### **Test Case 3: Two Users Different Machines**
**Máy 1 (192.168.10.108):**
1. Login User A
2. Open Friends Manager

**Máy 2 (192.168.10.246):**
1. Truy cập `http://192.168.10.108:5173`
2. Login User B

**Máy 1:**
3. Xem Friends list → User B phải có **🟢 Online**

✅ **Expected:** Realtime update, không cần refresh

---

### **Test Case 4: Disconnect Detection**
1. Browser 1: Login User A
2. Browser 2: Login User B
3. Browser 1: Check User B online (🟢)
4. Browser 2: Close tab
5. Browser 1: Wait 5 seconds

✅ **Expected:** User B tự động chuyển thành ⚪ Offline

---

## 🔧 TROUBLESHOOTING COMMANDS

### **Check Server Status**
```powershell
# Windows
netstat -an | Select-String ":4000"

# Expected:
# TCP    0.0.0.0:4000           LISTENING
# TCP    192.168.10.108:4000    192.168.10.246:12345    ESTABLISHED
```

### **Check Current IP**
```powershell
ipconfig | Select-String "IPv4"

# Use the active LAN adapter IP (NOT VirtualBox)
```

### **Test API Connection**
```powershell
# Test from another machine
curl http://192.168.10.108:4000/api/server-info

# Should return JSON with server info
```

### **Test Socket.IO Connection**
```javascript
// Browser console
socket.connected  // Should be true
socket.id         // Should be a string like "abc123xyz"
```

---

## 📝 FILES CHANGED

### **Client**
- ✅ `client/src/socket.ts` - Sync với API URL
- ✅ `client/src/components/HomeMenu.tsx` - Debug panel + logging
- ✅ `client/src/components/FriendsManager.tsx` - Enhanced logging
- ✅ `client/src/components/ConnectionDebug.tsx` - NEW debug tool

### **Server**
- ✅ `server/src/index.ts` - Enhanced logging + debug endpoint

---

## 🎉 FEATURES

### **Auto IP Detection**
- ✅ Socket.IO tự động dùng cùng IP với API
- ✅ Không cần config `.env` khi IP thay đổi
- ✅ Fallback: env → localStorage → auto-detect

### **Debug Tools**
- ✅ Realtime connection status
- ✅ Online users list
- ✅ Socket ID display
- ✅ One-click reconnect

### **Enhanced Logging**
- ✅ Server: Detailed authentication logs
- ✅ Client: Step-by-step online status updates
- ✅ Easy troubleshooting với emoji icons

---

## 💡 TIPS

1. **Always open debug panel first** (Ctrl+D) khi test online status
2. **Check server logs** nếu client không thấy sự kiện
3. **Use different browsers** (Chrome + Firefox) để test 2 users trên cùng máy
4. **Check database** nếu userId không match
5. **Clear localStorage** nếu IP cache cũ

---

## 🔗 RELATED DOCS

- `FRIENDS_ONLINE_STATUS.md` - Chi tiết hệ thống online status
- `FIX_IP_CHANGE.md` - Hướng dẫn fix IP change (deprecated)
- `ARCHITECTURE_UDP.md` - Kiến trúc tổng thể

---

**Last Updated:** 2024-10-13  
**Author:** GitHub Copilot  
**Status:** ✅ Production Ready
