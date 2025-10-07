# 🧪 TEST GARBAGE - Debug Instructions

## 🎯 Mục đích:
Tìm ra tại sao server luôn tính ra 0 garbage và không gửi được

## 📋 Checklist:

### 1. Start Server với Console
```bash
cd server
npm run dev
```

**Watch for logs:**
- `[GARBAGE] Player XXX locked piece: X lines...`
- `[GARBAGE] Calculated garbage: X (...)`
- `[GARBAGE] ✅ Sending X garbage to player YYY`

### 2. Start Client với Console (F12)
```bash
cd client  
npm run dev -- --host
```

**Open 2 browser windows** (Regular + Incognito)

### 3. Test Flow:

#### Step 1: Enter Match
- Both players enter Online Ranked
- Wait for matchmaking
- Game starts with countdown

#### Step 2: Player A - Clear Lines
1. **Move pieces to create a line**
2. **Clear at least 2 lines** (Double)
3. **Watch console immediately**

**Expected Client Console (Player A):**
```
🔒 LOCK EVENT - Lines: 2 T-Spin: none PC: false
📤 Emitting game:lock to server: { lines: 2, tspinType: 'none', pc: false }
```

**Expected Server Console:**
```
[GARBAGE] Player <socketId> locked piece: 2 lines, tspinType: none, pc: false
[GARBAGE] Players in room: [ '<socketId1>', '<socketId2>' ]
[GARBAGE] Calculated garbage: 1 (base=1 + b2b:0 + combo:0)
[GARBAGE] ✅ Sending 1 garbage to player <opponent_socketId>
```

**Expected Client Console (Player B):**
```
🗑️ Received garbage: 1 lines. Accumulating to pending
```

#### Step 3: Player B - Lock Piece
1. **Player B moves and locks next piece**
2. **Watch console**

**Expected:**
```
🔒 Lock piece - Pending garbage: 1 Lines cleared: 0
[applyGarbageRows] Applying 1 garbage rows...
[applyGarbageRows] Applied! Result has 1 garbage rows
📤 FORCE Synced board with 1 garbage rows to opponent
```

#### Step 4: Visual Check
- ✅ Player B sees GRAY ROW on own board (LEFT side)
- ✅ Player A sees GRAY ROW on opponent board (RIGHT side)

---

## ❌ Debug Scenarios:

### Scenario 1: Server log shows `lines: 0`
**Problem:** Client không gửi đúng số lines
**Check:**
- Client console có log `🔒 LOCK EVENT - Lines: X` không?
- Lines có = 0 không?
- lastPlacement.cleared có đúng không?

**Solution:**
- Check useStage.ts - sweepRows có đếm đúng không?
- Check Versus.tsx - lines có bị override không?

### Scenario 2: Server log shows `Calculated garbage: 0`
**Problem:** Logic tính garbage sai
**Check:**
- standardBase array: `[0, 0, 1, 2, 4]`
  - Lines 0: 0 garbage ✅
  - Lines 1: 0 garbage ✅
  - Lines 2: 1 garbage ✅
  - Lines 3: 2 garbage ✅
  - Lines 4: 4 garbage ✅

**Solution:**
- Check server console - base value trước khi cộng bonus
- Lines phải >= 2 mới có garbage (Single không có garbage)

### Scenario 3: Server log shows `⚠️ No garbage to send (g = 0)`
**Problem:** g = 0 nên không emit
**Check:**
- Lines có >= 2 không?
- Array index có đúng không?

### Scenario 4: Server không log gì cả
**Problem:** Event `game:lock` không được nhận
**Check:**
- roomId có đúng không?
- Socket connection có OK không?
- Room có started chưa?

### Scenario 5: Client không nhận `game:garbage`
**Problem:** Server emit nhưng client không listen
**Check:**
- Client console có log `🗑️ Received garbage` không?
- Socket.io connection có OK không?

---

## 🔬 Manual Test:

Nếu muốn test nhanh mà không cần setup 2 players, thêm button test:

### Thêm vào Versus.tsx (temporary):
```typescript
// TEST BUTTON - XÓA SAU KHI TEST XONG
{!waiting && countdown === null && (
  <button 
    onClick={() => {
      console.log('🧪 TEST: Sending test garbage');
      socket.emit('game:lock', roomId, { lines: 2, tspinType: 'none', pc: false });
    }}
    style={{
      position: 'fixed',
      top: 10,
      right: 10,
      zIndex: 9999,
      padding: '10px 20px',
      background: '#ff6b6b',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontWeight: 'bold'
    }}
  >
    TEST GARBAGE
  </button>
)}
```

Click button và check server console!

---

## 📊 Expected Values:

| Lines Cleared | Base Garbage | With Combo 2 | With B2B |
|--------------|-------------|-------------|----------|
| 0 (lock only) | 0 | 0 | 0 |
| 1 (Single) | 0 | 1 | 1 |
| 2 (Double) | 1 | 2 | 2 |
| 3 (Triple) | 2 | 3 | 3 |
| 4 (Tetris) | 4 | 5 | 5 |
| T-Spin Single | 2 | 3 | 3 |
| T-Spin Double | 4 | 5 | 5 |

---

## ✅ Success Criteria:

- [ ] Server log shows **correct lines value** (not 0)
- [ ] Server log shows **garbage > 0** when clearing 2+ lines
- [ ] Server log shows **✅ Sending X garbage**
- [ ] Client B log shows **🗑️ Received garbage**
- [ ] Client B log shows **[applyGarbageRows] Applied!**
- [ ] **Visual: GRAY ROWS appear** on both screens

---

## 🚨 Common Mistakes:

1. **Clearing only 1 line (Single)** → 0 garbage (này là ĐÚNG!)
2. **Lock piece without clearing** → 0 garbage (này cũng ĐÚNG!)
3. **Not locking piece after receiving garbage** → Garbage chưa apply (phải lock piece mới thấy)
4. **Looking at wrong board** → Check LEFT board (your own) khi bạn nhận garbage

---

Test ngay và paste kết quả console logs! 🎯
