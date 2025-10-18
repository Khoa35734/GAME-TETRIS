# 🎮 Fix BO3 Matchmaking - Best of 3 System

## 📋 **Yêu cầu**

1. ✅ Tìm trận → Hiển thị console có 10s để chấp nhận
2. ✅ Nếu chấp nhận → Hiển thị "đang chờ đối thủ"
3. ✅ Khi cả 2 chấp nhận → Redis tạo room BO3 (Best of 3)
4. ✅ Tránh lỗi "phòng không tồn tại"

---

## 🔄 **Flow hoàn chỉnh**

```
User A: Join queue (casual/ranked)
User B: Join queue (casual/ranked)
    ↓
🎮 Match found!
    ↓
Console log server:
  "🎮 [Matchmaking] ĐÃ TÌM THẤY TRẬN ĐẤU!"
  "⏰ Có 10 giây để chấp nhận..."
    ↓
Client: Hiển thị popup với countdown 10s
    ↓
User A: Click "Chấp nhận"
    ↓
Console log server:
  "✅ [Matchmaking] User A đã chấp nhận"
  "⏳ Đang chờ đối thủ..."
    ↓
Client A: Hiển thị "Đang chờ đối thủ chấp nhận..."
    ↓
User B: Click "Chấp nhận"
    ↓
Console log server:
  "✅ [Matchmaking] User B đã chấp nhận"
  "✅ Cả 2 người chơi đã chấp nhận! Bắt đầu tạo BO3 match..."
    ↓
Server tạo:
  1. Redis room (matchManager.createMatch)
  2. BO3 match (bo3MatchManager.createMatch)
    ↓
Console log server:
  "✅ BO3 Match created successfully!"
  "   Room ID: match_xxx"
  "   Mode: casual/ranked (Best of 3)"
    ↓
Emit 'matchmaking:start' với:
  - roomId
  - matchType: 'bo3'
  - mode: 'casual'/'ranked'
  - opponent info
    ↓
Client navigate to /room/{roomId}
    ↓
✅ Room exists (MatchManager)
✅ BO3 system active (BO3MatchManager)
    ↓
Game bắt đầu với BO3 format!
```

---

## 💻 **Code Changes**

### **1. Server - matchmaking.ts**

#### **Import BO3MatchManager:**
```typescript
import BO3MatchManager from './bo3MatchManager';
```

#### **Add BO3MatchManager instance:**
```typescript
class MatchmakingSystem {
  private io: Server;
  private bo3MatchManager: BO3MatchManager;
  
  constructor(io: Server) {
    this.io = io;
    this.bo3MatchManager = new BO3MatchManager(io);
    this.setupSocketHandlers();
  }
}
```

#### **Enhanced createMatch() with console logs:**
```typescript
private createMatch(player1: Player, player2: Player, mode: 'casual' | 'ranked') {
  const matchId = this.generateMatchId();
  
  const match: Match = {
    matchId,
    player1,
    player2,
    mode,
    confirmedPlayers: new Set(),
    createdAt: Date.now(),
  };

  this.activeMatches.set(matchId, match);

  console.log(`\n🎮 [Matchmaking] ĐÃ TÌM THẤY TRẬN ĐẤU!`);
  console.log(`   Match ID: ${matchId}`);
  console.log(`   Player 1: ${player1.username} (${player1.accountId})`);
  console.log(`   Player 2: ${player2.username} (${player2.accountId})`);
  console.log(`   Mode: ${mode}`);
  console.log(`   ⏰ Có 10 giây để chấp nhận...`);

  // Notify both players
  this.io.to(player1.socketId).emit('matchmaking:found', {
    matchId,
    opponent: { username: player2.username },
    timeout: 10, // 10 seconds
  });
  // ... same for player2
}
```

#### **Enhanced handleConfirmAccept() with waiting state:**
```typescript
private handleConfirmAccept(socket: Socket, matchId: string) {
  const match = this.activeMatches.get(matchId);
  if (!match) {
    socket.emit('matchmaking:error', { error: 'Match not found' });
    return;
  }

  match.confirmedPlayers.add(socket.id);
  
  const playerName = match.player1.socketId === socket.id 
    ? match.player1.username 
    : match.player2.username;
  
  console.log(`✅ [Matchmaking] ${playerName} đã chấp nhận match ${matchId}`);
  console.log(`   Confirmed: ${match.confirmedPlayers.size}/2`);

  // Notify this player they're waiting for opponent
  if (match.confirmedPlayers.size === 1) {
    socket.emit('matchmaking:waiting', { 
      message: 'Đang chờ đối thủ chấp nhận...' 
    });
    console.log(`   ⏳ Đang chờ đối thủ...`);
  }

  // If both players confirmed, start the match
  if (match.confirmedPlayers.size === 2) {
    console.log(`✅ [Matchmaking] Cả 2 người chơi đã chấp nhận! Bắt đầu tạo BO3 match...`);
    this.startMatch(match);
  }
}
```

#### **New startMatch() with BO3 creation:**
```typescript
private async startMatch(match: Match) {
  const roomId = `match_${match.matchId}`;

  if (match.confirmTimeout) {
    clearTimeout(match.confirmTimeout);
  }

  console.log(`[Matchmaking] 🎮 Cả 2 người chơi đã chấp nhận! Đang tạo BO3 match...`);
  console.log(`   Player 1: ${match.player1.username} (${match.player1.accountId})`);
  console.log(`   Player 2: ${match.player2.username} (${match.player2.accountId})`);

  try {
    // 1. Create match in Redis via MatchManager (để room tồn tại)
    await matchManager.createMatch({
      matchId: roomId,
      hostPlayerId: match.player1.socketId,
      hostSocketId: match.player1.socketId,
      mode: 'custom',
      maxPlayers: 2,
      roomId: roomId,
      hostAccountId: String(match.player1.accountId),
    });

    // 2. Add player 2 to the match
    await matchManager.addPlayer(roomId, {
      playerId: match.player2.socketId,
      socketId: match.player2.socketId,
      accountId: String(match.player2.accountId),
    });

    // 3. Join socket.io rooms for broadcasting
    const socket1 = this.io.sockets.sockets.get(match.player1.socketId);
    const socket2 = this.io.sockets.sockets.get(match.player2.socketId);
    
    if (socket1) await socket1.join(roomId);
    if (socket2) await socket2.join(roomId);

    // 4. ✅ TẠO BO3 MATCH để quản lý best of 3
    const bo3Match = this.bo3MatchManager.createMatch(
      match.matchId,
      roomId,
      {
        socketId: match.player1.socketId,
        accountId: match.player1.accountId,
        username: match.player1.username
      },
      {
        socketId: match.player2.socketId,
        accountId: match.player2.accountId,
        username: match.player2.username
      },
      match.mode
    );

    console.log(`[Matchmaking] ✅ BO3 Match created successfully!`);
    console.log(`   Room ID: ${roomId}`);
    console.log(`   Mode: ${match.mode} (Best of 3)`);
    console.log(`   Status: Ready to start`);

    // 5. Notify both players to start
    this.io.to(match.player1.socketId).emit('matchmaking:start', { 
      roomId,
      matchType: 'bo3',
      mode: match.mode,
      opponent: {
        username: match.player2.username,
        accountId: match.player2.accountId
      }
    });
    this.io.to(match.player2.socketId).emit('matchmaking:start', { 
      roomId,
      matchType: 'bo3',
      mode: match.mode,
      opponent: {
        username: match.player1.username,
        accountId: match.player1.accountId
      }
    });

    this.activeMatches.delete(match.matchId);
    console.log(`[Matchmaking] ✅ Match ${match.matchId} started successfully (BO3)`);
    
  } catch (error) {
    console.error(`[Matchmaking] ❌ Error creating BO3 match:`, error);
    
    // Notify players about error
    this.io.to(match.player1.socketId).emit('matchmaking:error', { 
      error: 'Failed to create room' 
    });
    this.io.to(match.player2.socketId).emit('matchmaking:error', { 
      error: 'Failed to create room' 
    });
    
    // Return both to queue
    if (match.mode === 'casual') {
      this.casualQueue.push(match.player1, match.player2);
    } else {
      this.rankedQueue.push(match.player1, match.player2);
    }
    this.activeMatches.delete(match.matchId);
  }
}
```

---

### **2. Client - MatchmakingUI.tsx**

#### **Add 'matchmaking:waiting' event listener:**
```typescript
useEffect(() => {
  // Tìm thấy đối thủ
  socket.on('matchmaking:found', (data: any) => {
    console.log('✅ [Matchmaking] Match found:', data);
    setStatus('found');
    setMatchData(data);
    setConfirmTimeout(data.timeout || 10);
  });

  // 🆕 Đang chờ đối thủ chấp nhận
  socket.on('matchmaking:waiting', (data: any) => {
    console.log('⏳ [Matchmaking] Waiting for opponent:', data.message);
    setStatus('waiting');
  });

  // Trận đấu bắt đầu (cả 2 đều confirm)
  socket.on('matchmaking:start', (data: any) => {
    console.log('🎮 [Matchmaking] Match starting:', data);
    navigate(`/room/${data.roomId}`);
  });

  return () => {
    socket.off('matchmaking:found');
    socket.off('matchmaking:waiting'); // 🆕
    socket.off('matchmaking:start');
    socket.off('matchmaking:opponent-declined');
    socket.off('matchmaking:penalty');
    socket.off('matchmaking:error');
  };
}, [navigate, onCancel]);
```

#### **Update handleConfirm:**
```typescript
const handleConfirm = () => {
  console.log('✅ [Matchmaking] User confirmed match');
  socket.emit('matchmaking:confirm-accept', { matchId: matchData?.matchId });
  setHasConfirmed(true);
  // Status will be set by 'matchmaking:waiting' event from server
};
```

---

## 📊 **Redis Data Structure**

### **1. MatchManager (Room Data):**
```json
match:{roomId} → {
  matchId: "match_xxx",
  hostPlayerId: "socket_id_1",
  mode: "custom",
  maxPlayers: 2,
  players: [
    {
      playerId: "socket_id_1",
      socketId: "socket_id_1",
      accountId: "1",
      ready: false,
      alive: true
    },
    {
      playerId: "socket_id_2",
      socketId: "socket_id_2",
      accountId: "2",
      ready: false,
      alive: true
    }
  ],
  status: "waiting"
}
```

### **2. BO3MatchManager (In-Memory):**
```typescript
{
  matchId: "xxx",
  roomId: "match_xxx",
  player1: {
    socketId: "socket_id_1",
    accountId: 1,
    username: "User1"
  },
  player2: {
    socketId: "socket_id_2",
    accountId: 2,
    username: "User2"
  },
  mode: "casual",
  currentGame: 1,
  score: {
    player1Wins: 0,
    player2Wins: 0
  },
  games: [],
  status: "in-progress"
}
```

---

## 🧪 **Test Scenarios**

### **Test 1: Normal BO3 Flow**

```
1. Browser 1: Login → Matchmaking (casual)
2. Browser 2: Login → Matchmaking (casual)

Server console:
  🎮 [Matchmaking] ĐÃ TÌM THẤY TRẬN ĐẤU!
     Match ID: xxx
     Player 1: User1 (1)
     Player 2: User2 (2)
     Mode: casual
     ⏰ Có 10 giây để chấp nhận...

3. Browser 1: Click "Chấp nhận"

Server console:
  ✅ [Matchmaking] User1 đã chấp nhận match xxx
     Confirmed: 1/2
     ⏳ Đang chờ đối thủ...

Client 1: Show "Đang chờ đối thủ chấp nhận..."

4. Browser 2: Click "Chấp nhận"

Server console:
  ✅ [Matchmaking] User2 đã chấp nhận match xxx
     Confirmed: 2/2
  ✅ Cả 2 người chơi đã chấp nhận! Bắt đầu tạo BO3 match...
  🎮 Cả 2 người chơi đã chấp nhận! Đang tạo BO3 match...
     Player 1: User1 (1)
     Player 2: User2 (2)
  [BO3] Match created: xxx (User1 vs User2)
  ✅ BO3 Match created successfully!
     Room ID: match_xxx
     Mode: casual (Best of 3)
     Status: Ready to start
  ✅ Match xxx started successfully (BO3)

5. Both browsers navigate to /room/match_xxx
6. ✅ Room exists in Redis
7. ✅ BO3 system manages the match
8. Game 1 starts!
```

### **Test 2: One Player Declines**

```
1. Match found
2. Player 1: Click "Chấp nhận"
3. Player 2: Click "Từ chối"

Server console:
  ✅ [Matchmaking] User1 đã chấp nhận
     ⏳ Đang chờ đối thủ...
  [Matchmaking] Player socket_2 declined match xxx

Client 1: Show "Opponent declined, returning to queue..."
Client 2: Back to main menu with penalty

Result: Player 1 back to queue, Player 2 gets penalty
```

### **Test 3: Timeout (No response)**

```
1. Match found
2. Player 1: Click "Chấp nhận"
3. Player 2: No action (10s pass)

Server console:
  ✅ [Matchmaking] User1 đã chấp nhận
     ⏳ Đang chờ đối thủ...
  [Matchmaking] Match xxx timed out

Result: Both back to queue, Player 2 gets penalty
```

---

## ✅ **Benefits of BO3 System**

1. ✅ **Best of 3 format** - Professional competitive format
2. ✅ **Score tracking** - Game 1, 2, 3 với điểm 0-0, 1-0, 1-1, 2-0, 2-1
3. ✅ **Match history** - Lưu từng game riêng với stats
4. ✅ **Auto progression** - Tự động chuyển sang game tiếp theo
5. ✅ **Fair competition** - Cần win 2/3 games để thắng
6. ✅ **Room persistence** - Room tồn tại trong Redis
7. ✅ **Proper cleanup** - Tự động xoá sau khi match kết thúc

---

## 🎮 **BO3 Events**

### **Server → Client:**
```typescript
'bo3:match-start'      // Match bắt đầu
'bo3:game-result'      // Kết quả 1 game
'bo3:next-game-start'  // Bắt đầu game tiếp theo
'bo3:match-end'        // Match kết thúc (có người win 2 games)
'bo3:status'           // Lấy status hiện tại
```

### **Client → Server:**
```typescript
'bo3:game-finished'    // Client báo game kết thúc
'bo3:ready-next'       // Client sẵn sàng game tiếp
'bo3:get-status'       // Client query status
```

---

## 📝 **Summary**

| Feature | Before | After |
|---------|--------|-------|
| Match format | Single game | Best of 3 |
| Room creation | MatchManager only | MatchManager + BO3MatchManager |
| Console logs | Minimal | Detailed with emojis |
| Waiting state | ❌ None | ✅ "Đang chờ đối thủ" |
| Match tracking | Basic | Full BO3 score tracking |
| Error handling | Basic | Detailed with queue return |

---

**Status:** ✅ Hoàn tất  
**Date:** 2025-10-16  
**Impact:** Critical - Matchmaking giờ là BO3 format!
