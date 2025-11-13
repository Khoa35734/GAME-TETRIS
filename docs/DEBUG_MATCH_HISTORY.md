# 🔍 DEBUG GUIDE - Match History Not Saving

## ✅ Đã làm gì:
1. ✅ Xóa dữ liệu test khỏi database
2. ✅ Thêm nhiều console.log để debug
3. ✅ Sửa credentials trong script

---

## 🎯 HƯỚNG DẪN TEST CHI TIẾT

### Bước 1: Start Server với Log Debug

```powershell
cd E:\PBL4\GAME-TETRIS\server
npm run dev
```

**Chú ý quan sát log này khi server khởi động:**
```
[postgres] Connected
[BO3] BO3MatchManager initialized
✅ Server running on port 4000
```

---

### Bước 2: Start Client

```powershell
cd E:\PBL4\GAME-TETRIS\client
npm run dev
```

---

### Bước 3: Chơi 1 Game và Quan Sát Log

#### 📝 LOG CẦN KIỂM TRA KHI CHƠI:

**1. Khi game over (client gửi stats):**
```
[Network] 📊 Sending my stats to server: {pieces: 45, attack_lines: 18, ...}
```

**2. Server nhận stats từ TỪNG player:**
```
[BO3] 📊 Received stats from abc123: {"pieces":45,"attack_lines":18,...}
[BO3] ✅ Saved Player1 stats (socketId: abc123, username: admin)

[BO3] 📊 Received stats from def456: {"pieces":40,"attack_lines":15,...}
[BO3] ✅ Saved Player2 stats (socketId: def456, username: testuser)
```

**3. Server xử lý topout:**
```
[Socket] 🛑 Player def456 topped out in room room-123. Reason: ...
[Socket] 🏆 Resolving topout via BO3MatchManager for room room-123
[BO3] handleGameTopout: player1 thắng game 1 (do def456 top-out)
[BO3] 🔍 Checking temp stats...
[BO3] 🔍 tempPlayer1Stats exists: true
[BO3] 🔍 tempPlayer2Stats exists: true
[BO3] 📊 Using stats - Player1: {"pieces":45,"attack_lines":18,...}
[BO3] 📊 Using stats - Player2: {"pieces":40,"attack_lines":15,...}
```

**4. Khi trận kết thúc (sau 2-3 games):**
```
[BO3] Match abc-123 completed: player1 wins (2-1)
[BO3] 💾 Saving match history to database...
[BO3] 💾 Match ID: abc-123, Room: room-123
[BO3] 💾 Player 1: admin (ID: 1)
[BO3] 💾 Player 2: testuser (ID: 2)
[BO3] 💾 Score: 2-1
[BO3] 💾 Winner: player1
[BO3] 💾 Total games: 3
[BO3] 🔄 Calling saveMatchData with payload: {...}
[MatchHistoryService] 🚀 Starting transaction to save match data...
[MatchHistoryService] ✅ Inserted match with ID: 2
[MatchHistoryService] ✅ Inserted game 1 stats for Player 1
[MatchHistoryService] ✅ Inserted game 1 stats for Player 2
[MatchHistoryService] ✅ Inserted game 2 stats for Player 1
[MatchHistoryService] ✅ Inserted game 2 stats for Player 2
[MatchHistoryService] ✅ Inserted game 3 stats for Player 1
[MatchHistoryService] ✅ Inserted game 3 stats for Player 2
[MatchHistoryService] 🎉 Transaction committed successfully! Match ID: 2
[BO3] ✅ Match history saved successfully! DB Match ID: 2
```

---

## 🐛 TROUBLESHOOTING

### Vấn đề 1: Không thấy `[Network] 📊 Sending my stats`

**Nguyên nhân:** Client không gửi stats

**Fix:**
1. Mở DevTools Console (F12)
2. Kiểm tra có log "Sending my stats to server" không
3. Nếu KHÔNG → Client chưa integrate code gửi stats
4. Check file `useNetwork.ts` function `sendTopout()`

---

### Vấn đề 2: Server không log `[BO3] 📊 Received stats`

**Nguyên nhân:** 
- Client không emit event `bo3:player-stats`
- Hoặc roomId sai

**Fix:**
1. Check client có emit `socket.emit('bo3:player-stats', {...})` không
2. Check roomId có đúng không
3. Check server log có warning `⚠️ Received stats for unknown room` không

---

### Vấn đề 3: Server log `tempPlayer1Stats exists: false`

**Nguyên nhân:** Stats không được lưu vào match object

**Fix:**
1. Check server log có `✅ Saved Player1 stats` không
2. Nếu KHÔNG → Stats bị gửi đến sai socket hoặc sai roomId
3. Check log có warning `⚠️ Stats from unknown socket` không

---

### Vấn đề 4: Không thấy log `💾 Saving match history`

**Nguyên nhân:** `finishMatch()` không được gọi

**Fix:**
1. Chơi đủ 2-3 games đến khi trận kết thúc
2. Check log có `[BO3] Match abc-123 completed` không
3. Nếu KHÔNG → Có lỗi logic trong `handleGameTopout` hoặc `handleGameFinished`

---

### Vấn đề 5: Database error khi lưu

**Nguyên nhân:** Foreign key, constraint, hoặc connection error

**Fix:**
1. Đọc error message chi tiết
2. Check accountId của 2 players có tồn tại trong bảng `users` không:
```sql
SELECT user_id, user_name FROM users;
```
3. Check database connection:
```sql
SELECT 1;
```

---

## 📊 KIỂM TRA DATABASE SAU KHI CHƠI

```sql
-- 1. Xem tất cả matches
SELECT * FROM matches ORDER BY match_timestamp DESC;

-- 2. Xem game_stats của match mới nhất
SELECT 
    gs.game_number,
    u.user_name,
    gs.is_winner,
    gs.pieces,
    gs.attack_lines,
    gs.time_seconds,
    gs.pps,
    gs.apm
FROM game_stats gs
JOIN users u ON gs.player_id = u.user_id
WHERE gs.match_id = (SELECT MAX(match_id) FROM matches)
ORDER BY gs.game_number, gs.player_id;
```

---

## ✅ CHECKLIST ĐỂ VERIFY FIX

- [ ] Client log: "📊 Sending my stats to server"
- [ ] Server log: "📊 Received stats from..."
- [ ] Server log: "✅ Saved Player1 stats"
- [ ] Server log: "✅ Saved Player2 stats"
- [ ] Server log: "🔍 tempPlayer1Stats exists: true"
- [ ] Server log: "🔍 tempPlayer2Stats exists: true"
- [ ] Server log: "💾 Saving match history to database..."
- [ ] Server log: "🎉 Transaction committed successfully!"
- [ ] Database có data mới trong `matches`
- [ ] Database có 4-6 rows trong `game_stats`
- [ ] Stats KHÔNG phải toàn số 0

---

## 🔧 NẾU VẪN KHÔNG LƯU

Paste toàn bộ log server từ lúc start đến lúc game over vào đây để tôi phân tích!
