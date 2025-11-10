# ✅ HƯỚNG DẪN TEST MATCH HISTORY - ĐẦY ĐỦ

## 🎯 Mục Tiêu
Sau khi chơi xong 1 trận multiplayer BO3 (Best of 3), dữ liệu phải được lưu vào database.

---

## ✅ Bước 1: Kiểm Tra Bảng Đã Được Tạo

```bash
# Chạy script test
node server/test-match-history.js
```

**Kết quả mong đợi**:
```
✅ Match inserted with ID: 1
✅ Game 1 stats inserted
✅ Game 2 stats inserted  
✅ Game 3 stats inserted
```

---

## ✅ Bước 2: Start Server Và Client

### Terminal 1: Server
```bash
cd server
npm run dev
```

**Quan sát log server**:
```
[postgres] Connected
[BO3] BO3MatchManager initialized
✅ Server running on port 4000
```

### Terminal 2: Client  
```bash
cd client
npm run dev
```

---

## ✅ Bước 3: Chơi 1 Trận BO3 Đầy Đủ

1. **Mở 2 trình duyệt** (hoặc 2 tab incognito)
2. **Đăng nhập 2 tài khoản khác nhau**
3. **Vào chế độ Multiplayer** (Ranked hoặc Casual)
4. **Chơi đến khi kết thúc trận** (2-0 hoặc 2-1)

---

## ✅ Bước 4: Kiểm Tra Log Server

**Khi chơi mỗi ván, server phải log**:
```
[Network] 📊 Sending my stats to server: {pieces: 45, attack_lines: 18, ...}
[BO3] 📊 Received stats from abc123: {pieces: 45, attack_lines: 18, ...}
[BO3] 📊 Received stats from def456: {pieces: 40, attack_lines: 15, ...}
[BO3] handleGameTopout: player2 thắng game 1
[BO3] 📊 Using stats - Player1: {pieces: 45, attack_lines: 18, ...}
[BO3] 📊 Using stats - Player2: {pieces: 40, attack_lines: 15, ...}
```

**Khi trận kết thúc, server phải log**:
```
[BO3] 💾 Saving match history to database...
[BO3] 🔄 Calling saveMatchData with payload: { ... }
[MatchHistoryService] 🚀 Starting transaction to save match data...
[MatchHistoryService] ✅ Inserted match with ID: 2
[MatchHistoryService] ✅ Inserted game 1 stats for Player 1
[MatchHistoryService] ✅ Inserted game 1 stats for Player 2
[MatchHistoryService] ✅ Inserted game 2 stats for Player 1
[MatchHistoryService] ✅ Inserted game 2 stats for Player 2
[MatchHistoryService] 🎉 Transaction committed successfully! Match ID: 2
[BO3] ✅ Match history saved successfully! DB Match ID: 2
```

---

## ✅ Bước 5: Kiểm Tra Database

```sql
-- 1. Xem tất cả matches
SELECT 
    m.match_id,
    p1.user_name as player1,
    p2.user_name as player2,
    m.player1_wins,
    m.player2_wins,
    w.user_name as winner,
    m.mode,
    m.match_timestamp
FROM matches m
JOIN users p1 ON m.player1_id = p1.user_id
JOIN users p2 ON m.player2_id = p2.user_id
LEFT JOIN users w ON m.winner_id = w.user_id
ORDER BY m.match_timestamp DESC;

-- 2. Xem chi tiết game_stats của match mới nhất
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

**Kết quả mong đợi**:
- Bảng `matches`: 1 hàng mới với thông tin player1, player2, tỉ số, winner
- Bảng `game_stats`: 4-6 hàng (2 players × 2-3 games)
- Stats **KHÔNG phải toàn số 0**

---

## 🐛 TROUBLESHOOTING

### Vấn Đề 1: Không thấy log "[BO3] 📊 Received stats"

**Nguyên nhân**: Client không emit event `bo3:player-stats`

**Giải pháp**:
1. Mở DevTools Console (F12) trong client
2. Chơi đến game over
3. Kiểm tra có log "📊 Sending my stats to server" không
4. Nếu không có → Check file `useNetwork.ts` dòng `sendTopout()`

---

### Vấn Đề 2: Log "📊 Received stats" nhưng stats = 0

**Nguyên nhân**: Client không track `piecesPlaced`, `attacksSent`

**Giải pháp**:
1. Check file `useVersus.ts` 
2. Đảm bảo có state: `piecesPlaced`, `attacksSent`, `elapsedMs`
3. Đảm bảo truyền vào `useNetwork()`:
```typescript
const network = useNetwork({
  // ...
  piecesPlaced,
  attacksSent,
  elapsedMs,
  // ...
});
```

---

### Vấn Đề 3: Không thấy log "[BO3] 💾 Saving match history"

**Nguyên nhân**: Match chưa kết thúc hoặc `finishMatch()` không được gọi

**Giải pháp**:
1. Chơi đủ 2-3 ván cho đến khi trận kết thúc
2. Check log có "[BO3] Match finished" không
3. Check code `handleGameTopout()` và `finishMatch()`

---

### Vấn Đề 4: Log có error khi lưu database

**Nguyên nhân**: Lỗi foreign key, constraint, hoặc connection

**Giải pháp**:
1. Đọc error message chi tiết
2. Kiểm tra `player_id` có tồn tại trong bảng `users` không:
```sql
SELECT user_id, user_name FROM users;
```
3. Kiểm tra database connection:
```sql
SELECT 1; -- Nếu không connect được → check .env
```

---

## 📊 KẾT QUẢ MONG ĐỢI

Sau khi chơi 1 trận BO3 (ví dụ: kết quả 2-1):

### Bảng `matches`:
| match_id | player1_name | player2_name | player1_wins | player2_wins | winner_name | mode   |
|----------|--------------|--------------|--------------|--------------|-------------|--------|
| 2        | admin        | khoaphamby   | 2            | 1            | admin       | ranked |

### Bảng `game_stats`:
| game | player | win | pieces | attack | time | pps | apm |
|------|--------|-----|--------|--------|------|-----|-----|
| 1    | admin  | ✅  | 45     | 18     | 23.5 | 1.91| 45.96|
| 1    | khoa   | ❌  | 40     | 15     | 23.5 | 1.70| 38.30|
| 2    | admin  | ❌  | 38     | 12     | 20.1 | 1.89| 35.82|
| 2    | khoa   | ✅  | 42     | 16     | 20.1 | 2.09| 47.76|
| 3    | admin  | ✅  | 50     | 22     | 28.3 | 1.77| 46.64|
| 3    | khoa   | ❌  | 45     | 18     | 28.3 | 1.59| 38.16|

---

## ✅ CHECKLIST

- [ ] Bảng `matches` và `game_stats` đã được tạo
- [ ] Script test chạy thành công
- [ ] Server và client đang chạy
- [ ] Chơi xong 1 trận BO3 đầy đủ
- [ ] Server log: "📊 Received stats from..."
- [ ] Server log: "💾 Saving match history to database..."
- [ ] Server log: "🎉 Transaction committed successfully!"
- [ ] Database có data mới trong bảng `matches`
- [ ] Database có 4-6 rows mới trong bảng `game_stats`
- [ ] Stats **KHÔNG phải** toàn số 0

---

**🎉 NẾU TẤT CẢ CHECKLIST ĐỀU ✅ → HOÀN THÀNH!**

Bạn có thể query data để xem lịch sử trận đấu, thống kê PPS/APM, leaderboard, v.v.
