# 🔧 FIX: setHasConfirmed Error + Cache Issue

## ❌ **LỖI:**
```
Uncaught ReferenceError: setHasConfirmed is not defined
```

## ✅ **NGUYÊN NHÂN:**

1. **Browser đang cache file cũ** (MatchmakingUI.tsx cũ còn `setHasConfirmed`)
2. Client cần **hard refresh** để load code mới
3. Vite dev server có thể cần restart

---

## 🚀 **GIẢI PHÁP NHANH:**

### **Bước 1: Hard Refresh Browser**

**Chrome/Edge:**
```
Ctrl + Shift + R
hoặc
Ctrl + F5
```

**Firefox:**
```
Ctrl + Shift + Delete → Clear cache → Reload
```

### **Bước 2: Clear Vite Cache**

```powershell
# Stop client server (Ctrl+C)

# Xóa cache
cd client
Remove-Item -Recurse -Force .vite
Remove-Item -Recurse -Force node_modules/.vite

# Restart
npm run dev
```

### **Bước 3: Force Reload trong Browser**

1. Mở DevTools (F12)
2. Right-click nút Reload
3. Chọn **"Empty Cache and Hard Reload"**

---

## 📋 **VERIFY CODE ĐÃ ĐÚNG:**

### ✅ **client/src/components/MatchmakingUI.tsx:**

```typescript
// ✅ KHÔNG có useState hasConfirmed
const MatchmakingUI: React.FC<MatchmakingUIProps> = ({ mode, onCancel }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<MatchmakingStatus>('searching');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [confirmTimeout, setConfirmTimeout] = useState(10);
  const [matchData, setMatchData] = useState<any>(null);
  const [penaltyTime, setPenaltyTime] = useState(0);
  // ❌ KHÔNG có: const [hasConfirmed, setHasConfirmed] = useState(false);

  // ✅ handleConfirm KHÔNG dùng setHasConfirmed
  const handleConfirm = () => {
    console.log('✅ [Matchmaking] User confirmed match');
    socket.emit('matchmaking:confirm-accept', { matchId: matchData?.matchId });
    // Status will be set by 'matchmaking:waiting' event from server
  };
```

### ✅ **server/src/matchmaking.ts:**

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

  // ✅ EMIT 'matchmaking:waiting' event
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

---

## 🧪 **TEST SAU KHI CLEAR CACHE:**

### **Bước 1: Restart All Services**

```powershell
# Terminal 1 - Redis
redis-server

# Terminal 2 - Server (restart nếu đang chạy)
cd server
npm run dev

# Terminal 3 - Client (RESTART + clear cache)
cd client
Remove-Item -Recurse -Force .vite
npm run dev
```

### **Bước 2: Test trong Browser**

1. **Hard refresh:** `Ctrl + Shift + R`
2. **Clear cache:** DevTools → Application → Clear storage
3. **Reload page**
4. Login → Matchmaking
5. Click "Chấp nhận"

### **Bước 3: Expected Results**

**Browser Console:**
```
✅ [Matchmaking] User confirmed match
```

**Server Console:**
```
✅ [Matchmaking] User1 đã chấp nhận match xxx
   Confirmed: 1/2
   ⏳ Đang chờ đối thủ...
```

**UI Should Show:**
```
╔═══════════════════════════════════════╗
║        ✅ ĐÃ XÁC NHẬN                ║
║                                       ║
║         ⭕ [Spinner]                  ║
║                                       ║
║  🕐 ĐANG CHỜ ĐỐI THỦ XÁC NHẬN...    ║
║                                       ║
║  Đối thủ: test2                      ║
║  ⏱️ Thời gian còn lại: 8s            ║
╚═══════════════════════════════════════╝
```

---

## 🐛 **TROUBLESHOOTING:**

### **Vẫn lỗi `setHasConfirmed`:**

```powershell
# 1. Stop client server
# 2. Delete all cache
cd client
Remove-Item -Recurse -Force .vite
Remove-Item -Recurse -Force node_modules/.vite
Remove-Item -Recurse -Force dist

# 3. Restart
npm run dev

# 4. Browser: Ctrl + Shift + Delete → Clear all → Reload
```

### **UI không hiển thị "ĐÃ XÁC NHẬN":**

1. Check browser console:
   ```javascript
   // Should see:
   ✅ [Matchmaking] User confirmed match
   ⏳ [Matchmaking] Waiting for opponent: Đang chờ đối thủ chấp nhận...
   ```

2. Check network tab:
   - Socket event `matchmaking:waiting` received?

3. Check React DevTools:
   - `status` state changed to `'waiting'`?

### **Server không emit `matchmaking:waiting`:**

Check server log khi click "Chấp nhận":
```
✅ [Matchmaking] User1 đã chấp nhận match xxx
   Confirmed: 1/2
   ⏳ Đang chờ đối thủ...  ← MUST SEE THIS
```

Nếu không thấy → Server code chưa đúng, check lại `handleConfirmAccept()`

---

## 📝 **CHECKLIST:**

- [ ] Server restart xong
- [ ] Client `.vite` cache đã xóa
- [ ] Client restart xong
- [ ] Browser hard refresh (Ctrl+Shift+R)
- [ ] Browser cache cleared (DevTools)
- [ ] Test matchmaking
- [ ] Click "Chấp nhận"
- [ ] UI shows "✅ ĐÃ XÁC NHẬN"
- [ ] Spinner spinning
- [ ] Message "ĐANG CHỜ ĐỐI THỦ"
- [ ] Countdown running

---

## 🎯 **QUICK FIX SCRIPT:**

```powershell
# Save this as: fix-cache.ps1

Write-Host "🔧 Fixing cache issues..." -ForegroundColor Cyan

# Kill processes
Write-Host "Stopping servers..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force

# Clear client cache
Write-Host "Clearing client cache..." -ForegroundColor Yellow
cd client
Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

Write-Host "✅ Cache cleared!" -ForegroundColor Green
Write-Host ""
Write-Host "Now run:" -ForegroundColor Yellow
Write-Host "  1. cd server && npm run dev" -ForegroundColor White
Write-Host "  2. cd client && npm run dev" -ForegroundColor White
Write-Host "  3. Browser: Ctrl+Shift+R" -ForegroundColor White
```

---

**RUN:**
```powershell
.\fix-cache.ps1
```

Then restart services and hard refresh browser!
