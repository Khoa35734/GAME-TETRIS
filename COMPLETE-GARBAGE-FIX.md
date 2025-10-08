# 🔥 GARBAGE SYSTEM - COMPLETE FIX

## ✅ Files đã sửa:

### 1. **server/src/index.ts**
- ✅ Thêm console logs để debug garbage calculation
- ✅ Log khi nhận `game:lock` event
- ✅ Log garbage calculation details (base + b2b + combo)
- ✅ Log khi emit `game:garbage` to opponent
- ✅ Chỉ emit garbage khi g > 0 (tránh spam)

### 2. **client/src/components/Versus.tsx**
- ✅ Thêm debug logs cho toàn bộ garbage flow
- ✅ `applyGarbageRows`: Log khi apply và count garbage rows
- ✅ `onGarbage`: Log khi nhận garbage từ server
- ✅ Lock handler: Log pending, offset, apply
- ✅ Force emit `game:state` SAU KHI apply garbage (với setTimeout)
- ✅ Normal sync: Throttle (100ms), check stage changed, skip khi gameOver/countdown
- ✅ `onGameState`: Log số garbage rows trong received board

### 3. **client/src/components/Cell.tsx**
- ✅ Thêm check cho `type === 'garbage'` để render đúng

### 4. **client/src/components/tetrominos.ts**
- ✅ Garbage color: `100, 100, 100` (xám đậm)

### 5. **client/src/components/styles/StyledCell.tsx**
- ✅ Garbage alpha: 0.95 (đậm hơn)
- ✅ Garbage border: 2px solid dark gray
- ✅ Special styling cho garbage

---

## 🎯 Key Changes:

### Problem 1: Board sync trước khi garbage apply
**Solution**: 
- Force emit `game:state` với `updatedStage` ngay sau `applyGarbageRows`
- Dùng `setTimeout(, 0)` để defer emission sau state update
- Normal sync được throttle và check stage changed

### Problem 2: Không thấy garbage trên opponent board
**Solution**:
- Emit board với UPDATED stage (có garbage)
- Log để verify garbage rows trong sent/received board
- Opponent nhận và hiển thị đúng

### Problem 3: Không thấy garbage trên own board
**Solution**:
- `applyGarbageRows` update stage qua `setStage`
- Stage mới được render tự động
- Log để verify apply thành công

---

## 🔍 How to Debug:

### 1. Start Server
```bash
cd server
npm run dev
```

### 2. Start Client (2 windows)
```bash
cd client
npm run dev -- --host
```

### 3. Open Console (F12) for BOTH players

### 4. Test Flow:
1. **Player A**: Clear 2 lines (Double)
2. **Check Player A console**:
   ```
   🔒 Lock piece - Pending garbage: 0 Lines cleared: 2
   ```

3. **Check Server console**:
   ```
   [GARBAGE] Player XXX locked piece: 2 lines...
   [GARBAGE] Calculated garbage: 1 (base + b2b:0 + combo:0)
   [GARBAGE] Sending 1 garbage to player YYY
   ```

4. **Check Player B console**:
   ```
   🗑️ Received garbage: 1 lines. Accumulating to pending
   ```

5. **Player B**: Lock next piece

6. **Check Player B console**:
   ```
   🔒 Lock piece - Pending garbage: 1 Lines cleared: 0
   [applyGarbageRows] Applying 1 garbage rows...
   [applyGarbageRows] Applied! Result has 1 garbage rows
   📤 FORCE Synced board with 1 garbage rows to opponent
   📤 Normal sync - Stage has 1 garbage rows
   ```

7. **Check Player A console**:
   ```
   📥 Received opponent board - Garbage rows: 1
   ```

8. **Visual Check**:
   - ✅ Player B sees 1 GRAY ROW on own board (LEFT side)
   - ✅ Player A sees 1 GRAY ROW on opponent board (RIGHT side)

---

## 🎨 Expected Visual:

### Garbage Row:
- **Color**: Dark gray `rgb(100, 100, 100)` with alpha 0.95
- **Border**: 2px solid `rgba(60, 60, 60, 0.8)`
- **Shape**: Full row with 1 random hole (empty cell)
- **Position**: At bottom of board (pushed up from bottom)

### On Your Board (Player who receives garbage):
```
┌──────────┐
│          │ ← Top (buffer zone)
│          │
│   T      │ ← Your pieces
│   TTT    │
│ IIIII    │ ← Locked pieces
│▓▓▓▓▓ ▓▓▓▓│ ← GARBAGE ROW (gray with 1 hole)
└──────────┘
```

### On Opponent Board (seen by other player):
```
Right side should show same gray row
```

---

## ❌ Troubleshooting:

### Không có log nào?
- ❌ Server chưa chạy
- ❌ Client chưa connect
- ❌ Console filter đang bật

### Có log server nhưng không có log client?
- ❌ Socket không connect
- ❌ Room ID sai
- ❌ Player không alive

### Có log `🗑️ Received` nhưng không apply?
- ❌ Chưa lock piece tiếp theo
- ❌ Pending = 0 (bị reset)

### Có log `[applyGarbageRows]` nhưng không sync?
- ❌ updatedStage = null
- ❌ roomId = null

### Có log `📤 FORCE Synced` nhưng opponent không nhận?
- ❌ Network issue
- ❌ Opponent socket disconnect

### Nhận board nhưng garbage = 0?
- ❌ Normal sync ghi đè force sync
- ❌ Timing issue
- ❌ Stage chưa update khi emit

---

## ✅ Success Checklist:

- [ ] Server logs show garbage calculation
- [ ] Player B console: `🗑️ Received garbage`
- [ ] Player B console: `[applyGarbageRows] Applied!`
- [ ] Player B console: `📤 FORCE Synced`
- [ ] Player A console: `📥 Received opponent board - Garbage rows: X`
- [ ] Player B sees gray rows on LEFT board
- [ ] Player A sees gray rows on RIGHT board (opponent)
- [ ] Gray rows have correct color/border
- [ ] Garbage offset works (clear lines reduce incoming)

---

## 🚀 Test Now:

1. **Clean restart**: Close all terminals
2. **Start server**: `cd server && npm run dev`
3. **Start client**: `cd client && npm run dev -- --host`
4. **Open 2 browsers**: Regular + Incognito
5. **Both enter Ranked**: Wait for match
6. **Player A: Clear lines**
7. **Player B: Lock piece**
8. **Check consoles**: Follow debug flow above
9. **Check visuals**: Gray rows should appear

---

## 📊 Test Matrix:

| Clear Type | Lines | Expected Garbage | Should See |
|-----------|-------|------------------|------------|
| Single | 1 | 0 | Nothing |
| Double | 2 | 1 | 1 gray row |
| Triple | 3 | 2 | 2 gray rows |
| Tetris | 4 | 4 | 4 gray rows |
| T-Spin S | 1 | 2 | 2 gray rows |
| T-Spin D | 2 | 4 | 4 gray rows |

---

**If still not working after all this, check:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear Vite cache: Delete `client/.vite-cache-dev`
3. Restart everything
4. Check file actually saved
5. Check no TypeScript errors

Good luck! 🍀
