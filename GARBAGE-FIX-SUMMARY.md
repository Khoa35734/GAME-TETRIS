# 🔧 GARBAGE SYNC FIX - Summary

## ❌ Vấn đề ban đầu:

Khi Player A clear lines và gửi garbage:
1. ✅ Player B nhận garbage notification
2. ✅ Garbage được apply vào board của Player B (khi lock piece)
3. ❌ **Player A KHÔNG THẤY garbage trên board của Player B**
4. ❌ **Player B (ở máy của mình) cũng không thấy garbage trên board của chính mình**

### Root Cause:
- Board sync qua `game:state` event được trigger bởi `stage` thay đổi
- Nhưng trong useEffect lock handler, `stage` variable vẫn giữ giá trị CŨ (trước khi garbage apply)
- `applyGarbageRows` gọi `setStage()` nhưng không return updated value được dùng ngay
- Kết quả: Board được sync TRƯỚC KHI garbage được apply

## ✅ Giải pháp đã implement:

### 1. **Sử dụng return value của `applyGarbageRows`**
```typescript
const applyGarbageRows = useCallback((count: number): StageType | null => {
  // ... 
  let updated: StageType | null = null;
  setStage(prev => {
    // Apply garbage
    updated = cloned;
    return cloned;
  });
  return updated; // ✅ Return updated stage
}, [setStage]);
```

### 2. **Emit board ngay sau khi apply garbage**
```typescript
let updatedStage: StageType | null = null;
if (pendingGarbage > 0) {
  updatedStage = applyGarbageRows(pendingGarbage);
  
  // ✅ Sync board ngay với updated stage
  if (updatedStage && roomId) {
    const gameState = {
      matrix: cloneStageForNetwork(updatedStage),
      hold,
      next: nextFour
    };
    socket.emit('game:state', roomId, gameState);
    console.log('📤 Synced board with garbage to opponent');
  }
}
```

### 3. **Check game over với updated stage**
```typescript
const finalStage = updatedStage ?? stage;
if (isGameOverFromBuffer(finalStage)) {
  // Check với board ĐÃ có garbage
}
```

### 4. **Console logs để debug**
- `🗑️ Received garbage: X lines` - Khi nhận garbage
- `🔒 Lock piece - Pending garbage: X` - Khi lock piece
- `✂️ Offset garbage: X Remaining: Y` - Khi clear lines offset
- `⬆️ Applying X garbage rows` - Khi apply garbage
- `📤 Synced board with garbage to opponent` - Khi sync board

## 🎮 Test Cases:

### Test 1: Basic Garbage
1. Player A clear **Double** (2 lines)
2. Server tính: base = 1, combo = 0, b2b = 0 → **1 garbage**
3. Player B nhận notification
4. Player B lock piece tiếp theo
5. ✅ **Player B thấy 1 hàng xám** trên board của mình
6. ✅ **Player A thấy 1 hàng xám** trên board của Player B (ở màn hình của A)

### Test 2: Multiple Garbage
1. Player A clear **Tetris** (4 lines)
2. Gửi **4 garbage**
3. Player B lock piece
4. ✅ **Cả 2 players đều thấy 4 hàng xám** trên board của B

### Test 3: Garbage Accumulation
1. Player A clear Double → 1 garbage
2. Player B chưa lock
3. Player A clear Triple → 2 garbage
4. Tổng pending: **3 garbage**
5. Player B lock piece
6. ✅ **Nhận 3 hàng xám cùng lúc**

### Test 4: Garbage Offset
1. Player B có **5 pending garbage**
2. Player B clear **Triple** (3 lines)
3. Offset: 5 - 3 = **2 remaining**
4. ✅ **Chỉ nhận 2 hàng xám thay vì 5**

### Test 5: Combo Garbage
1. Player A clear lines liên tục:
   - 1st clear (Double): 1 garbage
   - 2nd clear (Double): 1 + 1 (combo) = **2 garbage**
   - 3rd clear (Triple): 2 + 2 (combo) = **4 garbage**
2. ✅ Mỗi lần clear, Player B nhận ngày càng nhiều garbage

## 📊 Expected Console Output:

### On Player A (sender):
```
(Player A clears 2 lines)
🔒 Lock piece - Pending garbage: 0 Lines cleared: 2
(No garbage to apply - Player A không nhận garbage từ chính mình)
```

### On Player B (receiver):
```
🗑️ Received garbage: 1 lines. Accumulating to pending
(Player B moves and locks piece)
🔒 Lock piece - Pending garbage: 1 Lines cleared: 0
⬆️ Applying 1 garbage rows to board
📤 Synced board with garbage to opponent
```

### On Player A (sees opponent board):
```
(Receives game:state from Player B with garbage)
(Opponent board updates with gray row)
```

## 🎨 Visual Appearance:

Garbage rows should appear as:
- **Color**: Dark gray (RGB: 100, 100, 100, alpha: 0.95)
- **Border**: 2px solid dark gray
- **Pattern**: Full row with 1 random hole
- **Position**: Added from bottom (push up existing blocks)

## 🔍 Debugging Checklist:

Nếu vẫn không thấy garbage:

### 1. Check Console Logs
- [ ] Có log `🗑️ Received garbage` trên Player B?
- [ ] Có log `⬆️ Applying X garbage` sau khi lock?
- [ ] Có log `📤 Synced board` sau khi apply?

### 2. Check Network
- [ ] Mở DevTools → Network → WS (WebSocket)
- [ ] Có thấy `game:garbage` event?
- [ ] Có thấy `game:state` event sau khi lock?

### 3. Check Board State
- [ ] Console log `stage` sau khi apply garbage
- [ ] Check xem có ô nào có value `'garbage'`?
- [ ] Check opponent board có update không?

### 4. Check Server
- [ ] Server có log garbage calculation?
- [ ] Server có emit `game:garbage` đến đúng opponent?

## 🚀 Next Steps:

1. **Start both server and client**
2. **Open 2 browser windows** (or browser + incognito)
3. **Both enter Ranked mode** and wait for match
4. **Player A: Clear lines** (Single/Double/Triple/Tetris)
5. **Player B: Lock next piece** and watch for gray rows
6. **Check console logs** to verify flow
7. **Check both screens** to see garbage on opponent's board

## ✨ Expected Behavior Now:

- ✅ Garbage hiển thị màu xám đậm
- ✅ Garbage có viền 2px
- ✅ Garbage xuất hiện KHI LOCK PIECE (không phải ngay lập tức)
- ✅ **Cả 2 players đều thấy garbage trên board của người nhận**
- ✅ Board sync ngay sau khi apply garbage
- ✅ Console logs hiển thị đầy đủ flow
- ✅ Garbage offset hoạt động đúng
- ✅ Game over detection với updated stage

---

## 📝 Technical Details:

### Flow mới:
1. Player A clear lines → emit `game:lock` → server tính garbage
2. Server emit `game:garbage` to Player B
3. Player B nhận → tích lũy vào `pendingGarbageLeft`
4. Player B lock piece → trigger useEffect
5. `applyGarbageRows(pending)` → update stage → return updated stage
6. Emit `game:state` với **updated stage** (có garbage)
7. Player A nhận `game:state` → update opponent board → **THẤY GARBAGE**
8. Player B's own board cũng được update → **THẤY GARBAGE**

### Key Changes:
- ✅ Dùng return value của `applyGarbageRows` thay vì rely on stale `stage`
- ✅ Emit board sync NGAY sau apply, không đợi useEffect
- ✅ Check game over với updated stage
- ✅ Add comprehensive console logs

Test ngay để verify! 🎉
