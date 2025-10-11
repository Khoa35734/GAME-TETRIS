# 🐛 DEBUG GARBAGE FLOW - Complete Checklist

## 🎯 Flow hoàn chỉnh:

### **Player A** (Clear lines - SENDER):
```
1. Clear 2 lines (Double)
   └─> 🔒 Lock piece - Pending garbage: 0 Lines cleared: 2
   
2. Calculate garbage: base=1, combo=0, b2b=0 → total=1
   
3. Emit to server: game:lock { lines: 2, tspinType: 'none', pc: false }
   
4. Server receives and calculates:
   └─> [GARBAGE] Player XXXXX locked piece: 2 lines...
   └─> [GARBAGE] Calculated garbage: 1 (base + b2b:0 + combo:0)
   └─> [GARBAGE] Sending 1 garbage to player YYYYY
   
5. Stage update (NO garbage on Player A's own board)
   └─> 📤 Normal sync - Stage has 0 garbage rows
```

### **Player B** (Receive garbage - RECEIVER):
```
1. Receive from server: game:garbage(1)
   └─> 🗑️ Received garbage: 1 lines. Accumulating to pending
   └─> pendingGarbageLeft = 1
   
2. Continue playing... (garbage chưa apply)

3. Lock next piece:
   └─> 🔒 Lock piece - Pending garbage: 1 Lines cleared: 0
   └─> [applyGarbageRows] Applying 1 garbage rows...
   └─> [applyGarbageRows] Applied! Result has 1 garbage rows
   └─> 📤 FORCE Synced board with 1 garbage rows to opponent
   
4. Stage updated with garbage rows
   └─> 📤 Normal sync - Stage has 1 garbage rows
```

### **Player A** (See opponent's garbage):
```
1. Receive from Player B: game:state
   └─> 📥 Received opponent board - Garbage rows: 1
   └─> oppStage updated
   └─> UI shows opponent board with GRAY ROWS ✅
```

### **Player B** (See own garbage):
```
1. Own stage already has garbage (applied in step 3)
   └─> UI shows own board with GRAY ROWS ✅
```

---

## 🔍 Debug Steps:

### 1. Start Server with Logs
```bash
cd server
npm run dev
```

**Expected server logs when Player A clears 2 lines:**
```
[GARBAGE] Player <socketId> locked piece: 2 lines, tspinType: none, pc: false
[GARBAGE] Calculated garbage: 1 (base + b2b:0 + combo:0)
[GARBAGE] Sending 1 garbage to player <opponent_socketId>
```

### 2. Start Client with Console Open
```bash
cd client
npm run dev -- --host
```

**Open DevTools Console (F12) for BOTH players**

### 3. Test Flow

#### On Player A (Sender):
1. Clear 2 lines
2. Check console:
```
✅ 🔒 Lock piece - Pending garbage: 0 Lines cleared: 2
✅ 📤 Normal sync - Stage has 0 garbage rows
```

#### On Player B (Receiver):
1. After Player A clears, check console:
```
✅ 🗑️ Received garbage: 1 lines. Accumulating to pending
```

2. Lock next piece, check console:
```
✅ 🔒 Lock piece - Pending garbage: 1 Lines cleared: 0
✅ [applyGarbageRows] Applying 1 garbage rows...
✅ [applyGarbageRows] Applied! Result has 1 garbage rows
✅ 📤 FORCE Synced board with 1 garbage rows to opponent
✅ 📤 Normal sync - Stage has 1 garbage rows
```

3. Check your own board:
```
✅ Should see 1 GRAY ROW at bottom
```

#### Back on Player A:
1. Check console:
```
✅ 📥 Received opponent board - Garbage rows: 1
```

2. Check opponent's board (RIGHT side):
```
✅ Should see 1 GRAY ROW on opponent's board
```

---

## ❌ Common Issues & Solutions:

### Issue 1: Server không log gì
**Problem**: Server không nhận `game:lock` event
**Solution**: Check roomId có đúng không? Check socket connection

### Issue 2: Player B không nhận garbage
**Problem**: Console không có log `🗑️ Received garbage`
**Solution**: 
- Check server logs - có emit không?
- Check socket connection của Player B
- Check roomId có match không?

### Issue 3: Garbage không apply
**Problem**: Có log `🗑️ Received` nhưng không có `[applyGarbageRows]`
**Solution**: 
- Player B chưa lock piece tiếp theo
- Pending garbage = 0 (đã bị reset sai chỗ nào đó)

### Issue 4: Apply garbage nhưng không sync
**Problem**: Có log `[applyGarbageRows]` nhưng không có `📤 FORCE Synced`
**Solution**:
- updatedStage = null (applyGarbageRows failed)
- roomId = null

### Issue 5: Sync nhưng opponent không nhận
**Problem**: Player B có `📤 FORCE Synced` nhưng Player A không có `📥 Received`
**Solution**:
- Check network tab - có emit `game:state` không?
- Check Player A có listen `game:state` không?

### Issue 6: Nhận board nhưng không có garbage
**Problem**: `📥 Received opponent board - Garbage rows: 0`
**Solution**:
- Board bị ghi đè bởi sync thường (normal sync) TRƯỚC force sync
- Timing issue - cần check order của logs

---

## 🎨 Visual Check:

### Garbage cell phải có:
- **Background**: `rgba(100, 100, 100, 0.95)` - xám đậm
- **Border**: `2px solid rgba(60, 60, 60, 0.8)` - viền đậm
- **Shape**: Full row with 1 random hole
- **Position**: At bottom of board (pushed up from bottom)

### How to verify:
1. Open DevTools
2. Inspect element on gray cell
3. Check computed styles
4. Should see:
```css
background: rgba(100, 100, 100, 0.95);
border: 2px solid rgba(60, 60, 60, 0.8);
```

---

## 🔧 Emergency Debug Commands:

### In Browser Console (Player B after receiving garbage):

```javascript
// Check pending garbage
console.log('Pending:', pendingGarbageLeft);

// Check stage for garbage
console.log('Garbage rows:', stage.filter(row => 
  row.some(cell => cell[0] === 'garbage')
).length);

// Check opponent stage
console.log('Opponent garbage rows:', oppStage.filter(row => 
  row.some(cell => cell[0] === 'garbage')
).length);
```

---

## ✅ Success Criteria:

- [ ] Server logs show correct garbage calculation
- [ ] Player B console shows `🗑️ Received garbage`
- [ ] Player B console shows `[applyGarbageRows] Applied!`
- [ ] Player B console shows `📤 FORCE Synced`
- [ ] Player A console shows `📥 Received opponent board - Garbage rows: X`
- [ ] Player B sees gray rows on own board
- [ ] Player A sees gray rows on opponent's board (RIGHT side)
- [ ] Gray rows have correct color (dark gray)
- [ ] Gray rows have thick border

---

## 📊 Test Matrix:

| Test | Player A Action | Expected Garbage | Player B Sees | Player A Sees Opponent |
|------|----------------|------------------|---------------|----------------------|
| 1 | Clear Single (1) | 0 | Nothing | Nothing |
| 2 | Clear Double (2) | 1 | 1 gray row | 1 gray row |
| 3 | Clear Triple (3) | 2 | 2 gray rows | 2 gray rows |
| 4 | Clear Tetris (4) | 4 | 4 gray rows | 4 gray rows |
| 5 | T-Spin Single | 2 | 2 gray rows | 2 gray rows |
| 6 | T-Spin Double | 4 | 4 gray rows | 4 gray rows |
| 7 | Perfect Clear | 10 | 10 gray rows | 10 gray rows |

---

## 🚨 If Nothing Works:

1. **Clear browser cache** and reload
2. **Restart server** completely
3. **Check file saved** - Versus.tsx changes applied?
4. **Check build** - Vite hot reload working?
5. **Hard refresh** - Ctrl+Shift+R or Cmd+Shift+R
6. **Check console errors** - Any React errors?
7. **Test in incognito** - Browser extension issue?

---

Good luck! 🍀
