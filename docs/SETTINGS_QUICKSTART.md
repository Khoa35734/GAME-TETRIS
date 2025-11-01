# ⚙️ Settings System - Quick Start Guide

Hệ thống cho phép người chơi tùy chỉnh **phím điều khiển** và **cài đặt game**.

---

## 🚀 Quick Setup

### 1. **Database** (Đã có sẵn ✅)
Bảng `users_settings` đã tồn tại trong DB với cấu trúc đầy đủ.

### 2. **Server** (Đã implement ✅)
```bash
cd server
npm install  # Dependencies already installed
npm run dev  # Server running on port 4000
```

**Endpoints available:**
- `GET /api/settings` - Lấy settings
- `PUT /api/settings` - Cập nhật settings
- `PATCH /api/settings/keys` - Cập nhật chỉ key bindings
- `POST /api/settings/reset` - Reset về mặc định

### 3. **Client** (Đã implement ✅)
```bash
cd client
npm install  # axios installed
npm run dev  # Client running
```

**Components created:**
- `services/settingsService.ts` - API client
- `hooks/useKeyBindings.ts` - React hook
- `components/SettingsPage.tsx` - Settings UI

---

## 🎮 Usage

### A. Thêm Settings vào Menu

```typescript
// client/src/components/HomeMenu.tsx
import SettingsPage from './SettingsPage';

const [showSettings, setShowSettings] = useState(false);

if (showSettings) {
  return <SettingsPage onBack={() => setShowSettings(false)} />;
}

// Add button
<Button onClick={() => setShowSettings(true)}>
  ⚙️ Cài đặt
</Button>
```

### B. Sử dụng Custom Keys trong Game

```typescript
// client/src/components/Tetris.tsx
import { useKeyBindings } from '../hooks/useKeyBindings';

function Tetris() {
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
}
```

---

## 🧪 Test API

Use `server/test-settings.http` với REST Client extension:

1. Run login request → Copy token
2. Replace `@token` variable
3. Test GET/PUT/PATCH/POST endpoints

Or use curl:
```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get settings
curl -X GET http://localhost:4000/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update keys
curl -X PATCH http://localhost:4000/api/settings/keys \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key_bindings":{...}}'
```

---

## 📋 Default Key Bindings

| Action | Key | Label |
|--------|-----|-------|
| Move Left | `ArrowLeft` | Di chuyển trái |
| Move Right | `ArrowRight` | Di chuyển phải |
| Soft Drop | `ArrowDown` | Rơi chậm |
| Hard Drop | `Space` | Rơi nhanh |
| Rotate CW | `ArrowUp` | Xoay phải |
| Rotate CCW | `z` | Xoay trái |
| Rotate 180° | `a` | Xoay 180° |
| Hold | `c` | Giữ |
| Restart | `r` | Chơi lại |

---

## ✅ Integration Checklist

- [x] Backend model `UserSettings.ts`
- [x] Backend routes `/api/settings`
- [x] Frontend service `settingsService.ts`
- [x] Frontend hook `useKeyBindings.ts`
- [x] Frontend UI `SettingsPage.tsx`
- [x] Test file `test-settings.http`
- [ ] Add settings button to HomeMenu
- [ ] Replace hardcoded keys in game components
- [ ] Test end-to-end flow

---

## 📁 Files Structure

```
server/
  src/
    models/
      UserSettings.ts          ✅ Sequelize model
    routes/
      settings.ts              ✅ API endpoints
    index.ts                   ✅ Routes registered
  test-settings.http           ✅ API tests

client/
  src/
    services/
      settingsService.ts       ✅ API client
    hooks/
      useKeyBindings.ts        ✅ React hook
    components/
      SettingsPage.tsx         ✅ Settings UI

FILE MD/
  SETTINGS_API_SUMMARY.md      ✅ Full documentation
```

---

## 🎯 Next Steps

1. **Integrate into app:**
   - Add settings button to HomeMenu
   - Add SettingsPage to routing

2. **Use in game:**
   - Replace hardcoded `event.key === 'ArrowLeft'` với `isKeyForAction(event.key, 'moveLeft')`
   - Apply DAS/ARR settings to input system

3. **Test:**
   - Login → Open settings → Change keys → Save
   - Play game with new keys
   - Reset to defaults

---

**Status**: ✅ Fully implemented and ready to integrate
**Documentation**: See `FILE MD/SETTINGS_API_SUMMARY.md` for details
