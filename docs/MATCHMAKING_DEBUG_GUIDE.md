# 🐛 Hướng dẫn Debug Matchmaking

## ❌ **Vấn đề: 2 máy không ghép trận với nhau**

### 🔍 **Nguyên nhân**

Hệ thống matchmaking yêu cầu socket phải được **authenticate** trước khi tham gia queue. Nếu socket chưa authenticate, server sẽ reject với error `'Not authenticated'`.

### ✅ **Giải pháp đã áp dụng**

#### 1. **Auto-authenticate khi socket connect/reconnect**

**File:** `client/src/socket.ts`

Thêm logic tự động authenticate khi socket connect:

```typescript
socket.on('connect', () => {
  console.log('✅ [Socket.IO] Connected! Socket ID:', socket.id);
  
  // Auto-authenticate if user data exists in localStorage
  const userDataStr = localStorage.getItem('user');
  if (userDataStr) {
    try {
      const userData = JSON.parse(userDataStr);
      if (userData && userData.accountId) {
        console.log(`🔐 [Socket.IO] Auto-authenticating user ${userData.accountId}...`);
        socket.emit('user:authenticate', userData.accountId);
      }
    } catch (error) {
      console.error('❌ [Socket.IO] Failed to parse user data:', error);
    }
  } else {
    console.log('ℹ️ [Socket.IO] No user data found, skipping authentication');
  }
});
```

**Lý do:**
- Khi user đã đăng nhập và refresh trang, socket reconnect nhưng không tự động authenticate
- Điều này khiến matchmaking reject vì `accountId` không tồn tại trong socket
- Bây giờ socket sẽ tự động authenticate từ localStorage mỗi khi connect

#### 2. **Thêm error handling trong MatchmakingUI**

**File:** `client/src/components/MatchmakingUI.tsx`

```typescript
socket.on('matchmaking:error', (data: { error: string }) => {
  console.error('❌ [Matchmaking] Error:', data.error);
  if (data.error === 'Not authenticated') {
    alert('Vui lòng đăng nhập lại để tham gia matchmaking');
    onCancel();
  }
});
```

#### 3. **Thêm debug logging chi tiết**

Tất cả các event matchmaking giờ đây có logging rõ ràng:
- `🔍 [Matchmaking] Joining queue...`
- `✅ [Matchmaking] Match found`
- `🎮 [Matchmaking] Match starting`
- `❌ [Matchmaking] Opponent declined`
- `⏱️ [Matchmaking] Penalty received`

---

## 🧪 **Cách kiểm tra**

### **Bước 1: Kiểm tra authentication**

1. Mở DevTools Console (F12) trên cả 2 máy
2. Đăng nhập vào cả 2 máy
3. Kiểm tra log:

**✅ Log đúng:**
```
✅ [Socket.IO] Connected! Socket ID: abc123
🔐 [Socket.IO] Auto-authenticating user 1...
```

**❌ Log sai (không authenticate):**
```
✅ [Socket.IO] Connected! Socket ID: abc123
ℹ️ [Socket.IO] No user data found, skipping authentication
```

### **Bước 2: Kiểm tra matchmaking join**

1. Cả 2 máy vào **Đối kháng** → **TÌM TRẬN**
2. Kiểm tra log:

**✅ Log đúng:**
```
🔍 [Matchmaking] Joining casual queue...
✅ [Matchmaking] Match found: { matchId: 'xxx', opponent: { username: 'UserXX' } }
```

**❌ Log sai:**
```
🔍 [Matchmaking] Joining casual queue...
❌ [Matchmaking] Error: Not authenticated
```

### **Bước 3: Kiểm tra server log**

Trên máy chạy server, check terminal:

**✅ Log đúng:**
```
🟢 [Online] User 1 connected (socket: abc123)
[Matchmaking] Player User1 joined casual queue
[Matchmaking] Player User2 joined casual queue
[Matchmaking] Match created: match_xxx (User1 vs User2)
```

**❌ Log sai:**
```
[Matchmaking] Player undefined joined casual queue
```

---

## 🔧 **Troubleshooting**

### ❌ **Vấn đề 1: Socket không authenticate**

**Triệu chứng:**
- Log: `ℹ️ [Socket.IO] No user data found`
- Alert: "Vui lòng đăng nhập lại"

**Giải pháp:**
1. Kiểm tra localStorage có dữ liệu user không:
   ```javascript
   // Chạy trong Console
   console.log(localStorage.getItem('user'));
   ```
2. Nếu null → Đăng nhập lại
3. Nếu có dữ liệu → Refresh lại trang

### ❌ **Vấn đề 2: 2 máy không thấy nhau**

**Triệu chứng:**
- Cả 2 máy searching nhưng không match
- Không có log `Match found`

**Kiểm tra:**

1. **Cả 2 máy kết nối đến CÙNG server:**
   ```javascript
   // Console trên client
   console.log(socket.io.uri);
   // Phải giống nhau, ví dụ: http://10.10.30.40:4000
   ```

2. **Cả 2 máy đã authenticate:**
   ```javascript
   // Console
   socket.emit('test-auth-check');
   // Nếu không có lỗi → OK
   ```

3. **Server matchmaking interval đang chạy:**
   - Check server log có message `[Matchmaking] ...` không
   - Nếu không → Restart server

4. **Kiểm tra queue status qua API:**
   ```bash
   curl http://10.10.30.40:4000/api/matchmaking/stats
   ```
   
   **Response mong đợi:**
   ```json
   {
     "casual": {
       "players": 2,
       "averageWaitTime": 5
     },
     "ranked": { "players": 0, "averageWaitTime": 0 },
     "activeMatches": 0,
     "penalizedPlayers": 0
   }
   ```

### ❌ **Vấn đề 3: Match found nhưng không start**

**Triệu chứng:**
- Cả 2 nhận được `matchmaking:found`
- Nhấn "Chấp nhận" nhưng không vào room

**Kiểm tra:**
1. Check log có `matchmaking:start` không
2. Nếu không → Có thể 1 người không confirm kịp (timeout 10s)
3. Check penalty: `socket.on('matchmaking:penalty')`

---

## 📊 **Debug checklist**

Trước khi test matchmaking, chạy qua checklist này:

- [ ] Server đang chạy (`npm run dev` trong folder `server`)
- [ ] Cả 2 client connect đến cùng server IP
- [ ] Cả 2 máy đã đăng nhập thành công
- [ ] Console log hiện `🔐 Auto-authenticating user X`
- [ ] Không có lỗi `Not authenticated`
- [ ] API `/api/matchmaking/stats` trả về dữ liệu đúng
- [ ] Server log hiện `[Matchmaking] System initialized ✅`

---

## 🚀 **Test script**

### **Test trên 1 máy (2 browser tabs)**

```bash
# Terminal 1: Server
cd server
npm run dev

# Browser Tab 1:
# - Login as User1
# - Console: check authentication
# - Vào Matchmaking

# Browser Tab 2:
# - Login as User2 (incognito mode)
# - Console: check authentication
# - Vào Matchmaking

# Quan sát: Cả 2 tab phải match với nhau
```

### **Test trên 2 máy**

**Máy 1 (Server + Client 1):**
```bash
cd server
npm run dev

# Terminal mới
cd client
npm run dev
# Mở browser: http://localhost:5173
```

**Máy 2 (Client 2):**
```bash
cd client

# Sửa .env
echo "VITE_API_URL=http://[IP-CUA-MAY-1]:4000/api" > .env

npm run dev
# Mở browser: http://localhost:5173
```

---

## 📝 **Common errors và fix**

| Error | Giải pháp |
|-------|-----------|
| `Not authenticated` | Đăng nhập lại hoặc refresh trang |
| `Connection refused` | Check server đang chạy + firewall |
| `Timeout` | Không có đối thủ trong 5 phút, thử lại |
| `Penalty` | Chờ hết thời gian phạt rồi thử lại |
| Queue không giảm | Restart server để reset queue |

---

## ✅ **Xác nhận fix thành công**

Sau khi áp dụng fix, test lại:

1. ✅ 2 máy matchmaking → Tìm thấy nhau trong vòng 2-4 giây
2. ✅ Cả 2 nhận được notification "Tìm thấy đối thủ"
3. ✅ Countdown 10s hiển thị
4. ✅ Cả 2 nhấn Accept → Navigate vào room
5. ✅ Game bắt đầu bình thường

---

**Last updated:** 2025-10-16
**Status:** ✅ Fix hoàn tất
