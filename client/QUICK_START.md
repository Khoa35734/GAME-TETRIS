# 🚀 Quick Integration Summary

## ✅ Đã tạo 3 file mới:

1. **`srsRotation.ts`** - SRS rotation logic với wall kick và floor kick
2. **`inputSystem.ts`** - DAS/ARR, Lock Delay, IRS/IHS, ARE management
3. **`TETR_IO_INTEGRATION_GUIDE.md`** - Hướng dẫn chi tiết

## 🎯 Tích hợp nhanh vào Versus.tsx

### Option 1: Minimal Integration (Chỉ SRS Rotation)

Thay thế function `playerRotate` hiện tại bằng:

```typescript
import { tryRotate } from '../srsRotation';

// Thêm state
const [rotationState, setRotationState] = useState<0 | 1 | 2 | 3>(0);

// Thay thế playerRotate
const playerRotateSRS = useCallback((direction: 1 | -1) => {
  if (gameOver || countdown !== null || isApplyingGarbage) return;
  if (player.type === 'O') return;

  const result = tryRotate(
    { ...player, type: player.type, rotationState },
    stage,
    direction,
    rotationState
  );

  if (result.success) {
    updatePlayerPos({
      x: result.newX - player.pos.x,
      y: result.newY - player.pos.y,
      collided: false,
    });
    setRotationState(result.newRotationState);
    
    // Cần update tetromino matrix
    setPlayer(prev => ({
      ...prev,
      tetromino: result.newMatrix,
      pos: { x: result.newX, y: result.newY },
    }));
  }
}, [player, stage, rotationState]);

// Trong handleKeyDown, thay:
// playerRotate(stage, 1)
// Bằng:
// playerRotateSRS(1)
```

### Option 2: Full TETR.IO Experience

Đọc file `TETR_IO_INTEGRATION_GUIDE.md` để tích hợp đầy đủ:
- SRS Rotation với Wall Kick + Floor Kick
- 180° Rotation (phím A)
- Lock Delay với Infinite Spin (15 resets)
- DAS/ARR mượt mà
- IRS/IHS support
- ARE delay

## 🔑 Key Points

1. **usePlayer hook cần expose `setPlayer`** để update tetromino matrix sau rotate
2. **Rotation state** (0-3) cần được track riêng
3. **Lock delay** thay thế logic cũ với `inactivityTimeoutRef` và `capTimeoutRef`
4. **DAS/ARR** có state machine riêng thay vì `moveIntent`

## 🧪 Test nhanh

1. Xoay gần tường → Piece tự động kick ra
2. Xoay khi chạm đất → Piece nâng lên (floor kick)
3. Giữ left/right → DAS charge rồi ARR repeat
4. Chạm đất và xoay/di chuyển → Lock delay reset (tối đa 15 lần)

## ⚠️ Lưu ý

- Logic cũ trong Versus.tsx khá phức tạp với 1170 dòng
- Khuyến nghị test từng phần một
- Có thể disable một số tính năng bằng constants:
  ```typescript
  const ENABLE_180_ROTATION = false;
  const ENABLE_FLOOR_KICK = false;
  const ARE_DELAY = 0; // Instant spawn
  ```

## 📞 Cần hỗ trợ?

Nếu gặp lỗi, kiểm tra:
1. Import đúng types từ các file mới
2. Player object có đủ properties (type, rotationState)
3. usePlayer hook có expose `setPlayer` function
