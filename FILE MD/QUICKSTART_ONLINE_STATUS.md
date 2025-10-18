# 🚀 QUICK START: Testing Online Status System

## 📋 PREREQUISITES
- ✅ Server đang chạy (port 4000)
- ✅ Client đang chạy (port 5173)
- ✅ 2 accounts đã tạo và là bạn bè

---

## 🎯 STEP-BY-STEP TEST

### **Step 1: Khởi động lại cả Server và Client**

**Terminal 1 (Server):**
```powershell
cd server
npm run dev
```

**Terminal 2 (Client):**
```powershell
cd client
npm run dev
```

✅ **Check:** Server logs phải có:
```
Server listening on 0.0.0.0:4000
```

---

### **Step 2: Kiểm tra kết nối (Browser 1)**

1. Mở browser, truy cập: `http://localhost:5173` hoặc `http://192.168.10.108:5173`
2. Nhấn **Ctrl+D** để mở Debug Panel
3. Kiểm tra:
   - ✅ API URL: `http://192.168.10.108:4000/api` hoặc `http://localhost:4000/api`
   - ✅ Socket.IO: **ONLINE** (màu xanh)
   - ✅ Socket ID: Có giá trị (không phải N/A)

📸 **Screenshot Example:**
```
🔧 Connection Debug
─────────────────────────
API URL: http://192.168.10.108:4000/api
Socket URL: http://192.168.10.108:4000
Socket.IO: ONLINE ✅
Socket ID: abc123xyz
Online Users: 0
```

---

### **Step 3: Login User A (Browser 1)**

1. Nhập email/password của User A
2. Click **Login**
3. ✅ **Check Console (F12):**
   ```
   ✅ [Socket.IO] Connected! Socket ID: abc123xyz
   🔐 [Login] Authenticating socket with accountId: 123
   ```

4. ✅ **Check Server Logs:**
   ```
   🟢 [Online] User 123 connected (socket: abc123xyz)
      📊 Total online users: 1
      👥 Online user IDs: [123]
      📡 Broadcasted user:online event for userId: 123
   ```

5. Nhấn **Ctrl+D**, click "👥 Refresh Users"
6. ✅ **Check:** "Online Users: 1"

---

### **Step 4: Login User B (Browser 2 - Incognito)**

1. Mở **Incognito/Private window**: Ctrl+Shift+N (Chrome) hoặc Ctrl+Shift+P (Firefox)
2. Truy cập: `http://localhost:5173` hoặc `http://192.168.10.108:5173`
3. Nhấn **Ctrl+D** để mở Debug Panel
4. Login với User B (phải là bạn của User A)

5. ✅ **Check Console (F12):**
   ```
   ✅ [Socket.IO] Connected! Socket ID: def456uvw
   🔐 [Login] Authenticating socket with accountId: 456
   ```

6. ✅ **Check Server Logs:**
   ```
   🟢 [Online] User 456 connected (socket: def456uvw)
      📊 Total online users: 2
      👥 Online user IDs: [123, 456]
      📡 Broadcasted user:online event for userId: 456
   ```

---

### **Step 5: Kiểm tra Online Status (Browser 1)**

**Trong Browser 1 (User A):**

1. Click nút **"Quản lý bạn bè"** (hoặc Friends icon)
2. Sidebar sẽ trượt vào từ bên phải
3. ✅ **Check Console:**
   ```
   👂 [FriendsManager] Registering socket listeners
   🟢 [FriendsManager] User came online: 456
      ✅ Matched friend: Bob (userId: 456)
      📋 Updated friends: [{id: 456, name: Bob, online: true}]
   ```

4. ✅ **Check UI:**
   - User B có **🟢 tròn xanh nhấp nháy** (pulsing green dot)
   - Text hiển thị: **"🟢 Online"**

📸 **Expected UI:**
```
┌─────────────────────────────┐
│ 👥 Quản lý Bạn Bè         │
├─────────────────────────────┤
│                             │
│ Bob                    🟢   │
│ bob@example.com             │
│ 🟢 Online                   │
│ [Remove]                    │
│                             │
└─────────────────────────────┘
```

---

### **Step 6: Test Offline Detection**

1. **Browser 2 (User B):** Close tab/window
2. ✅ **Check Server Logs:**
   ```
   ⚪ [Offline] User 456 disconnected (socket: def456uvw)
      📊 Total online users: 1
      👥 Remaining online user IDs: [123]
      📡 Broadcasted user:offline event for userId: 456
   ```

3. **Browser 1 (User A):** Wait 2-3 seconds
4. ✅ **Check Console:**
   ```
   ⚪ [FriendsManager] User went offline: 456
      ✅ Matched friend: Bob (userId: 456)
      📋 Updated friends: [{id: 456, name: Bob, online: false}]
   ```

5. ✅ **Check UI:**
   - User B giờ có **⚪ tròn xám** (không nhấp nháy)
   - Text hiển thị: **"⚪ Offline"**

---

## 🐛 TROUBLESHOOTING

### ❌ **Problem 1: Socket.IO shows OFFLINE**
**Check:**
- Server có chạy không? `netstat -an | Select-String ":4000"`
- Firewall có block port 4000 không?
- Console có lỗi "Connection error" không?

**Fix:**
1. Restart server
2. Hard refresh browser (Ctrl+Shift+R)
3. Clear cache: `localStorage.clear()` trong console

---

### ❌ **Problem 2: Login thành công nhưng không thấy log "🔐 Authenticating"**
**Check:**
- Console có lỗi JavaScript không?
- File `HomeMenu.tsx` line 123, 183 có đúng không?

**Fix:**
```javascript
// Test bằng tay trong console sau khi login
socket.emit('user:authenticate', 123); // Thay 123 bằng accountId của bạn

// Check server logs có nhận không
```

---

### ❌ **Problem 3: Server nhận auth nhưng không broadcast**
**Check Server Logs:**
```
🟢 [Online] User 123 connected
   📡 Broadcasted user:online event for userId: 123  ← Dòng này phải có!
```

Nếu không có dòng broadcast → Bug trong server code

**Fix:** Check `server/src/index.ts` line ~275:
```typescript
io.emit('user:online', userId); // Dòng này phải có
```

---

### ❌ **Problem 4: Browser 1 không nhận event từ Browser 2**
**Check Console (Browser 1):**
```
👂 [FriendsManager] Registering socket listeners  ← Phải có dòng này
```

Nếu không có → FriendsManager chưa mount hoặc useEffect không chạy

**Fix:**
1. Reload page
2. Đảm bảo đã mở Friends Manager sidebar

---

### ❌ **Problem 5: Nhận event nhưng không match userId**
**Check Console:**
```
🟢 [FriendsManager] User came online: 456
   ❌ NO MATCH FOUND  ← Nghĩa là userId không khớp
```

**Debug:**
```sql
-- Check database
SELECT user_id, user_name FROM users WHERE user_name = 'Bob';
-- Phải trả về user_id = 456

SELECT * FROM friendships WHERE user_id = 123 OR friend_id = 123;
-- Phải có record với friend_id = 456
```

**Most likely cause:** accountId khác user_id trong database

---

## 📊 SUCCESS CRITERIA

✅ Debug panel shows Socket.IO = ONLINE  
✅ Console shows "🔐 Authenticating socket with accountId"  
✅ Server logs show "🟢 [Online] User X connected"  
✅ Browser 2 login → Browser 1 sees 🟢 Online immediately  
✅ Browser 2 closes → Browser 1 sees ⚪ Offline within 3 seconds  
✅ No errors in console or server logs  

---

## 🎯 NEXT STEPS

Once online status works:

1. **Test với 2 máy khác nhau:**
   - Máy 1: `http://192.168.10.108:5173`
   - Máy 2: `http://192.168.10.108:5173` (cùng IP)

2. **Test reconnection:**
   - Tắt WiFi → Bật lại
   - Check Socket.IO tự động reconnect

3. **Stress test:**
   - 5-10 users online cùng lúc
   - Check performance

---

## 🔗 RELATED DOCS

- `AUTO_IP_SYNC.md` - Full documentation
- `FRIENDS_ONLINE_STATUS.md` - System architecture

---

**Estimated Time:** 5-10 minutes  
**Difficulty:** Easy  
**Last Updated:** 2024-10-13
