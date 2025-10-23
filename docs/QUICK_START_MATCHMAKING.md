# 🚀 Quick Start - Test Matchmaking với Redis

## ✅ **Tất cả đã sửa xong!**

### **Các thay đổi:**

1. ✅ Redis lưu trữ socket authentication
2. ✅ Auto-authentication khi socket connect
3. ✅ Alert khi chưa đăng nhập
4. ✅ Save user to localStorage khi login/register
5. ✅ Matchmaking sử dụng Redis để verify user

---

## 🎮 **Test ngay:**

### **Bước 1: Đảm bảo Server chạy**

```powershell
# Terminal 1: Server
cd server
npm run dev
```

Kiểm tra log phải có:
```
[redis] connected
[Matchmaking] System initialized ✅
```

### **Bước 2: Test trên 2 Browser (cùng máy)**

**Browser 1 (Chrome Normal):**
1. Truy cập: `http://localhost:5173`
2. Đăng nhập tài khoản 1
3. Mở Console (F12) - Phải thấy:
   ```
   ✅ [Socket.IO] Connected! Socket ID: xxx
   🔐 [Socket.IO] Auto-authenticating user 1...
   📤 [Socket.IO] Authentication request sent for user 1
   ```
4. Vào **Đối kháng** → **TÌM TRẬN**

**Browser 2 (Chrome Incognito):**
1. Truy cập: `http://localhost:5173`
2. Đăng nhập tài khoản 2
3. Kiểm tra Console có authentication log
4. Vào **Đối kháng** → **TÌM TRẬN**

**Kết quả:**
- Trong 2-4 giây, cả 2 sẽ tìm thấy nhau
- Popup "Tìm thấy đối thủ" xuất hiện
- Countdown 10 giây
- Cả 2 nhấn "Chấp nhận" → Vào room

---

## 🔍 **Nếu gặp lỗi "Not authenticated":**

### **Fix 1: Reload trang**

Đơn giản nhất, reload browser để trigger auto-authentication:
```
Ctrl + R (hoặc F5)
```

### **Fix 2: Đăng xuất và đăng nhập lại**

1. Đăng xuất
2. Đăng nhập lại
3. Kiểm tra Console có log authentication

### **Fix 3: Clear localStorage**

Mở Console và chạy:
```javascript
localStorage.clear();
location.reload();
```

Sau đó đăng nhập lại.

### **Fix 4: Kiểm tra Redis**

```powershell
# Kiểm tra Redis đang chạy
redis-cli ping
# Phải trả về: PONG

# Xem sockets đang authenticated
redis-cli KEYS "socket:user:*"

# Xem accountId của socket cụ thể
redis-cli GET socket:user:{socketId}
```

---

## 📊 **Monitor Matchmaking**

### **Check Queue Status:**

```powershell
# Via API
curl http://localhost:4000/api/matchmaking/stats

# Hoặc mở browser:
http://localhost:4000/api/matchmaking/stats
```

Response:
```json
{
  "casual": { "players": 2, "averageWaitTime": 5 },
  "ranked": { "players": 0, "averageWaitTime": 0 },
  "activeMatches": 0,
  "penalizedPlayers": 0
}
```

### **Check Server Logs:**

Khi cả 2 vào queue, phải thấy:
```
[Matchmaking] Player User1 (ID: 1) joined casual queue
[Matchmaking] Player User2 (ID: 2) joined casual queue
[Matchmaking] Match created: match_xxx (User1 vs User2)
```

Nếu không thấy `(ID: X)` → Authentication chưa work.

---

## 🎯 **Xác nhận thành công:**

- [x] Redis đang chạy
- [x] Server đang chạy
- [x] Client có thể đăng nhập
- [x] Console log hiện authentication
- [x] Redis có keys `socket:user:*`
- [x] Join queue không bị lỗi
- [x] 2 người match với nhau
- [x] Accept → Vào room

---

## 💡 **Tips:**

1. **Luôn kiểm tra Console log** để debug
2. **Reload trang** nếu vừa mới đăng nhập
3. **Dùng 2 browser khác nhau** hoặc incognito mode để test
4. **Check server log** để thấy matchmaking process
5. **Test trên 2 máy khác nhau** để đảm bảo LAN work

---

## 🆘 **Cần giúp đỡ?**

Xem chi tiết trong:
- `FILE MD/MATCHMAKING_REDIS_FIX.md` - Giải thích chi tiết
- `FILE MD/MATCHMAKING_DEBUG_GUIDE.md` - Hướng dẫn debug

Chạy test script:
```powershell
.\FILE MD\test-matchmaking.ps1
```

---

**Chúc bạn test thành công! 🎉**
