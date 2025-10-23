# 🎮 User Settings System

Hệ thống cài đặt cho phép người chơi tùy chỉnh các phím điều khiển và các thông số game theo sở thích cá nhân.

## 📋 Tính năng

### 1. **Key Bindings (Phím điều khiển)**
Người chơi có thể tùy chỉnh các phím sau:

| Hành động | Phím mặc định | Mô tả |
|-----------|---------------|-------|
| Di chuyển trái | `ArrowLeft` | Di chuyển mảnh sang trái |
| Di chuyển phải | `ArrowRight` | Di chuyển mảnh sang phải |
| Rơi chậm | `ArrowDown` | Rơi chậm (Soft Drop) |
| Rơi nhanh | `Space` | Rơi nhanh xuống đáy (Hard Drop) |
| Xoay phải | `ArrowUp` | Xoay mảnh theo chiều kim đồng hồ |
| Xoay trái | `z` | Xoay mảnh ngược chiều kim đồng hồ |
| Xoay 180° | `a` | Xoay mảnh 180 độ |
| Giữ | `c` | Giữ mảnh hiện tại (Hold) |
| Chơi lại | `r` | Restart game |

### 2. **Game Settings (Cài đặt game)**

- **DAS Delay (ms)**: Delayed Auto Shift - Độ trễ trước khi mảnh bắt đầu di chuyển liên tục (mặc định: 133ms)
- **ARR (ms)**: Auto Repeat Rate - Tốc độ di chuyển liên tục (mặc định: 10ms)
- **Soft Drop Rate (ms)**: Tốc độ rơi chậm (mặc định: 50ms)
- **Show Next Pieces**: Số lượng mảnh tiếp theo hiển thị (1-7, mặc định: 5)

### 3. **Audio Settings (Cài đặt âm thanh)**

- **Sound Enabled**: Bật/tắt hiệu ứng âm thanh
- **Music Enabled**: Bật/tắt nhạc nền
- **Sound Volume**: Âm lượng hiệu ứng (0.0 - 1.0)
- **Music Volume**: Âm lượng nhạc nền (0.0 - 1.0)

### 4. **UI Preferences**

- **Theme**: Chủ đề giao diện (mặc định: 'default')
- **Language**: Ngôn ngữ hiển thị (mặc định: 'vi')

---

## 🗄️ Database Schema

```sql
CREATE TABLE users_settings (
  user_id BIGINT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  das_delay_ms INTEGER DEFAULT 133,
  arr_ms INTEGER DEFAULT 10,
  soft_drop_rate INTEGER DEFAULT 50,
  show_next_pieces INTEGER DEFAULT 5,
  sound_enabled BOOLEAN DEFAULT true,
  music_enabled BOOLEAN DEFAULT true,
  sound_volume NUMERIC(3,2) DEFAULT 0.70,
  music_volume NUMERIC(3,2) DEFAULT 0.50,
  key_bindings JSONB DEFAULT {...},
  theme_preference VARCHAR(50) DEFAULT 'default',
  language_pref VARCHAR(10) DEFAULT 'vi'
);
```

### Chạy Migration

```bash
# Kết nối PostgreSQL
psql -U postgres -d tetris

# Chạy migration
\i server/src/migrations/002_create_users_settings_table.sql
```

---

## 🔌 API Endpoints

### 1. **GET /api/settings**
Lấy cài đặt của user hiện tại

**Headers:**
```
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

### 2. **PUT /api/settings**
Cập nhật toàn bộ cài đặt

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "das_delay_ms": 100,
  "arr_ms": 5,
  "key_bindings": {
    "moveLeft": "a",
    "moveRight": "d",
    ...
  }
}
```

### 3. **PATCH /api/settings/keys**
Cập nhật chỉ key bindings

**Body:**
```json
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

### 4. **POST /api/settings/reset**
Reset về cài đặt mặc định

**Response:**
```json
{
  "success": true,
  "message": "Đã reset về cài đặt mặc định"
}
```

---

## 💻 Client Integration

### 1. **Import Service**

```typescript
import { getUserSettings, updateKeyBindings, UserSettings, KeyBindings } from '../services/settingsService';
```

### 2. **Use Settings in Component**

```typescript
import { useKeyBindings } from '../hooks/useKeyBindings';

function TetrisGame() {
  const { keyBindings, isKeyForAction, createKeyHandler } = useKeyBindings();
  
  useEffect(() => {
    const handleKey = createKeyHandler({
      moveLeft: () => movePlayer(-1),
      moveRight: () => movePlayer(1),
      softDrop: () => dropPlayer(),
      hardDrop: () => hardDrop(),
      rotateClockwise: () => rotatePlayer(1),
      rotateCounterClockwise: () => rotatePlayer(-1),
      rotate180: () => rotatePlayer(2),
      hold: () => holdPiece(),
      restart: () => restartGame(),
    });
    
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [keyBindings]);
  
  // ... game logic
}
```

### 3. **Settings Page Component**

```typescript
import SettingsPage from './components/SettingsPage';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  
  return (
    <>
      {showSettings ? (
        <SettingsPage onBack={() => setShowSettings(false)} />
      ) : (
        <HomeMenu onOpenSettings={() => setShowSettings(true)} />
      )}
    </>
  );
}
```

---

## 🎯 Features

### ✅ Implemented

- ✅ Database table `users_settings`
- ✅ Sequelize model `UserSettings`
- ✅ API endpoints (GET, PUT, PATCH, POST)
- ✅ JWT authentication middleware
- ✅ Client service `settingsService.ts`
- ✅ React hook `useKeyBindings`
- ✅ Settings UI component
- ✅ Key binding customization with duplicate detection
- ✅ Reset to default functionality
- ✅ LocalStorage fallback for non-logged-in users

### 🔄 To Integrate

1. **Integrate Settings Page into App routing**
   - Add button in HomeMenu to open settings
   - Add to navigation menu

2. **Apply key bindings to Tetris game**
   - Replace hardcoded key checks in `Tetris.tsx` or `Versus.tsx`
   - Use `useKeyBindings` hook

3. **Apply game settings**
   - DAS/ARR values to input system
   - Soft drop rate to drop speed
   - Show next pieces count

4. **Apply audio settings**
   - Sound/Music enable/disable
   - Volume controls

---

## 📝 Testing

### 1. Test API with curl

```bash
# Register user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Login to get token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get settings (use token from login)
curl -X GET http://localhost:4000/api/settings \
  -H "Authorization: Bearer <YOUR_TOKEN>"

# Update key bindings
curl -X PATCH http://localhost:4000/api/settings/keys \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"key_bindings":{"moveLeft":"a","moveRight":"d","softDrop":"s","hardDrop":"w","rotateClockwise":"k","rotateCounterClockwise":"j","rotate180":"l","hold":"h","restart":"r"}}'
```

### 2. Test in Browser

1. Đăng nhập vào account
2. Mở Settings page
3. Click vào ô key binding và nhấn phím mới
4. Kiểm tra duplicate key detection
5. Lưu settings
6. Refresh page và kiểm tra settings đã được load
7. Test Reset to Default

---

## 🚀 Next Steps

1. **Migrate existing game code:**
   - Replace hardcoded key checks with `useKeyBindings`
   - Apply DAS/ARR settings to input system
   
2. **Add visual feedback:**
   - Show current key bindings in help screen
   - Add tooltips in game

3. **Advanced features (future):**
   - Import/Export settings
   - Multiple control profiles
   - Controller support
   - Mobile touch controls settings

---

## 🐛 Known Issues

- Phím `Shift`, `Ctrl`, `Alt` có thể không hoạt động tốt khi kết hợp
- Một số phím đặc biệt (F1-F12) có thể bị browser handle

---

**Created**: As part of user settings system implementation
**Last Updated**: After completing API, UI, and hook integration
