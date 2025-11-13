# ✅ Rank Result Overlay - Chỉ cho Ranked Matches

## 🎯 Mục Đích
Đảm bảo overlay ELO animation chỉ hiển thị cho trận **ranked**, không hiển thị cho trận **casual**.

## 🔧 Các Thay Đổi

### 1. **Client State Management**
#### `useVersus.ts`
```typescript
// Thêm state để track match mode
const [matchMode, setMatchMode] = useState<'ranked' | 'casual'>('casual');

// Export matchMode để component sử dụng
return {
  // ...
  matchMode, // ⭐ Match mode (ranked or casual)
  eloData,   // ⭐ ELO data (chỉ có khi ranked)
}
```

### 2. **Socket Event Handling**
#### `useSocketEvents.ts`
```typescript
// Thêm setter vào props
type SocketEventProps = {
  // ...
  setMatchMode: (mode: 'ranked' | 'casual') => void;
}

// Lắng nghe event bo3:match-start và set mode
const onBo3MatchStartLegacy = (payload: any) => {
  if (payload?.mode) {
    setMatchMode(payload.mode);
    console.log('[DEBUG] 🏆 Match mode:', payload.mode);
  }
  // ...
}
```

### 3. **Component Logic**
#### `Versus.tsx`
```typescript
// Nhận matchMode từ hook
const { matchMode, eloData, matchResult, ... } = useVersus(urlRoomId);

// RANKED MATCH - Show ELO overlay
{matchResult && eloData && matchMode === 'ranked' && (
  <RankResultOverlay {...props} />
)}

// CASUAL MATCH - Show simple overlay (no ELO)
{matchResult && matchMode === 'casual' && (
  <SimpleResultOverlay />
)}
```

## 🎨 UI Behavior

### Ranked Match (mode === 'ranked'):
✅ Hiển thị `RankResultOverlay` với:
- Animation ELO từ old → new
- Hiệu ứng ▲/▼ màu xanh/đỏ
- ELO change (+120 hoặc -65)
- Stats comparison
- Professional design

### Casual Match (mode === 'casual'):
✅ Hiển thị overlay đơn giản với:
- Kết quả thắng/thua
- Tỷ số trận
- Text: "Chế độ: Casual (Không tính ELO)"
- Nút về menu
- Không có ELO info

### Fallback:
⏳ Nếu `matchMode === 'ranked'` nhưng chưa nhận `eloData`:
- Hiển thị "Đang tính toán ELO..."

## 📊 Flow Diagram

```
Match End
    ↓
Check matchMode
    ↓
    ├─── ranked ─────→ Wait for elo:updated
    │                       ↓
    │                  Show RankResultOverlay
    │                  (with ELO animation)
    │
    └─── casual ─────→ Show SimpleOverlay
                       (no ELO, just result)
```

## 🔍 Server-side (Already Working)

Server đã emit `mode` trong event:

```typescript
// bo3MatchManager.ts
this.io.to(roomId).emit('bo3:match-start', {
  matchId,
  mode,              // ⭐ 'ranked' or 'casual'
  currentGame: 1,
  score: match.score,
  // ...
});

// Chỉ update ELO khi mode === 'ranked'
if (match.mode === 'ranked') {
  const eloResult = await updateEloAfterMatch(...);
  this.io.to(match.roomId).emit('elo:updated', eloResult);
}
```

## ✅ Kiểm Tra

### Test Case 1: Ranked Match
1. Vào chế độ **Ranked** (matchmaking)
2. Chơi đến khi kết thúc
3. ✅ Phải thấy overlay với animation ELO
4. ✅ Phải thấy ▲ hoặc ▼ với số thay đổi

### Test Case 2: Casual Match
1. Vào chế độ **Casual** (custom room)
2. Chơi đến khi kết thúc
3. ✅ Phải thấy overlay đơn giản
4. ✅ Không có ELO info
5. ✅ Có text "Chế độ: Casual"

### Test Case 3: Mixed
1. Chơi 1 trận Ranked → xem ELO overlay
2. Chơi 1 trận Casual → xem simple overlay
3. ✅ Hai overlay khác nhau

## 🐛 Edge Cases Handled

| Case | Condition | Behavior |
|------|-----------|----------|
| Ranked match finished | `matchMode === 'ranked' && matchResult && eloData` | Show RankResultOverlay ✅ |
| Ranked, ELO pending | `matchMode === 'ranked' && matchResult && !eloData` | Show "Đang tính ELO..." ⏳ |
| Casual match finished | `matchMode === 'casual' && matchResult` | Show SimpleOverlay (no ELO) ✅ |
| Mode not set yet | `matchMode === null` | Default to 'casual' ✅ |

## 📝 Files Changed

### Modified:
1. `client/src/components/multiplayer/hooks/useVersus.ts`
   - Added `matchMode` state
   - Export `matchMode`

2. `client/src/components/multiplayer/hooks/useSocketEvents.ts`
   - Added `setMatchMode` to props
   - Listen to `mode` from `bo3:match-start`

3. `client/src/components/multiplayer/Versus.tsx`
   - Conditional rendering based on `matchMode`
   - Added simple overlay for casual matches

### Created:
- `docs/RANK_OVERLAY_MODE_CHECK.md` (this file)

## 🚀 Benefits

✅ **Clear Separation**: Ranked có ELO, Casual không có
✅ **Better UX**: User biết rõ họ đang chơi mode nào
✅ **Performance**: Không tính ELO cho casual (server already does this)
✅ **Scalability**: Dễ thêm mode mới (e.g., tournament, practice)

---
**Author**: GitHub Copilot  
**Date**: 2025-01-11  
**Version**: 1.1
