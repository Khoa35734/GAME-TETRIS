# Transparent Board & Minecraft Texture Update

## 📋 Summary
Updated both Single Player and Multiplayer (Versus) game boards to have transparent backgrounds with Minecraft-style texture blocks.

## ✅ Changes Made

### 1. **StyledStage.tsx** - Transparent Board Background
**File:** `client/src/components/styles/StyledStage.tsx`

**Before:**
```typescript
background: linear-gradient(
  to bottom,
  rgba(0,0,0,0) 0,
  rgba(0,0,0,0) calc(var(--cell) * 3 + 2px),
  #111 calc(var(--cell) * 3 + 2px),
  #111 100%
);
box-shadow: inset 0 -2px 0 #333;
```

**After:**
```typescript
background: transparent;
box-shadow: inset 0 -2px 0 rgba(255, 255, 255, 0.1);
```

**Changes:**
- ✅ Board background now fully transparent
- ✅ Borders changed from solid dark (#333) to subtle transparent (rgba)
- ✅ Side borders now cover full height (removed top offset)
- ✅ Allows background image/gradient to show through

---

### 2. **Versus.tsx** - Transparent Board Containers
**File:** `client/src/components/Versus.tsx`

**Player Board (Left - Green Border):**
```typescript
// Before
background: 'rgba(78, 205, 196, 0.05)'

// After
background: 'transparent'
```

**Opponent Board (Right - Red Border):**
```typescript
// Before
background: 'rgba(255, 107, 107, 0.05)'

// After
background: 'transparent'
```

**Changes:**
- ✅ Both player and opponent board containers now transparent
- ✅ Keeps colored borders (green for player, red for opponent)
- ✅ Keeps glow effects (box-shadow)

---

### 3. **Texture System** (Already Applied)
**Files:**
- `client/src/components/textureUtils.ts` - Texture mapping utility
- `client/src/components/styles/StyledCell.tsx` - Cell rendering with textures
- `client/src/components/HoldDisplay.tsx` - Hold piece with textures
- `client/src/components/MinoPreview.tsx` - Next queue with textures

**Texture Mapping:**
```typescript
I (Cyan)    → diamond.webp  (Kim cương - xanh)
J (Blue)    → lapis.jpg     (Lapis - xanh đậm)
L (Orange)  → gold.webp     (Vàng)
O (Yellow)  → iron.jpg      (Sắt - xám sáng)
S (Green)   → emeral.jpg    (Ngọc lục bảo)
T (Purple)  → redstone.webp (Đá đỏ)
Z (Red)     → redstone.webp (Đá đỏ)
```

**Features:**
- ✅ `background-image` with `background-size: cover`
- ✅ Inset box-shadow for 3D depth effect
- ✅ Darker borders (rgba(0,0,0,0.4)) for contrast
- ✅ Applied to ALL game modes (Single, Multi, Hold, Next)

---

## 🎮 Affected Components

### Single Player (Tetris.tsx)
- Uses `<Stage stage={stage} />`
- Stage uses `Cell` component with texture
- ✅ Transparent board background
- ✅ Minecraft textures applied

### Multiplayer (Versus.tsx)
- Uses `<Stage stage={stage} />` for player board
- Uses `<Stage stage={oppStage} />` for opponent board
- ✅ Transparent board containers
- ✅ Minecraft textures applied to both boards
- ✅ Colored borders maintained (green/red)

### Hold & Next Queue
- Uses `textureUtils.ts` helper functions
- ✅ Consistent texture mapping across all displays

---

## 🎨 Visual Result

**Before:**
- Dark opaque board background (#111)
- Solid color blocks (rgba)
- Dark borders (#333)

**After:**
- ✅ Transparent board background
- ✅ Minecraft-style texture blocks (diamond, gold, iron, etc.)
- ✅ Subtle transparent borders (rgba(255,255,255,0.1))
- ✅ 3D depth with inset shadows
- ✅ Background visible through board

---

## 📁 Files Modified

1. `client/src/components/styles/StyledStage.tsx` - Board styling
2. `client/src/components/Versus.tsx` - Multiplayer board containers
3. `client/src/components/styles/StyledCell.tsx` - Already updated with textures
4. `client/src/components/textureUtils.ts` - Already created with texture mapping
5. `client/src/components/HoldDisplay.tsx` - Already updated with textures
6. `client/src/components/MinoPreview.tsx` - Already updated with textures

---

## ✨ Benefits

1. **Visual Consistency:** All game modes use same texture system
2. **Transparency:** Background visible through board for better aesthetics
3. **Minecraft Style:** Recognizable texture blocks (diamond, gold, iron, etc.)
4. **Performance:** CSS background-image is hardware-accelerated
5. **Maintainability:** Centralized texture mapping in `textureUtils.ts`

---

## 🔄 How It Works

### Rendering Flow:
```
Tetris/Versus Component
    ↓
Stage Component
    ↓
Cell Component (for each cell)
    ↓
StyledCell (applies texture based on type)
    ↓
textureUtils.ts (provides texture URL)
    ↓
CSS background-image renders texture
```

### Texture Selection:
```typescript
// In StyledCell.tsx
const TEXTURE_MAP = {
  I: '/img/texture/diamond.webp',
  J: '/img/texture/lapis.jpg',
  // ... etc
};

// Renders as:
background: url('/img/texture/diamond.webp');
background-size: cover;
background-position: center;
```

---

## 🚀 Usage

**No code changes needed!** The texture system is automatically applied to:
- ✅ Main game board (single & multi)
- ✅ Hold display
- ✅ Next queue preview
- ✅ Ghost pieces (semi-transparent)
- ✅ Garbage blocks (maintains gray style)

---

## 📌 Notes

- Transparent borders: `rgba(255, 255, 255, 0.1)` for subtle visibility
- Texture images: Located in `client/img/texture/`
- Special blocks (ghost, garbage, empty) still use rgba colors
- Board maintains colored borders in multiplayer (green/red)

---

**Date:** October 14, 2025
**Status:** ✅ Complete and Production-Ready
