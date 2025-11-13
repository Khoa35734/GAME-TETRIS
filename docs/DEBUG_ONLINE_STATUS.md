# 🐛 DEBUG: Online Status Không Hoạt Động

**Problem:** Cả 2 máy đều hiển thị offline dù đã login  
**Status:** Debugging

---

## 🔍 DEBUG CHECKLIST

Chạy từng bước sau để tìm nguyên nhân:

### **STEP 1: Check Socket.IO Connection**

**Trên Browser Console (F12) của CẢ 2 MÁY:**

```javascript
// Check Socket.IO connected
console.log('Socket connected:', socket.connected);
console.log('Socket ID:', socket.id);

// If not connected, check connection status
socket.on('connect', () => console.log('✅ Connected:', socket.id));
socket.on('connect_error', (err) => console.log('❌ Error:', err.message));
socket.on('disconnect', (reason) => console.log('⚠️ Disconnected:', reason));
```

✅ **Expected:** `socket.connected = true`, có Socket ID  
❌ **If false:** Socket.IO không connect → Check server logs

---

### **STEP 2: Check Authentication Event**

**Sau khi login, check console CÓ LOG này không:**

```
🔐 [Login] Authenticating socket with accountId: 123
```

✅ **If có:** Event được gửi từ client  
❌ **If không:** Bug trong HomeMenu.tsx line 125

---

### **STEP 3: Check Server Nhận Event**

**Check SERVER logs có nhận event không:**

```
🟢 [Online] User 123 connected (socket: abc123xyz)
   📊 Total online users: 1
   👥 Online user IDs: [123]
   📡 Broadcasted user:online event for userId: 123
```

✅ **If có:** Server nhận và broadcast OK  
❌ **If không:** Socket.IO connection issue hoặc event listener chưa register

---

### **STEP 4: Check Client Nhận Broadcast**

**Mở Console trên BROWSER 1 (đã login):**

```javascript
// Listen for online events manually
socket.on('user:online', (userId) => {
  console.log('🟢 Received user:online event for userId:', userId);
});

socket.on('user:offline', (userId) => {
  console.log('⚪ Received user:offline event for userId:', userId);
});
```

**Sau đó login BROWSER 2**

✅ **Expected:** BROWSER 1 console có log `🟢 Received user:online event`  
❌ **If không:** Broadcast không đến client hoặc listener chưa register

---

### **STEP 5: Check FriendsManager Listener**

**Mở Friends Manager sidebar, check console:**

```
👂 [FriendsManager] Registering socket listeners for online/offline events
```

✅ **If có:** Listener đã register  
❌ **If không:** FriendsManager chưa mount hoặc useEffect không chạy

---

### **STEP 6: Check Friends List Data**

**Trong FriendsManager, check console:**

```javascript
// In browser console
// Get friends list state
console.log('Friends list:', /* check component state */);
```

Hoặc thêm log tạm vào `FriendsManager.tsx`:

```typescript
useEffect(() => {
  console.log('📋 Current friends list:', friends);
}, [friends]);
```

Check:
- ✅ Friends list có data
- ✅ userId trong list match với userId trong event
- ❌ Nếu không match → Database issue

---

## 🧪 MANUAL TEST

Để test thủ công:

### **Test 1: Manual Emit (Browser Console)**

```javascript
// Trên browser sau khi login
socket.emit('user:authenticate', 123); // Thay 123 bằng accountId thật

// Check server logs phải có:
// 🟢 [Online] User 123 connected
```

---

### **Test 2: Manual Listen (Browser Console)**

```javascript
// Trên Browser 1
socket.on('user:online', (userId) => {
  console.log('✅ Manual listener received userId:', userId);
});

// Trên Browser 2, login
// Browser 1 phải log: ✅ Manual listener received userId: 456
```

---

### **Test 3: Force Broadcast (Server)**

Thêm test endpoint vào `server/src/index.ts`:

```typescript
app.get('/api/test/broadcast/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  io.emit('user:online', userId);
  res.json({ ok: true, message: `Broadcasted user:online for ${userId}` });
});
```

Restart server, sau đó:
```
http://192.168.10.108:4000/api/test/broadcast/123
```

Check browser console có nhận event không.

---

## 🔧 COMMON FIXES

### **Fix 1: Socket Not Connected**

**Cause:** Socket.IO không connect do network/CORS

**Check:**
```javascript
console.log('Socket connected:', socket.connected);
```

**Fix:**
- Restart server
- Clear browser cache (Ctrl+Shift+R)
- Check server CORS config

---

### **Fix 2: Event Not Sent**

**Cause:** `socket.emit` không được gọi

**Check:** Console có log `🔐 [Login] Authenticating` không?

**Fix:** Verify `HomeMenu.tsx` line 125:
```typescript
socket.emit('user:authenticate', result.user.accountId);
```

---

### **Fix 3: Event Not Received by Server**

**Cause:** Event listener chưa register hoặc socketId sai

**Check:** Server logs có `🟢 [Online] User X connected` không?

**Fix:** Verify `server/src/index.ts` line ~400:
```typescript
socket.on('user:authenticate', (userId: number) => {
  // ...
});
```

---

### **Fix 4: Broadcast Not Received**

**Cause:** Client không listen event hoặc listener register sau khi event đã fire

**Check:** FriendsManager có mount trước khi login không?

**Fix:** Đảm bảo FriendsManager mount và register listeners trước khi login user khác

---

### **Fix 5: userId Mismatch**

**Cause:** userId trong event khác với userId trong friends list

**Check:**
```sql
-- In database
SELECT user_id, user_name FROM users;
-- Compare với accountId được send trong event
```

**Fix:** Ensure `result.user.accountId` = `user_id` trong database

---

## 📊 DEBUG OUTPUT EXAMPLE

### **Successful Flow:**

**Browser 1 (Login User A):**
```
✅ [Socket.IO] Connected! Socket ID: abc123
🔐 [Login] Authenticating socket with accountId: 1
```

**Server Logs:**
```
🟢 [Online] User 1 connected (socket: abc123)
   📊 Total online users: 1
   👥 Online user IDs: [1]
   📡 Broadcasted user:online event for userId: 1
```

**Browser 2 (Login User B):**
```
✅ [Socket.IO] Connected! Socket ID: def456
🔐 [Login] Authenticating socket with accountId: 2
```

**Server Logs:**
```
🟢 [Online] User 2 connected (socket: def456)
   📊 Total online users: 2
   👥 Online user IDs: [1, 2]
   📡 Broadcasted user:online event for userId: 2
```

**Browser 1 (FriendsManager open):**
```
👂 [FriendsManager] Registering socket listeners
🟢 [FriendsManager] User came online: 2
   ✅ Matched friend: Bob (userId: 2)
   📋 Updated friends: [{id: 2, name: Bob, online: true}]
```

---

## 🎯 NEXT STEPS

Chạy debug checklist từ STEP 1 → STEP 6 và cho tôi biết:

1. Socket.IO connected? (true/false)
2. Console có log `🔐 [Login] Authenticating`? (yes/no)
3. Server logs có `🟢 [Online] User X connected`? (yes/no)
4. Browser khác có nhận `user:online` event? (yes/no)
5. FriendsManager có log `👂 Registering socket listeners`? (yes/no)

Với thông tin này tôi sẽ biết chính xác vấn đề ở đâu và fix ngay!

---

**Created:** 2024-10-13  
**Status:** Waiting for debug results
