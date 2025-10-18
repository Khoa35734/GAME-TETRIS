# 🔥 FIX GARBAGE = 0 - Summary

## ❌ Vấn đề:
Server luôn tính ra **0 garbage** → không gửi gì → không thấy hàng rác

## 🔍 Nguyên nhân có thể:

### 1. Client gửi `lines: 0`
- lastPlacement.cleared = 0
- Không clear lines hoặc clear 1 line (Single = 0 garbage)

### 2. Server logic sai
- Array index sai
- Calculation sai

### 3. Không emit event
- roomId null
- Socket disconnect

## ✅ Đã sửa:

### 1. **Client (Versus.tsx)**
```typescript
// Thêm debug logs chi tiết
console.log('🔒 LOCK EVENT - Lines:', lines, 'T-Spin:', tspinType, 'PC:', pc);
console.log('📤 Emitting game:lock to server:', { lines, tspinType, pc });
```

### 2. **Server (index.ts)**
```typescript
// Thêm debug logs chi tiết
console.log(`[GARBAGE] Player ${socket.id} locked piece: ${lines} lines...`);
console.log(`[GARBAGE] Players in room:`, Array.from(r.players.keys()));
console.log(`[GARBAGE] Calculated garbage: ${g} (base=${base} + b2b + combo)`);
console.log(`[GARBAGE] ✅ Sending ${g} garbage to player ${sid}`);
console.log(`[GARBAGE] ⏭️ Skipping sender ${sid}`);
console.log(`[GARBAGE] ⚠️ No garbage to send (g = 0)`);
```

### 3. **Test Button**
Thêm button đỏ ở góc phải màn hình:
- Click để test gửi 2-line clear ngay lập tức
- Không cần chơi, chỉ cần click
- Check server console xem có nhận và tính đúng không

---

## 🧪 TEST NGAY:

### Bước 1: Start
```bash
# Terminal 1
cd server
npm run dev

# Terminal 2
cd client
npm run dev -- --host
```

### Bước 2: Vào Game
- Mở 2 browser windows
- Cả 2 vào Online Ranked
- Chờ match start

### Bước 3: Click Test Button
- **Click button đỏ "🧪 TEST GARBAGE (2 lines)"** ở góc phải

### Bước 4: Check Console

#### Client (người click):
```
🧪 TEST: Manually sending 2-line clear to server
```

#### Server:
```
[GARBAGE] Player XXX locked piece: 2 lines, tspinType: none, pc: false
[GARBAGE] Players in room: [ 'XXX', 'YYY' ]
[GARBAGE] Calculated garbage: 1 (base=1 + b2b:0 + combo:0)
[GARBAGE] ✅ Sending 1 garbage to player YYY
```

#### Client (opponent):
```
🗑️ Received garbage: 1 lines. Accumulating to pending
```

### Bước 5: Lock Piece
- **Opponent lock bất kỳ piece nào**

#### Expected:
```
🔒 Lock piece - Pending garbage: 1 Lines cleared: 0
[applyGarbageRows] Applying 1 garbage rows...
[applyGarbageRows] Applied! Result has 1 garbage rows
📤 FORCE Synced board with 1 garbage rows to opponent
```

### Bước 6: Visual Check
- ✅ Opponent sees **1 GRAY ROW** on own board (LEFT)
- ✅ Sender sees **1 GRAY ROW** on opponent board (RIGHT)

---

## 📊 Expected Garbage Values:

| Lines | Base | Final (no combo/b2b) |
|-------|------|---------------------|
| 0 | 0 | 0 ❌ |
| 1 | 0 | 0 ❌ |
| 2 | 1 | 1 ✅ |
| 3 | 2 | 2 ✅ |
| 4 | 4 | 4 ✅ |

**Important:** Single (1 line) = 0 garbage là ĐÚNG!

---

## ❓ Nếu vẫn 0 garbage:

### Case 1: Server log `lines: 0`
**Problem:** Client gửi sai
**Debug:**
- Check client console: Lines = ?
- Try click test button nhiều lần
- Check useStage.ts sweepRows

### Case 2: Server log `lines: 2` nhưng `garbage: 0`
**Problem:** Calculation logic sai
**Debug:**
- Check standardBase array
- Check array index
- Lines 2 → standardBase[2] = 1 ✅

### Case 3: Server không log gì
**Problem:** Event không nhận
**Debug:**
- Check socket connection
- Check roomId
- Check room.started

### Case 4: Log đúng nhưng không apply
**Problem:** Client không nhận hoặc không apply
**Debug:**
- Check client log `🗑️ Received`
- Check client log `[applyGarbageRows]`
- Lock piece để trigger apply

---

## 🗑️ Xóa Test Button:

Sau khi test xong và confirm working, **XÓA test button**:

Trong Versus.tsx, xóa đoạn:
```typescript
{/* 🧪 TEST BUTTON - XÓA SAU KHI FIX XONG */}
<button onClick={...}>
  🧪 TEST GARBAGE (2 lines)
</button>
```

---

## ✅ Success = Khi nào?

- [ ] Click test button → Server log shows `Calculated garbage: 1`
- [ ] Server log shows `✅ Sending 1 garbage`
- [ ] Opponent console shows `🗑️ Received garbage: 1`
- [ ] Opponent lock piece → see GRAY ROW
- [ ] Sender sees GRAY ROW on opponent board

---

## 🎯 Root Cause Analysis:

Có 3 khả năng:

### A. Lines = 0 (most likely)
- Không clear lines
- Clear 1 line (Single)
- lastPlacement.cleared bị reset

### B. Server logic sai (unlikely)
- Array index wrong
- Calculation wrong

### C. Event không gửi (unlikely)
- Socket disconnect
- roomId null

---

**Test với button và report lại kết quả console logs!** 🚀

Nếu test button work → vấn đề là ở `lastPlacement.cleared` trong game thực
Nếu test button cũng 0 → vấn đề là ở server logic hoặc socket
