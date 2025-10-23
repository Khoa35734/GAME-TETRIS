# 🔧 Fix Matchmaking "Not Authenticated" Error với Redis

## ❌ **Vấn đề**

Khi 2 máy cùng vào matchmaking, gặp lỗi:
```
[Matchmaking] Error: Not authenticated
```

Nguyên nhân: Socket authentication không được lưu vào Redis đúng cách.

---

## ✅ **Giải pháp đã triển khai**

### 1. **Redis Storage cho User Authentication**

**File:** `server/src/redisStore.ts`

Thêm các hàm mới:
- `storeSocketUser()` - Lưu mapping socket ↔ user
- `getSocketUserInfo()` - Lấy thông tin user từ socketId
- `removeSocketUser()` - Xóa khi disconnect

**Keys trong Redis:**
```
socket:user:{socketId} → accountId       (TTL: 1 hour)
user:socket:{accountId} → socketId       (TTL: 1 hour)
user:data:{accountId} → {username, ...}  (TTL: 24 hours)
```

### 2. **Server Authentication Handler**

**File:** `server/src/index.ts`

```typescript
socket.on('user:authenticate', async (userId: number) => {
  if (userId && typeof userId === 'number') {
    onlineUsers.set(userId, socket.id);
    
    // Store in Redis for persistence
    const username = `User${userId}`;
    await storeSocketUser(socket.id, userId, username);
    
    console.log(`🟢 [Online] User ${userId} connected (socket: ${socket.id})`);
    console.log(`   💾 [Redis] User auth stored in Redis`);
  }
});
```

### 3. **Matchmaking sử dụng Redis**

**File:** `server/src/matchmaking.ts`

```typescript
private handleJoinQueue(socket: Socket, data: { mode: 'casual' | 'ranked' }) {
  // Get player info from Redis instead of socket properties
  getSocketUserInfo(socket.id).then(userInfo => {
    if (!userInfo) {
      console.warn(`[Matchmaking] Socket ${socket.id} not authenticated`);
      socket.emit('matchmaking:error', { error: 'Not authenticated' });
      return;
    }

    const { accountId, username } = userInfo;
    // ... rest of logic
  });
}
```

### 4. **Client Auto-Authentication**

**File:** `client/src/socket.ts`

```typescript
socket.on('connect', () => {
  const userDataStr = localStorage.getItem('tetris:user');
  if (userDataStr) {
    const userData = JSON.parse(userDataStr);
    if (userData && userData.accountId) {
      // Delay để đảm bảo server ready
      setTimeout(() => {
        socket.emit('user:authenticate', userData.accountId);
      }, 100);
    }
  }
});

// Handle matchmaking errors
socket.on('matchmaking:error', (data: { error: string }) => {
  if (data.error === 'Not authenticated') {
    localStorage.removeItem('tetris:user');
    alert('⚠️ Phiên đăng nhập đã hết hạn!\n\nVui lòng đăng nhập lại.');
    window.location.href = '/';
  }
});
```

### 5. **Save User to LocalStorage khi Login/Register**

**File:** `client/src/components/HomeMenu.tsx`

```typescript
// Login
if (result.success && result.user) {
  const user = { ... };
  setCurrentUser(user);
  
  // Save to localStorage
  localStorage.setItem('tetris:user', JSON.stringify(user));
  
  // Authenticate socket
  socket.emit('user:authenticate', result.user.accountId);
}

// Register - tương tự
```

---

## 🧪 **Cách Test**

### **Bước 1: Restart Server**

```bash
cd server
npm run dev
```

**Kiểm tra log:**
```
[redis] connected
[Matchmaking] System initialized ✅
```

### **Bước 2: Test trên Browser 1**

1. Mở Chrome (normal mode)
2. Đăng nhập tài khoản 1
3. Mở Console (F12)
4. Kiểm tra log:

```
✅ [Socket.IO] Connected! Socket ID: abc123
🔐 [Socket.IO] Auto-authenticating user 1...
📤 [Socket.IO] Authentication request sent for user 1
```

5. Vào **Đối kháng** → **TÌM TRẬN**
6. Kiểm tra log:

```
🔍 [Matchmaking] Joining casual queue...
```

### **Bước 3: Test trên Browser 2 (cùng máy)**

1. Mở Chrome Incognito
2. Đăng nhập tài khoản 2
3. Kiểm tra console có authentication
4. Vào **Đối kháng** → **TÌM TRẬN**

**Kết quả mong đợi:**
- Cả 2 browser tìm thấy nhau trong 2-4 giây
- Hiện popup "Tìm thấy đối thủ"
- Countdown 10s
- Cả 2 Accept → Vào room

### **Bước 4: Test trên 2 máy khác nhau**

**Máy 1 (Server):**
```bash
# Terminal 1
cd server
npm run dev

# Terminal 2
cd client
npm run dev
```

**Máy 2 (Client):**
```bash
cd client

# Sửa .env
echo "VITE_API_URL=http://[IP-MAY-1]:4000/api" > .env

npm run dev
```

Cả 2 máy đăng nhập và vào matchmaking.

---

## 🔍 **Debug Checklist**

Nếu vẫn gặp lỗi "Not authenticated":

### ✅ **1. Kiểm tra LocalStorage**

Trong Console của browser:
```javascript
console.log(localStorage.getItem('tetris:user'));
// Phải có: {"username":"...","accountId":123,...}
```

Nếu `null` → Đăng xuất và đăng nhập lại.

### ✅ **2. Kiểm tra Socket Authentication**

Trong Console:
```javascript
// Sau khi connect, phải thấy:
📤 [Socket.IO] Authentication request sent for user 123
```

Nếu không thấy → Reload trang.

### ✅ **3. Kiểm tra Server nhận Authentication**

Trong Terminal của server:
```
🟢 [Online] User 1 connected (socket: abc123)
   💾 [Redis] User auth stored in Redis
```

Nếu không thấy → Restart server.

### ✅ **4. Kiểm tra Redis có dữ liệu**

```bash
# Kết nối Redis CLI
redis-cli

# Kiểm tra keys
KEYS socket:user:*
# Phải trả về: 1) "socket:user:abc123"

# Kiểm tra value
GET socket:user:abc123
# Phải trả về accountId (ví dụ: "1")
```

Nếu không có → Authentication chưa được lưu vào Redis.

### ✅ **5. Kiểm tra Matchmaking Queue**

Trong Terminal server khi cả 2 vào queue:
```
[Matchmaking] Player User1 (ID: 1) joined casual queue
[Matchmaking] Player User2 (ID: 2) joined casual queue
[Matchmaking] Match created: match_xxx (User1 vs User2)
```

Nếu không thấy `(ID: X)` → Authentication chưa work.

---

## 🚨 **Lỗi thường gặp và cách fix**

### ❌ **Lỗi: "Not authenticated" ngay khi join queue**

**Nguyên nhân:** Socket chưa authenticate với Redis

**Fix:**
1. Reload trang để trigger auto-authentication
2. Đăng xuất và đăng nhập lại
3. Clear cache và localStorage:
   ```javascript
   localStorage.clear();
   location.reload();
   ```

### ❌ **Lỗi: Socket connect nhưng không auto-authenticate**

**Nguyên nhân:** LocalStorage key sai hoặc không có data

**Fix:**
- Kiểm tra key phải là `'tetris:user'` (không phải `'user'`)
- Đăng nhập lại để lưu vào localStorage

### ❌ **Lỗi: Server không lưu vào Redis**

**Nguyên nhân:** Redis chưa chạy hoặc connection fail

**Fix:**
```bash
# Kiểm tra Redis
redis-cli ping
# Phải trả về: PONG

# Nếu không chạy, start Redis
redis-server
```

### ❌ **Lỗi: WebSocket connection failed**

**Nguyên nhân:** Browser cố dùng wss:// thay vì ws://

**Fix:** Đã sửa trong `socket.ts` bằng cách:
```typescript
transports: ['polling', 'websocket'], // Polling trước
```

---

## 📊 **Flow hoàn chỉnh**

```
1. User Login
   ↓
2. Save to localStorage ('tetris:user')
   ↓
3. socket.emit('user:authenticate', accountId)
   ↓
4. Server: storeSocketUser(socketId, accountId, username)
   ↓
5. Redis: socket:user:{socketId} = accountId
   ↓
6. User vào Matchmaking
   ↓
7. socket.emit('matchmaking:join', { mode })
   ↓
8. Server: getSocketUserInfo(socketId) from Redis
   ↓
9. Nếu có → Join queue
   Nếu không → emit 'matchmaking:error'
   ↓
10. Match players in queue
   ↓
11. emit 'matchmaking:found' to both
```

---

## 🎯 **Xác nhận Fix thành công**

### ✅ **Checklist cuối cùng:**

- [ ] Redis đang chạy (`redis-cli ping` → PONG)
- [ ] Server log: `[redis] connected`
- [ ] Server log: `[Matchmaking] System initialized ✅`
- [ ] Login → Console log: `📤 Authentication request sent`
- [ ] Server log: `💾 [Redis] User auth stored in Redis`
- [ ] Redis có key: `GET socket:user:{socketId}` → trả về accountId
- [ ] Join queue → Server log: `Player UserX (ID: Y) joined queue`
- [ ] 2 người trong queue → Match trong vài giây
- [ ] Cả 2 nhận `matchmaking:found`
- [ ] Accept → Vào room thành công

---

## 📝 **Tóm tắt thay đổi**

| File | Thay đổi |
|------|----------|
| `server/src/redisStore.ts` | ➕ Thêm functions: `storeSocketUser`, `getSocketUserInfo`, `removeSocketUser` |
| `server/src/matchmaking.ts` | 🔄 Đổi từ socket properties sang Redis |
| `server/src/index.ts` | 🔄 `user:authenticate` handler lưu vào Redis + cleanup on disconnect |
| `client/src/socket.ts` | ➕ Auto-authentication, ➕ Error handling với alert |
| `client/src/components/HomeMenu.tsx` | ➕ Save user to localStorage khi login/register |

---

**Status:** ✅ Fix hoàn tất
**Last updated:** 2025-10-16
