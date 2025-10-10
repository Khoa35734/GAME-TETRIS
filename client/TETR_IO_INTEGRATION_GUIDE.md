# 🎮 TETR.IO Mechanics Integration Guide

## ✅ Đã hoàn thành

1. **Created `srsRotation.ts`** - SRS Wall Kick system
   - Wall Kick tables cho tất cả pieces (JLSTZ và I)
   - Floor Kick (nâng lên để xoay)
   - 180° Rotation support
   - Functions: `tryRotate()`, `tryRotateWithKick()`, `tryFloorKick()`

2. **Created `inputSystem.ts`** - Input management
   - DAS/ARR system
   - IRS/IHS (Initial Rotation/Hold System)
   - Lock Delay with infinite spin
   - ARE (Entry Delay) system

## 🔧 Cần tích hợp vào Versus.tsx

### Bước 1: Thêm State cho SRS/TETR.IO mechanics

Thêm vào phần state declarations (sau dòng ~110):

```typescript
// ========================================
// 🎮 SRS/TETR.IO MECHANIC STATES
// ========================================

// Rotation state (0-3 for SRS)
const [rotationState, setRotationState] = useState<0 | 1 | 2 | 3>(0);

// DAS/ARR state
const [dasState, setDasState] = useState<DASState>(createDASState());
const dasStateRef = useRef<DASState>(createDASState());

// IRS/IHS state (for next spawn)
const [irsihsState, setIRSIHSState] = useState<IRSIHSState>(createIRSIHSState());

// Lock delay state (thay thế logic cũ)
const [lockDelayState, setLockDelayState] = useState<LockDelayState>(
  createLockDelayState(MAX_LOCK_RESETS)
);

// ARE state
const [areState, setAREState] = useState<AREState>(createAREState());

// Track last player position for move detection
const lastPlayerPosRef = useRef<{ x: number; y: number; rotation: number }>({ 
  x: 0, 
  y: 0, 
  rotation: 0 
});
```

### Bước 2: Thay thế hàm `playerRotate`

Tìm hàm `playerRotate` hiện tại (dòng ~680) và thay bằng:

```typescript
// ========================================
// 🎮 SRS ROTATION WITH WALL KICK
// ========================================
const playerRotateSRS = useCallback((direction: 1 | -1 | 2) => {
  if (gameOver || countdown !== null || locking || isApplyingGarbage) return;
  if (player.type === 'O') return; // O doesn't rotate

  // Try rotation with SRS wall kick
  const result = tryRotate(
    { ...player, type: player.type, rotationState },
    stage,
    direction,
    rotationState
  );

  if (result.success) {
    // Update player với matrix và vị trí mới
    updatePlayerPos({
      x: result.newX - player.pos.x,
      y: result.newY - player.pos.y,
      collided: false,
    });
    
    // Update rotation state
    setRotationState(result.newRotationState);
    
    // Set player matrix (cần thêm hàm setPlayerMatrix vào usePlayer hook)
    setPlayer(prev => ({
      ...prev,
      tetromino: result.newMatrix,
      pos: { x: result.newX, y: result.newY },
    }));

    console.log(`🔄 Rotated ${direction === 1 ? 'CW' : direction === -1 ? 'CCW' : '180°'} (kick ${result.kickIndex})`);
  }
}, [player, stage, rotationState, gameOver, countdown, locking, isApplyingGarbage]);
```

### Bước 3: Cập nhật `handleKeyDown`

Tìm hàm `handleKeyDown` và thêm xử lý rotation keys:

```typescript
// Trong handleKeyDown, thay thế phần xoay:

// Rotation keys
if (keyCode === 38 || keyCode === 88) {
  // Up arrow or X - Rotate CW
  playerRotateSRS(1);
  setIRSIHSState(prev => ({ ...prev, rotationIntent: 1 }));
} else if (keyCode === 90 || keyCode === 17) {
  // Z or Ctrl - Rotate CCW  
  playerRotateSRS(-1);
  setIRSIHSState(prev => ({ ...prev, rotationIntent: -1 }));
} else if (ENABLE_180_ROTATION && keyCode === 65) {
  // A - Rotate 180°
  playerRotateSRS(2);
  setIRSIHSState(prev => ({ ...prev, rotationIntent: 2 }));
}

// Hold key
if (keyCode === 67 || keyCode === 16) {
  // C or Shift - Hold
  if (!hasHeld && canHold) {
    holdSwap();
    setHasHeld(true);
    setRotationState(0); // Reset rotation state on hold
  }
  setIRSIHSState(prev => ({ ...prev, holdIntent: true }));
}

// Movement keys - update DAS state
if (keyCode === 37 || keyCode === 39) {
  const dir = keyCode === 37 ? -1 : 1;
  const newDasState = updateDAS(dasState, dir, Date.now(), DAS_DELAY);
  setDasState(newDasState);
  dasStateRef.current = newDasState;
  
  // Immediate move on first press
  if (!moveIntent || moveIntent.dir !== dir) {
    movePlayer(dir);
  }
}
```

### Bước 4: Thêm Lock Delay Logic

Thay thế logic lock delay cũ (dòng ~750-850) bằng:

```typescript
// ========================================
// 🎮 LOCK DELAY UPDATE (replaces old dual-timer logic)
// ========================================
useEffect(() => {
  if (gameOver || countdown !== null || player.collided) return;

  // Check if grounded
  const isGrounded = checkCollision(player, stage, { x: 0, y: 1 });
  
  // Check if moved
  const hasMoved = 
    lastPlayerPosRef.current.x !== player.pos.x ||
    lastPlayerPosRef.current.y !== player.pos.y ||
    lastPlayerPosRef.current.rotation !== rotationState;
  
  // Update last position
  lastPlayerPosRef.current = {
    x: player.pos.x,
    y: player.pos.y,
    rotation: rotationState,
  };

  // Update lock delay
  const { newState, shouldLock } = updateLockDelay(
    lockDelayState,
    isGrounded,
    hasMoved,
    LOCK_DELAY
  );

  setLockDelayState(newState);

  if (shouldLock) {
    // Lock piece
    console.log('🔒 Lock delay expired - locking piece');
    doLock();
  }
}, [player, stage, rotationState, lockDelayState, gameOver, countdown]);

// Timer tick for lock delay
useInterval(() => {
  if (lockDelayState.isGrounded && !gameOver && countdown === null) {
    setLockDelayState(prev => tickLockDelay(prev, 16)); // ~60 FPS
  }
}, 16);
```

### Bước 5: Thêm IRS/IHS Support

Trong hàm `resetPlayer` (spawn new piece), thêm:

```typescript
const resetPlayer = useCallback(() => {
  // Check IRS/IHS intent
  const intent = getSpawnIntent(irsihsState);
  
  if (intent.shouldHold && canHold && !hasHeld) {
    // IHS - Hold immediately on spawn
    holdSwap();
    setHasHeld(true);
  } else {
    // Spawn normal
    resetPlayerOriginal(); // Call original reset
    
    // Apply IRS if needed
    if (intent.shouldRotate && intent.rotationDirection !== null) {
      setTimeout(() => {
        playerRotateSRS(intent.rotationDirection as 1 | -1 | 2);
      }, 10);
    }
  }
  
  // Clear IRS/IHS intent
  setIRSIHSState(createIRSIHSState());
  setRotationState(0);
}, [irsihsState, canHold, hasHeld]);
```

### Bước 6: Thêm ARE Support

Trong phần piece lock (doLock function):

```typescript
const doLock = () => {
  // ... existing lock logic ...
  
  // Start ARE delay
  setAREState(startARE(ARE_DELAY));
};

// ARE timer
useInterval(() => {
  if (areState.isActive) {
    const { newState, isFinished } = updateARE(areState, 16);
    setAREState(newState);
    
    if (isFinished) {
      // Spawn next piece
      resetPlayer();
    }
  }
}, 16);
```

### Bước 7: Cập nhật DAS/ARR Logic

Thay thế logic DAS/ARR cũ (dòng ~740):

```typescript
// ========================================
// 🎮 DAS/ARR UPDATE LOOP
// ========================================
useInterval(() => {
  if (gameOver || countdown !== null || locking || isApplyingGarbage) return;
  
  const currentTime = Date.now();
  const newDasState = updateDAS(
    dasStateRef.current,
    moveIntent?.dir || null,
    currentTime,
    DAS_DELAY
  );
  
  dasStateRef.current = newDasState;
  
  // Auto-repeat if charged
  if (newDasState.isCharged && newDasState.direction !== null) {
    if (ARR === 0) {
      // ARR = 0: Instant move to wall
      movePlayerToSide(newDasState.direction);
    } else {
      // ARR > 0: Move one cell per interval
      movePlayer(newDasState.direction);
    }
  }
}, ARR || 16);
```

## 📝 Testing Checklist

- [ ] Wall kick works (rotate near walls)
- [ ] Floor kick works (rotate when grounded)
- [ ] 180° rotation works (A key)
- [ ] Lock delay resets on movement (up to 15 times)
- [ ] DAS/ARR feels smooth
- [ ] IRS works (hold rotation key before spawn)
- [ ] IHS works (hold C before spawn)
- [ ] Piece doesn't lock mid-air
- [ ] Infinite spin protection works (max 15 resets)

## 🎯 Keybinds

- **Left/Right Arrow**: Move
- **Down Arrow**: Soft drop
- **Space**: Hard drop
- **Up Arrow / X**: Rotate CW (clockwise)
- **Z / Ctrl**: Rotate CCW (counter-clockwise)
- **A**: Rotate 180° (if enabled)
- **C / Shift**: Hold

## ⚙️ Tuning Parameters

Adjust these constants in Versus.tsx:

```typescript
const DAS_DELAY = 120;        // Lower = faster DAS
const ARR = 0;                // 0 = instant, 40 = moderate
const LOCK_DELAY = 500;       // Higher = more time to adjust
const MAX_LOCK_RESETS = 15;   // TETR.IO standard
const ARE_DELAY = 0;          // 0 = instant spawn (TETR.IO modern)
const ENABLE_180_ROTATION = true;
const ENABLE_FLOOR_KICK = true;
```

## 🐛 Known Issues & Notes

1. **usePlayer hook** might need modification to expose `setPlayer` directly
2. Old `locking` state might conflict - consider removing old lock logic entirely
3. Test multiplayer sync - rotation state should sync to opponent
4. Ghost piece might need recalculation after SRS rotation

## 📚 References

- [TETR.IO Mechanics](https://tetr.io/about/mechanics/)
- [SRS Guideline](https://tetris.wiki/Super_Rotation_System)
- [Hard Drop Wiki - Wall Kicks](https://harddrop.com/wiki/SRS)
