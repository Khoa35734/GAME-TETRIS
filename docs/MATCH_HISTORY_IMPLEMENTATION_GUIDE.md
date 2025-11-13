# 📊 Hướng Dẫn Triển Khai: Lưu Kết Quả Trận Đấu BO3 vào PostgreSQL

## ✅ Tóm Tắt Những Gì Đã Làm

### 1. **Database Schema** (✅ Hoàn Thành)
Đã tạo 2 bảng mới trong PostgreSQL:

#### Bảng `matches`:
- Lưu thông tin tổng quan trận BO3
- Các trường: `player1_id`, `player2_id`, `player1_wins`, `player2_wins`, `winner_id`, `mode`, `match_timestamp`

#### Bảng `game_stats`:
- Lưu chi tiết từng ván đấu
- Các trường: `match_id`, `game_number`, `player_id`, `is_winner`, `pieces`, `attack_lines`, `time_seconds`, `pps`, `apm`

### 2. **Server-Side Service** (✅ Hoàn Thành)
- **File**: `server/src/services/matchHistoryService.ts`
- **Chức năng**:
  - Hàm `saveMatchData()` sử dụng **Transaction** để đảm bảo tính toàn vẹn dữ liệu
  - Validate dữ liệu đầu vào
  - Tính toán PPS và APM nếu thiếu
  - Rollback tự động nếu có lỗi

### 3. **Server-Side Integration** (✅ Hoàn Thành)
- **File**: `server/src/managers/bo3MatchManager.ts`
- **Thay đổi**:
  - Import service mới
  - Cập nhật interface `GameStats` để hỗ trợ `attack_lines` và `apm`
  - Thay thế hàm `saveMatchHistory()` cũ bằng logic mới gọi service
  - Cập nhật `handleGameFinished()` để nhận stats từ client

### 4. **Client-Side Update** (✅ Hoàn Thành)
- **File**: `client/src/components/multiplayer/hooks/useNetwork.ts`
- **Thay đổi**:
  - Thêm props `piecesPlaced`, `attacksSent`, `elapsedMs`
  - Cập nhật hàm `sendTopout()` để emit event `bo3:game-finished` với stats đầy đủ
  
- **File**: `client/src/components/multiplayer/hooks/useVersus.ts`
- **Thay đổi**:
  - Truyền stats vào `useNetwork()`

---

## 🚀 Hướng Dẫn Cài Đặt & Test

### **Bước 1: Chạy Migration**

```bash
# Di chuyển vào thư mục server
cd server

# Chạy migration để tạo 2 bảng mới
# (Cách chạy phụ thuộc vào setup của bạn)

# Nếu dùng script init-db:
npm run migrate

# Hoặc chạy trực tiếp SQL:
psql -U your_username -d your_database -f src/migrations/004_create_matches_and_game_stats_tables.sql
```

### **Bước 2: Kiểm Tra Bảng Đã Được Tạo**

```sql
-- Kết nối vào PostgreSQL
psql -U your_username -d your_database

-- Kiểm tra bảng matches
\d matches

-- Kiểm tra bảng game_stats
\d game_stats

-- Hoặc list tất cả bảng
\dt
```

### **Bước 3: Khởi Động Server & Client**

```bash
# Terminal 1: Start Server
cd server
npm run dev

# Terminal 2: Start Client
cd client
npm run dev
```

### **Bước 4: Test Trận Đấu**

1. Mở 2 trình duyệt (hoặc 2 tab Incognito)
2. Đăng nhập 2 tài khoản khác nhau
3. Vào chế độ Ranked/Casual để matchmaking
4. Chơi trận đấu BO3 cho đến khi kết thúc
5. Kiểm tra console của server để xem log:
   ```
   [BO3] 💾 Saving match history to database...
   [MatchHistoryService] 🚀 Starting transaction to save match data...
   [MatchHistoryService] ✅ Inserted match with ID: 1
   [MatchHistoryService] ✅ Inserted game 1 stats for Player 1
   [MatchHistoryService] ✅ Inserted game 1 stats for Player 2
   [MatchHistoryService] 🎉 Transaction committed successfully!
   ```

### **Bước 5: Kiểm Tra Dữ Liệu Trong Database**

```sql
-- Xem tất cả matches
SELECT * FROM matches ORDER BY match_timestamp DESC LIMIT 10;

-- Xem chi tiết game_stats của 1 match
SELECT 
  gs.*,
  u.user_name as player_name
FROM game_stats gs
JOIN users u ON gs.player_id = u.user_id
WHERE gs.match_id = 1  -- Thay bằng match_id thực tế
ORDER BY gs.game_number, gs.player_id;

-- Kiểm tra stats tổng hợp
SELECT 
  m.match_id,
  m.match_timestamp,
  p1.user_name as player1_name,
  p2.user_name as player2_name,
  m.player1_wins,
  m.player2_wins,
  winner.user_name as winner_name,
  m.mode
FROM matches m
JOIN users p1 ON m.player1_id = p1.user_id
JOIN users p2 ON m.player2_id = p2.user_id
LEFT JOIN users winner ON m.winner_id = winner.user_id
ORDER BY m.match_timestamp DESC
LIMIT 10;
```

---

## 🔍 Cấu Trúc Dữ Liệu Payload

### **Client → Server (Event: `bo3:game-finished`)**

```json
{
  "roomId": "match_1234567890_abc123",
  "winner": "opponent",
  "stats": {
    "player1": {
      "pieces": 45,
      "attack_lines": 18,
      "time": 23.5,
      "pps": 1.91,
      "apm": 45.96,
      "lines": 12,
      "finesse": 0,
      "holds": 3,
      "inputs": 0
    },
    "player2": {
      "pieces": 40,
      "attack_lines": 15,
      "time": 23.5,
      "pps": 1.70,
      "apm": 38.30,
      "lines": 10,
      "finesse": 0,
      "holds": 2,
      "inputs": 0
    }
  }
}
```

### **Server → Database (Table: `matches`)**

```sql
INSERT INTO matches VALUES (
  1,                          -- match_id (auto)
  'uuid-here',                -- match_guid (auto)
  101,                        -- player1_id
  102,                        -- player2_id
  2,                          -- player1_wins
  1,                          -- player2_wins
  101,                        -- winner_id
  'ranked',                   -- mode
  '2025-11-09 10:30:00+07'   -- match_timestamp (auto)
);
```

### **Server → Database (Table: `game_stats`)**

```sql
-- Ván 1
INSERT INTO game_stats VALUES (1, 1, 1, 101, true,  45, 18, 23.50, 1.91, 45.96);
INSERT INTO game_stats VALUES (2, 1, 1, 102, false, 40, 15, 23.50, 1.70, 38.30);

-- Ván 2
INSERT INTO game_stats VALUES (3, 1, 2, 101, false, 38, 12, 20.10, 1.89, 35.82);
INSERT INTO game_stats VALUES (4, 1, 2, 102, true,  42, 16, 20.10, 2.09, 47.76);

-- Ván 3
INSERT INTO game_stats VALUES (5, 1, 3, 101, true,  50, 22, 28.30, 1.77, 46.64);
INSERT INTO game_stats VALUES (6, 1, 3, 102, false, 45, 18, 28.30, 1.59, 38.16);
```

---

## 🐛 Troubleshooting

### **Lỗi: Bảng `matches` hoặc `game_stats` không tồn tại**
```bash
# Chạy lại migration
psql -U your_username -d your_database -f server/src/migrations/004_create_matches_and_game_stats_tables.sql
```

### **Lỗi: Foreign key constraint fails (user_id không tồn tại)**
```sql
-- Kiểm tra xem player_id có tồn tại trong bảng users không
SELECT user_id, user_name FROM users WHERE user_id IN (101, 102);
```

### **Lỗi: Transaction timeout**
```sql
-- Kiểm tra kết nối database
SELECT 1;

-- Kiểm tra locks
SELECT * FROM pg_locks WHERE granted = false;
```

### **Stats bị 0 hoặc không đúng**
- Kiểm tra client có track `piecesPlaced` và `attacksSent` đúng không
- Kiểm tra console client xem có log "📊 Sending bo3:game-finished" không
- Kiểm tra server log xem có nhận được event không

---

## 📝 Notes Quan Trọng

1. **Transaction Safety**: Tất cả INSERT vào database đều nằm trong 1 transaction duy nhất. Nếu 1 bước fail, toàn bộ sẽ rollback.

2. **Data Validation**: Service đã validate:
   - `player1_id` và `player2_id` phải hợp lệ
   - `mode` phải là `casual` hoặc `ranked`
   - `game_number` phải từ 1-3
   - Phải có ít nhất 1 game data

3. **Stats Calculation**: 
   - Nếu client không gửi `pps` hoặc `apm`, server sẽ tự tính
   - Formula: `PPS = pieces / time_seconds`
   - Formula: `APM = (attack_lines / time_seconds) * 60`

4. **Winner Logic**:
   - Client gửi `winner: 'opponent'` nghĩa là người gửi đã thua
   - Server dựa vào `socket.id` để xác định player1 hay player2 thua
   - Từ đó suy ra winner

---

## 🎯 Next Steps (Tùy Chọn)

### 1. **Tạo API để Query Match History**
```typescript
// server/src/routes/matches.ts
router.get('/player/:userId/history', async (req, res) => {
  const { userId } = req.params;
  const matches = await pool.query(`
    SELECT 
      m.*,
      array_agg(json_build_object(
        'game_number', gs.game_number,
        'player_id', gs.player_id,
        'is_winner', gs.is_winner,
        'pieces', gs.pieces,
        'attack_lines', gs.attack_lines,
        'pps', gs.pps,
        'apm', gs.apm
      ) ORDER BY gs.game_number) as games
    FROM matches m
    LEFT JOIN game_stats gs ON m.match_id = gs.match_id
    WHERE m.player1_id = $1 OR m.player2_id = $1
    GROUP BY m.match_id
    ORDER BY m.match_timestamp DESC
    LIMIT 20
  `, [userId]);
  res.json(matches.rows);
});
```

### 2. **Hiển thị Match History trên Client**
- Tạo component `<MatchHistory />` để hiển thị lịch sử trận đấu
- Fetch data từ API mới tạo
- Hiển thị stats chi tiết từng ván

### 3. **Thêm Leaderboard**
```sql
-- Top players by win rate
SELECT 
  u.user_name,
  COUNT(*) as total_matches,
  SUM(CASE WHEN m.winner_id = u.user_id THEN 1 ELSE 0 END) as wins,
  ROUND(
    SUM(CASE WHEN m.winner_id = u.user_id THEN 1 ELSE 0 END)::numeric / 
    COUNT(*)::numeric * 100, 2
  ) as win_rate
FROM users u
JOIN matches m ON u.user_id IN (m.player1_id, m.player2_id)
GROUP BY u.user_id, u.user_name
HAVING COUNT(*) >= 5  -- Ít nhất 5 trận
ORDER BY win_rate DESC, wins DESC
LIMIT 50;
```

---

## ✅ Checklist Hoàn Thành

- [x] Tạo migration script
- [x] Tạo service lưu database
- [x] Tích hợp vào bo3MatchManager
- [x] Cập nhật client emit stats
- [x] Test flow hoàn chỉnh
- [ ] Chạy migration trên production
- [ ] Monitor logs trong vài ngày đầu
- [ ] Tạo API query match history (optional)
- [ ] Hiển thị match history trên UI (optional)

---

**🎉 HOÀN TẤT! Hệ thống đã sẵn sàng lưu kết quả trận đấu BO3 vào PostgreSQL!**
