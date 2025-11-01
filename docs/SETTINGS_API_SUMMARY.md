# 🎮 Settings API Summary

Hệ thống cài đặt cho phép người chơi tùy chỉnh **key bindings** (phím điều khiển) và các **thông số game** cá nhân.

---

## 📊 Database Table: `users_settings`

Bảng đã tồn tại trong DB với cấu trúc:

```sql
users_settings (
  user_id bigint PRIMARY KEY,
  das_delay_ms integer,
  arr_ms integer,
  soft_drop_rate integer,
  show_next_pieces integer,
  sound_enabled boolean,
  music_enabled boolean,
  sound_volume numeric(3,2),
  music_volume numeric(3,2),
  key_bindings jsonb,
  theme_preference character varying(50),
  language_pref character varying(10)
)
```

---

## 🔧 Backend Implementation

### Files Created:

1. **`server/src/models/UserSettings.ts`** ✅
   - Sequelize model mapping to `users_settings` table
   - Type-safe interface for settings data
   - Default values matching DB defaults

2. **`server/src/routes/settings.ts`** ✅
   - JWT authenticated routes
   - Full CRUD operations for user settings
   - Validation for key bindings and volumes

3. **`server/src/index.ts`** ✅
   - Registered settings routes at `/api/settings`

---

## 🌐 API Endpoints

### 1. **GET /api/settings**
Lấy cài đặt của user hiện tại (auto-create nếu chưa tồn tại)

**Request:**
```http
GET /api/settings
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "das_delay_ms": 133,
    "arr_ms": 10,
    "soft_drop_rate": 50,
    "show_next_pieces": 5,
    "sound_enabled": true,
    "music_enabled": true,
    "sound_volume": 0.70,
    "music_volume": 0.50,
    "key_bindings": {
      "moveLeft": "ArrowLeft",
      "moveRight": "ArrowRight",
      "softDrop": "ArrowDown",
      "hardDrop": "Space",
      "rotateClockwise": "ArrowUp",
      "rotateCounterClockwise": "z",
      "rotate180": "a",
      "hold": "c",
      "restart": "r"
    },
    "theme_preference": "default",
    "language_pref": "vi"
  }
}
```

---

### 2. **PUT /api/settings**
Cập nhật toàn bộ hoặc một phần cài đặt

**Request:**
```http
PUT /api/settings
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "das_delay_ms": 100,
  "arr_ms": 5,
  "sound_volume": 0.8,
  "key_bindings": {
    "moveLeft": "a",
    "moveRight": "d",
    "softDrop": "s",
    "hardDrop": "w",
    "rotateClockwise": "k",
    "rotateCounterClockwise": "j",
    "rotate180": "l",
    "hold": "h",
    "restart": "r"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cài đặt đã được cập nhật",
  "settings": { ... }
}
```

**Validation:**
- `sound_volume` và `music_volume`: 0.0 - 1.0
- `key_bindings`: Phải có đầy đủ 9 actions
- Không cho phép duplicate keys

---

### 3. **PATCH /api/settings/keys**
Cập nhật chỉ key bindings (nhanh hơn PUT)

**Request:**
```http
PATCH /api/settings/keys
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "key_bindings": {
    "moveLeft": "a",
    "moveRight": "d",
    "softDrop": "s",
    "hardDrop": "w",
    "rotateClockwise": "k",
    "rotateCounterClockwise": "j",
    "rotate180": "l",
    "hold": "h",
    "restart": "r"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Key bindings đã được cập nhật",
  "key_bindings": { ... }
}
```

**Validation:**
- Kiểm tra đầy đủ 9 required keys
- Không cho phép duplicate key assignments
- Returns error nếu thiếu action hoặc trùng phím

---

### 4. **POST /api/settings/reset**
Reset về cài đặt mặc định

**Request:**
```http
POST /api/settings/reset
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "message": "Đã reset về cài đặt mặc định",
  "settings": { ... }
}
```

**Default Values:**
- DAS: 133ms, ARR: 10ms, Soft Drop: 50ms
- Show next: 5 pieces
- Sound/Music: enabled, volumes: 0.70/0.50
- Key bindings: Arrow keys + z/a/c/r
- Theme: 'default', Language: 'vi'

---

## 💻 Frontend Implementation

### Files Created:

1. **`client/src/services/settingsService.ts`** ✅
   - API client với axios
   - Type-safe interfaces cho KeyBindings và UserSettings
   - LocalStorage fallback cho non-authenticated users
   - Helper functions: `getUserSettings()`, `updateKeyBindings()`, `resetSettings()`

2. **`client/src/hooks/useKeyBindings.ts`** ✅
   - React hook để load và sử dụng key bindings
   - Auto-load từ server hoặc localStorage
   - Utility functions:
     - `isKeyForAction(key, action)` - Check if key matches action
     - `getKeyForAction(action)` - Get key string for action
     - `createKeyHandler(actionHandlers)` - Create keyboard event handler

3. **`client/src/components/SettingsPage.tsx`** ✅
   - Full-featured settings UI
   - Sections:
     - 🎮 Key Bindings với click-to-change interface
     - 🎯 Game Settings (DAS, ARR, soft drop, next pieces)
     - 🔊 Audio Settings (enable/disable, volumes)
   - Features:
     - Real-time duplicate key detection
     - Visual feedback khi listening for key press
     - Save/Reload/Reset buttons
     - Success/Error messages

---

## 🎯 Key Bindings System

### Default Key Mappings:

| Action | Default Key | Vietnamese Label |
|--------|-------------|------------------|
| `moveLeft` | `ArrowLeft` | Di chuyển trái |
| `moveRight` | `ArrowRight` | Di chuyển phải |
| `softDrop` | `ArrowDown` | Rơi chậm |
| `hardDrop` | `Space` | Rơi nhanh |
| `rotateClockwise` | `ArrowUp` | Xoay phải |
| `rotateCounterClockwise` | `z` | Xoay trái |
| `rotate180` | `a` | Xoay 180° |
| `hold` | `c` | Giữ |
| `restart` | `r` | Chơi lại |

### Usage Example:

```typescript
import { useKeyBindings } from '../hooks/useKeyBindings';

function TetrisGame() {
  const { createKeyHandler } = useKeyBindings();
  
  useEffect(() => {
    const handleKey = createKeyHandler({
      moveLeft: () => movePlayer(-1),
      moveRight: () => movePlayer(1),
      softDrop: () => dropPlayer(),
      hardDrop: () => hardDrop(),
      rotateClockwise: () => rotatePlayer(1),
      rotateCounterClockwise: () => rotatePlayer(-1),
      rotate180: () => rotatePlayer180(),
      hold: () => holdPiece(),
      restart: () => resetGame(),
    });
    
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);
  
  // ... rest of game logic
}
```

---

## 🔒 Security

- **JWT Authentication**: Tất cả endpoints yêu cầu valid JWT token
- **User Isolation**: Mỗi user chỉ có thể đọc/ghi settings của chính mình
- **Validation**: 
  - Volume range: 0.0 - 1.0
  - Required key bindings: All 9 actions must be present
  - Duplicate detection: Không cho phép gán cùng phím cho nhiều actions
  - Input sanitization: Sequelize ORM prevents SQL injection

---

## 📦 Dependencies Added

### Server:
- ✅ `sequelize` - ORM (already installed)
- ✅ `jsonwebtoken` - JWT auth (already installed)
- ✅ `bcrypt` - Password hashing (already installed)

### Client:
- ✅ `axios` - HTTP client (newly installed)
- ✅ `styled-components` - CSS-in-JS (already installed)

---

## 🚀 Integration Steps

### 1. Add Settings Button to Menu

```typescript
// client/src/components/HomeMenu.tsx
import { useState } from 'react';
import SettingsPage from './SettingsPage';

function HomeMenu() {
  const [showSettings, setShowSettings] = useState(false);
  
  if (showSettings) {
    return <SettingsPage onBack={() => setShowSettings(false)} />;
  }
  
  return (
    <Menu>
      {/* ... existing menu items ... */}
      <Button onClick={() => setShowSettings(true)}>
        ⚙️ Cài đặt
      </Button>
    </Menu>
  );
}
```

### 2. Use Custom Key Bindings in Game

```typescript
// client/src/components/Tetris.tsx or Versus.tsx
import { useKeyBindings } from '../hooks/useKeyBindings';

function Tetris() {
  const { createKeyHandler, loading } = useKeyBindings();
  
  useEffect(() => {
    if (loading) return; // Wait for settings to load
    
    const handleKey = createKeyHandler({
      moveLeft: () => movePlayer(-1),
      moveRight: () => movePlayer(1),
      // ... map all actions
    });
    
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [loading]);
}
```

### 3. Apply Game Settings

```typescript
// Use DAS/ARR values from settings
const { settings } = useSettings();

// Apply to input system
const dasDelay = settings?.das_delay_ms || 133;
const arrRate = settings?.arr_ms || 10;
const softDropRate = settings?.soft_drop_rate || 50;
```

---

## 🧪 Testing

### Test với curl:

```bash
# 1. Login để lấy token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# Lưu token vào biến
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. Get current settings
curl -X GET http://localhost:4000/api/settings \
  -H "Authorization: Bearer $TOKEN"

# 3. Update key bindings
curl -X PATCH http://localhost:4000/api/settings/keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key_bindings":{"moveLeft":"a","moveRight":"d","softDrop":"s","hardDrop":"w","rotateClockwise":"k","rotateCounterClockwise":"j","rotate180":"l","hold":"h","restart":"r"}}'

# 4. Update game settings
curl -X PUT http://localhost:4000/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"das_delay_ms":100,"arr_ms":5,"sound_volume":0.8}'

# 5. Reset to defaults
curl -X POST http://localhost:4000/api/settings/reset \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✅ Implementation Checklist

### Backend:
- [x] Sequelize model `UserSettings.ts`
- [x] API routes with JWT auth
- [x] Validation logic (volumes, key bindings)
- [x] Duplicate key detection
- [x] Default values
- [x] Error handling
- [x] Routes registered in `index.ts`

### Frontend:
- [x] Settings service with axios
- [x] Type-safe interfaces
- [x] `useKeyBindings` hook
- [x] Settings page UI component
- [x] Click-to-change key binding interface
- [x] Real-time validation
- [x] Save/Reset functionality
- [x] LocalStorage fallback

### To Do:
- [ ] Integrate SettingsPage into app routing
- [ ] Replace hardcoded keys in Tetris/Versus components
- [ ] Apply DAS/ARR values to input system
- [ ] Apply audio settings to sound manager
- [ ] Add "Settings" button to HomeMenu
- [ ] Test full flow: change keys → save → play game with new keys

---

## 🎨 UI Features

### Key Binding Interface:
- **Click on key input** → Highlight and wait for key press
- **Press any key** → Assign to action
- **Duplicate detection** → Show error if key already used
- **Visual feedback** → Animation while listening
- **Vietnamese labels** → All UI text in Vietnamese

### Validation Messages:
- ✅ "Đã gán [key] cho [action]"
- ❌ "Phím [key] đã được gán cho [action]"
- ✅ "Đã lưu cài đặt thành công!"
- ❌ "Không thể gán cùng một phím cho nhiều hành động"

---

## 📝 Notes

- Settings are **per-user** and stored in PostgreSQL
- Non-authenticated users use **localStorage** as fallback
- Key bindings stored as **JSONB** for flexibility
- All API calls require **JWT authentication**
- UI built with **styled-components**
- Fully **type-safe** with TypeScript

---

**Status**: ✅ Backend & Frontend implemented, ready for integration
**Next Step**: Integrate into game components and test end-to-end
**Created**: As part of customizable settings feature
**Last Updated**: After completing API, service, hook, and UI components
