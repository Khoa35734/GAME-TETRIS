# 🎮 Hệ thống Matchmaking

## 📋 Tổng quan

Hệ thống matchmaking hoàn chỉnh cho game Tetris với các tính năng:
- ✅ Tìm trận tự động (Casual & Ranked)
- ✅ Timer đếm thời gian tìm kiếm
- ✅ Cảnh báo sau 1 phút, timeout sau 5 phút
- ✅ Xác nhận trận đấu với countdown 10 giây
- ✅ Hệ thống phạt khi từ chối trận (escalating penalties)
- ✅ Matchmaking theo ELO cho chế độ Ranked

## 🏗️ Kiến trúc

### Client-side Components

#### 1. **MatchmakingUI.tsx**
Component modal chính xử lý toàn bộ UI matchmaking.

**States:**
- `searching`: Đang tìm đối thủ
- `found`: Tìm thấy đối thủ, chờ xác nhận
- `timeout`: Quá thời gian tìm kiếm (5 phút)
- `penalty`: Đang bị phạt

**Features:**
- Timer đếm lên từ 0:00
- Cảnh báo tại 60s: "Đang cố gắng tìm đối thủ..."
- Timeout tại 300s: "Không tìm được đối thủ"
- Confirmation: 10s countdown với nút Accept/Decline
- Penalty display: Hiển thị thời gian còn lại

#### 2. **OnlineCasual.tsx**
Entry point cho chế độ Casual (không ảnh hưởng rank).

**Theme:** Blue/Teal (#4ecdc4)

#### 3. **OnlineRanked.tsx**
Entry point cho chế độ Ranked (ảnh hưởng ELO).

**Theme:** Orange/Gold (#ffaa00)

### Server-side System

#### **matchmaking.ts**

Class `MatchmakingSystem` quản lý toàn bộ logic matchmaking:

**Data Structures:**
```typescript
- casualQueue: Player[]        // Hàng đợi casual
- rankedQueue: Player[]        // Hàng đợi ranked
- activeMatches: Map<string, Match>  // Trận đang chờ confirm
- penalties: Map<number, PenaltyRecord>  // Theo dõi phạt
```

**Matching Algorithm:**

**Casual Mode:**
- Ghép 2 người đầu tiên trong queue
- First-come-first-serve

**Ranked Mode:**
- Sắp xếp theo rating
- Ghép người có rating gần nhau
- Mở rộng khoảng cách tìm kiếm theo thời gian:
  - Base: ±100 rating
  - Mỗi 10s: +50 rating

**Penalty System:**
- Base: 60 giây
- Escalation: Duration = 60s × (2^declineCount)
  - Lần 1: 60s
  - Lần 2: 120s (2 phút)
  - Lần 3: 240s (4 phút)
  - Lần 4: 480s (8 phút)
- Reset: Sau 24 giờ không decline

## 🔌 Socket Events

### Client → Server

#### `matchmaking:join`
Tham gia hàng đợi tìm trận.
```typescript
socket.emit('matchmaking:join', { mode: 'casual' | 'ranked' });
```

#### `matchmaking:cancel`
Hủy tìm trận.
```typescript
socket.emit('matchmaking:cancel');
```

#### `matchmaking:confirm-accept`
Chấp nhận trận đấu.
```typescript
socket.emit('matchmaking:confirm-accept', { matchId: string });
```

#### `matchmaking:confirm-decline`
Từ chối trận đấu (sẽ bị phạt).
```typescript
socket.emit('matchmaking:confirm-decline', { matchId: string });
```

### Server → Client

#### `matchmaking:found`
Tìm thấy đối thủ, chờ xác nhận.
```typescript
{
  matchId: string,
  opponent: { username: string }
}
```

#### `matchmaking:start`
Cả 2 người đã confirm, bắt đầu game.
```typescript
{
  roomId: string
}
```

#### `matchmaking:opponent-declined`
Đối thủ đã từ chối hoặc timeout, quay lại queue.
```typescript
(no data)
```

#### `matchmaking:penalty`
Bị phạt vì decline/timeout.
```typescript
{
  duration: number  // Thời gian phạt (giây)
}
```

#### `matchmaking:timeout`
Không xác nhận trong 10s.
```typescript
(no data)
```

#### `matchmaking:error`
Lỗi matchmaking.
```typescript
{
  error: string
}
```

## 📊 API Endpoints

### `GET /api/matchmaking/stats`

Lấy thống kê hàng đợi.

**Response:**
```json
{
  "casual": {
    "players": 5,
    "averageWaitTime": 45
  },
  "ranked": {
    "players": 3,
    "averageWaitTime": 120
  },
  "activeMatches": 2,
  "penalizedPlayers": 1
}
```

## 🚀 Luồng hoạt động

### Luồng tìm trận thành công

```
1. User nhấn "TÌM TRẬN" → OnlineCasual/OnlineRanked
2. Render MatchmakingUI (status: searching)
3. Client emit: matchmaking:join { mode }
4. Server thêm vào queue
5. Server tìm match (periodic 2s)
6. Server emit: matchmaking:found { matchId, opponent }
7. Client chuyển status: found (countdown 10s)
8. User nhấn "Chấp nhận"
9. Client emit: matchmaking:confirm-accept { matchId }
10. Cả 2 confirm → Server emit: matchmaking:start { roomId }
11. Client navigate → /room/{roomId}
```

### Luồng từ chối trận

```
1-7. (giống luồng thành công)
8. User nhấn "Từ chối"
9. Client emit: matchmaking:confirm-decline { matchId }
10. Server apply penalty
11. Server emit: matchmaking:penalty { duration }
12. Client hiển thị penalty screen
13. Server emit: matchmaking:opponent-declined → đối thủ
14. Đối thủ quay lại queue
```

### Luồng timeout

```
1-7. (giống luồng thành công)
8. 10s trôi qua, không ai confirm
9. Server timeout → apply penalty
10. Server emit: matchmaking:timeout cho người không confirm
11. Server emit: matchmaking:opponent-declined cho người đã confirm
12. Người đã confirm quay lại queue
```

## 🎯 Yêu cầu để chạy

### Client

Đã được cài đặt sẵn trong:
- `client/src/components/MatchmakingUI.tsx`
- `client/src/components/OnlineCasual.tsx`
- `client/src/components/OnlineRanked.tsx`
- `client/src/App.tsx` (routes)

### Server

Đã được cài đặt sẵn trong:
- `server/src/matchmaking.ts`
- `server/src/index.ts` (integration)

**Dependencies:**
- Socket.IO (đã có)
- TypeScript (đã có)

## 🧪 Testing

### Test thủ công

1. **Tìm trận:**
   - Mở 2 tab browser
   - Login 2 tài khoản khác nhau
   - Cả 2 vào "Đối kháng" → TÌM TRẬN
   - Quan sát matchmaking:found event

2. **Decline test:**
   - Tìm trận như trên
   - Tab 1 decline → kiểm tra penalty
   - Tab 2 quay lại queue

3. **Timeout test:**
   - Tìm trận
   - Không nhấn gì trong 10s
   - Kiểm tra penalty

### Test API

```bash
# Kiểm tra stats
curl http://localhost:4000/api/matchmaking/stats

# Response example:
# {
#   "casual": { "players": 2, "averageWaitTime": 15 },
#   "ranked": { "players": 0, "averageWaitTime": 0 },
#   "activeMatches": 1,
#   "penalizedPlayers": 0
# }
```

## 📝 TODO / Future Improvements

- [ ] **Database persistence:** Lưu penalty records vào PostgreSQL
- [ ] **Fetch username:** Lấy username thật từ database thay vì placeholder
- [ ] **MMR tracking:** Implement ELO rating system cho ranked
- [ ] **Notification system:** Thông báo khi tìm thấy trận (browser notification)
- [ ] **Queue priority:** Người chờ lâu được ưu tiên
- [ ] **Regional matchmaking:** Ghép theo khu vực để giảm ping
- [ ] **Party system:** Tìm trận theo nhóm (2v2, 3v3)
- [ ] **Analytics:** Theo dõi average queue time, match success rate

## 🐛 Known Issues

1. **Username placeholder:** Hiện tại dùng `User${userId}`, cần fetch từ database
2. **No persistence:** Penalty records mất khi server restart
3. **Rating system:** Chưa có hệ thống ELO thực sự cho ranked

## 📚 Code References

### Client Socket Integration

```typescript
// MatchmakingUI.tsx
useEffect(() => {
  socket.emit('matchmaking:join', { mode });
  
  socket.on('matchmaking:found', (data) => {
    setStatus('found');
    setMatchData(data);
  });
  
  socket.on('matchmaking:start', (data) => {
    navigate(`/room/${data.roomId}`);
  });
  
  return () => {
    socket.off('matchmaking:found');
    socket.off('matchmaking:start');
  };
}, [mode]);
```

### Server Handler

```typescript
// index.ts
socket.on('matchmaking:join', (data: { mode: 'casual' | 'ranked' }) => {
  matchmakingSystem.handleJoinQueue(socket, data);
});
```

## ✅ Checklist triển khai

- [x] MatchmakingUI component
- [x] OnlineCasual page
- [x] OnlineRanked page
- [x] Routes configuration
- [x] Server matchmaking class
- [x] Socket event handlers
- [x] Penalty system
- [x] Timer logic (search & confirm)
- [x] Queue matching algorithm
- [x] API stats endpoint
- [ ] Database integration (TODO)
- [ ] Username fetching (TODO)
- [ ] ELO system (TODO)

---

**Status:** ✅ Core system hoàn thành, sẵn sàng test
**Last updated:** 2025
