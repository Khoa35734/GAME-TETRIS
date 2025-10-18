# 🧪 Hướng dẫn Test Matchmaking System

## 🚀 Bắt đầu

### 1. Khởi động Server
```bash
cd server
npm run dev
```

Kiểm tra log xuất hiện:
```
[Matchmaking] System initialized ✅
```

### 2. Khởi động Client
```bash
cd client
npm run dev
```

## 📝 Test Cases

### Test 1: Tìm trận thành công ✅

**Mục tiêu:** 2 người tìm trận → ghép đôi → cả 2 confirm → vào game

**Bước thực hiện:**
1. Mở 2 tab browser
2. **Tab 1:** Login tài khoản 1
3. **Tab 2:** Login tài khoản 2
4. **Tab 1:** Nhấn "Đối kháng" → "TÌM TRẬN"
5. **Tab 2:** Nhấn "Đối kháng" → "TÌM TRẬN"
6. Quan sát: Cả 2 tab hiển thị modal "ĐÃ TÌM THẤY ĐỐI THỦ"
7. Kiểm tra: Username đối thủ hiển thị
8. Kiểm tra: Countdown 10s → 9s → 8s...
9. **Tab 1 & Tab 2:** Nhấn "Chấp nhận"
10. Kết quả mong đợi: Navigate đến `/room/match_{matchId}`

**Console logs mong đợi:**
```
[Matchmaking] Player User1 joined casual queue
[Matchmaking] Player User2 joined casual queue
[Matchmaking] Match created: match_xxx (User1 vs User2)
[Matchmaking] Player {socketId1} confirmed match match_xxx
[Matchmaking] Player {socketId2} confirmed match match_xxx
[Matchmaking] Match match_xxx started (Room: match_match_xxx)
```

---

### Test 2: Từ chối trận → Penalty ⚠️

**Mục tiêu:** Player decline → bị phạt → không thể tìm trận

**Bước thực hiện:**
1. Làm như Test 1 đến bước 8
2. **Tab 1:** Nhấn "Từ chối"
3. Kiểm tra Tab 1:
   - Hiển thị màn hình penalty
   - "BẠN ĐÃ BỊ KHÓA TẠM THỜI"
   - Timer đếm ngược: "1:00" → "0:59" → ...
4. Kiểm tra Tab 2:
   - Hiển thị "Đối thủ đã từ chối trận"
   - Button "Tìm lại" xuất hiện
5. **Tab 2:** Nhấn "Tìm lại" → Quay lại searching
6. **Tab 1:** Thử nhấn "Quay lại" → "TÌM TRẬN" lại
7. Kết quả: Tab 1 hiển thị penalty screen ngay lập tức

**Console logs mong đợi:**
```
[Matchmaking] Player {socketId1} declined match match_xxx
[Matchmaking] Penalty applied to {accountId}: 60s (Decline count: 1)
```

**Test penalty escalation:**
- Lần 1: 60s (1 phút)
- Lần 2: 120s (2 phút)
- Lần 3: 240s (4 phút)

---

### Test 3: Timeout xác nhận ⏱️

**Mục tiêu:** Không confirm trong 10s → penalty

**Bước thực hiện:**
1. 2 tab tìm trận giống Test 1
2. Khi modal "ĐÃ TÌM THẤY ĐỐI THỦ" xuất hiện
3. **KHÔNG NHẤN GÌ** trong 10 giây
4. Quan sát countdown: 10 → 9 → ... → 1 → 0
5. Kết quả mong đợi:
   - Cả 2 tab hiển thị penalty screen
   - "BẠN ĐÃ BỊ KHÓA TẠM THỜI"
   - Timer penalty: 1:00

**Console logs:**
```
[Matchmaking] Match match_xxx timed out
[Matchmaking] Penalty applied to {accountId1}: 60s
[Matchmaking] Penalty applied to {accountId2}: 60s
```

---

### Test 4: Timeout tìm trận 5 phút ⌛

**Mục tiêu:** Tìm trận quá 5 phút không có đối thủ

**Bước thực hiện:**
1. Login 1 tài khoản duy nhất
2. Nhấn "Đối kháng" → "TÌM TRẬN"
3. Quan sát:
   - Timer đếm lên: 0:00 → 0:01 → ... → 1:00
   - Tại 1:00: Hiển thị "Đang cố gắng tìm đối thủ, vui lòng chờ"
4. Đợi đến 5:00 (hoặc test nhanh bằng cách sửa timeout trong code)
5. Kết quả mong đợi:
   - Status chuyển sang 'timeout'
   - Hiển thị "Không tìm được đối thủ"
   - Button "Thử lại" xuất hiện

**Note:** Để test nhanh, sửa trong `MatchmakingUI.tsx`:
```typescript
if (newTime >= 300) setStatus('timeout'); // Đổi 300 → 10 (10 giây)
```

---

### Test 5: Hủy tìm trận 🚫

**Mục tiêu:** Cancel giữa chừng

**Bước thực hiện:**
1. Nhấn "TÌM TRẬN"
2. Quan sát modal searching với spinner
3. Nhấn nút "X" (close) hoặc "Hủy"
4. Kết quả mong đợi:
   - Modal đóng
   - Quay lại trang OnlineCasual/OnlineRanked
   - Socket emit 'matchmaking:cancel'

**Console logs:**
```
[Matchmaking] Player {socketId} cancelled search
```

---

### Test 6: Ranked vs Casual 🏆

**Mục tiêu:** Kiểm tra 2 queue riêng biệt

**Bước thực hiện:**
1. **Tab 1:** Vào "Đối kháng" (Casual) → TÌM TRẬN
2. **Tab 2:** Vào "Đấu xếp hạng" (Ranked) → TÌM TRẬN
3. Kết quả mong đợi:
   - **KHÔNG** ghép đôi vì khác queue
   - Cả 2 tab searching
4. **Tab 3:** Vào "Đối kháng" (Casual) → TÌM TRẬN
5. Kết quả: Tab 1 và Tab 3 ghép đôi (cùng casual queue)

**Console logs:**
```
[Matchmaking] Player User1 joined casual queue
[Matchmaking] Player User2 joined ranked queue
[Matchmaking] Player User3 joined casual queue
[Matchmaking] Match created: match_xxx (User1 vs User3)
```

---

### Test 7: API Stats 📊

**Mục tiêu:** Kiểm tra API endpoint

**Bước thực hiện:**
1. Cho 3 người vào casual queue
2. Cho 2 người vào ranked queue
3. Mở terminal:
```bash
curl http://localhost:4000/api/matchmaking/stats
```

4. Kết quả mong đợi:
```json
{
  "casual": {
    "players": 3,
    "averageWaitTime": 15
  },
  "ranked": {
    "players": 2,
    "averageWaitTime": 8
  },
  "activeMatches": 0,
  "penalizedPlayers": 0
}
```

---

### Test 8: Disconnect trong matching 🔌

**Mục tiêu:** Người chơi disconnect khi đang confirm

**Bước thực hiện:**
1. 2 tab tìm trận → match found
2. **Tab 1:** Đóng tab (disconnect socket)
3. Kết quả Tab 2:
   - Hiển thị "Đối thủ đã từ chối trận"
   - Quay lại queue

**Console logs:**
```
[Matchmaking] Penalty applied to {accountId1}: 60s (Decline count: 1)
```

---

## 🎨 UI Checklist

### Searching State
- [ ] Spinner animation xoay
- [ ] "ĐANG TÌM ĐỐI THỦ"
- [ ] Timer đếm lên: "0:00", "0:01", ...
- [ ] Nút "X" để cancel
- [ ] Tại 1:00: Hiển thị warning "Đang cố gắng..."
- [ ] Fade-in animation khi modal xuất hiện

### Found State
- [ ] "ĐÃ TÌM THẤY ĐỐI THỦ"
- [ ] Username đối thủ hiển thị
- [ ] Countdown 10 → 0
- [ ] 2 nút: "Chấp nhận" (xanh) & "Từ chối" (đỏ)

### Timeout State (5 min)
- [ ] "⏰ KHÔNG TÌM ĐƯỢC ĐỐI THỦ"
- [ ] Message giải thích
- [ ] Nút "Thử lại"

### Penalty State
- [ ] "🚫 BẠN ĐÃ BỊ KHÓA TẠM THỜI"
- [ ] Countdown penalty: "1:00" → "0:59" → ...
- [ ] Giải thích về penalty escalation
- [ ] Nút "Quay lại" (disabled khi đang penalty)

---

## 🐛 Debug Tips

### Không ghép đôi được?

**Check:**
1. Console log: "Player joined X queue"
2. Cả 2 cùng mode (casual hoặc ranked)?
3. Server có chạy không?
4. Socket connected? (check devtools → Network → WS)

**Fix:**
- Refresh cả 2 tab
- Kiểm tra `matchmakingSystem` đã init chưa

### Penalty không hoạt động?

**Check:**
1. Console log: "Penalty applied to X: Ys"
2. `socket.accountId` có được set?
3. Event `user:authenticate` đã emit?

**Fix:**
- Login lại
- Check console: "🟢 [Online] User X connected"

### Modal không hiển thị?

**Check:**
1. Routes đã config đúng chưa?
2. `isMatchmaking` state = true?
3. Component import đúng?

**Fix:**
- Check `/online/casual` route
- Verify `<MatchmakingUI />` render

---

## 📊 Performance Checklist

- [ ] Matchmaking loop: 2s interval (không quá nhanh)
- [ ] Timer không bị lag
- [ ] Socket events không bị duplicate
- [ ] Memory leak: cleanup timers trong useEffect
- [ ] Penalty không bị reset khi refresh (cần database)

---

## ✅ Success Criteria

Hệ thống hoàn thành khi:
- [x] Tìm trận casual thành công
- [x] Tìm trận ranked thành công
- [x] Penalty system hoạt động
- [x] Timeout searching (5 min)
- [x] Timeout confirmation (10s)
- [x] Cancel matchmaking
- [x] Disconnect handling
- [ ] Database persistence (TODO)
- [ ] Real username fetch (TODO)

---

**Status:** ✅ Sẵn sàng test
**Estimated test time:** ~15 phút cho tất cả test cases
