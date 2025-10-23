# 🚀 QUICK START - BO3 Matchmaking

## ⚡ Chạy test nhanh (1 lệnh):

```powershell
.\FILE` MD\test-bo3-matchmaking.ps1
```

Script sẽ tự động:
- ✅ Check Redis
- ✅ Check PostgreSQL  
- ✅ Start Server (port 4000)
- ✅ Start Client (port 5173)

---

## 📝 Test Steps:

### **Browser 1:**
1. Mở http://localhost:5173
2. Login (username: test1, password: 123)
3. Click **"Casual"** hoặc **"Ranked"**
4. Đợi tìm trận...

### **Browser 2:**
1. Mở http://localhost:5173 (new window)
2. Login (username: test2, password: 123)
3. Click **"Casual"** hoặc **"Ranked"**
4. Match found! 🎉

### **Cả 2 browsers:**
5. Thấy popup: "Match found! 10s countdown"
6. Browser 1 click **"Chấp nhận"**
7. Browser 1 → Show **"Đang chờ đối thủ..."**
8. Browser 2 click **"Chấp nhận"**
9. ✅ Both navigate to `/room/match_xxx`
10. 🎮 **BO3 Game starts!**

---

## 🔍 Server Console - Expected Logs:

```
🎮 [Matchmaking] ĐÃ TÌM THẤY TRẬN ĐẤU!
   Match ID: xxx
   Player 1: test1 (1)
   Player 2: test2 (2)
   Mode: casual
   ⏰ Có 10 giây để chấp nhận...

✅ [Matchmaking] test1 đã chấp nhận match xxx
   Confirmed: 1/2
   ⏳ Đang chờ đối thủ...

✅ [Matchmaking] test2 đã chấp nhận match xxx
   Confirmed: 2/2
✅ Cả 2 người chơi đã chấp nhận! Bắt đầu tạo BO3 match...

[Matchmaking] 🎮 Cả 2 người chơi đã chấp nhận! Đang tạo BO3 match...
   Player 1: test1 (1)
   Player 2: test2 (2)

[BO3] Match created: xxx (test1 vs test2)

[Matchmaking] ✅ BO3 Match created successfully!
   Room ID: match_xxx
   Mode: casual (Best of 3)
   Status: Ready to start

[Matchmaking] ✅ Match xxx started successfully (BO3)
```

---

## ✅ Success Criteria:

- ✅ Console shows "ĐÃ TÌM THẤY TRẬN ĐẤU"
- ✅ Both clients see 10s countdown popup
- ✅ First confirm shows "Đang chờ đối thủ"
- ✅ Both confirm → Create BO3 match
- ✅ Server log shows "BO3 Match created"
- ✅ Both navigate to room successfully
- ✅ No "Room not found" error
- ✅ Game starts in Best of 3 format

---

## 🎮 BO3 Format:

- **Win condition:** First to win 2 games
- **Possible scores:** 2-0, 2-1
- **Auto progression:** Next game starts after 5s
- **Match history:** Each game saved separately

---

## 🐛 Troubleshooting:

### "Room not found"
→ Check server logs for "BO3 Match created successfully"
→ Room should exist in Redis before navigation

### Match không found
→ Đảm bảo cả 2 người dùng đã login
→ Check authentication trong server console

### Timeout quá nhanh
→ Default: 10s to confirm
→ Check `MATCH_CONFIRM_TIMEOUT` in matchmaking.ts

### Không vào được room
→ Check Redis: `redis-cli KEYS "match:match_*"`
→ Should see the room key

---

**Ready to test? Run:**
```powershell
.\FILE` MD\test-bo3-matchmaking.ps1
```
