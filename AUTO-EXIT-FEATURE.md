# 🕐 Auto-Exit Feature - Tự động thoát phòng sau trận đấu

## 📋 Mô tả
Sau khi trận đấu kết thúc, người chơi có **1 phút (60 giây)** để thoát phòng. Nếu quá thời gian này, hệ thống sẽ **tự động kick người chơi** ra khỏi phòng và đưa về màn hình chính.

## ⚙️ Cài đặt

### Thời gian
```typescript
const AUTO_EXIT_TIMEOUT_MS = 60000; // 60 giây (1 phút)
```

### State & Refs
```typescript
const [autoExitCountdown, setAutoExitCountdown] = useState<number | null>(null);
const autoExitTimerRef = useRef<number | null>(null);
```

## 🎯 Cách hoạt động

### 1. Khi trận đấu kết thúc (`game:over` event)
- Hệ thống bắt đầu đếm ngược từ 60 giây
- Hiển thị countdown trên UI
- Màu đỏ cảnh báo khi còn ≤ 10 giây

### 2. Khi hết thời gian (0 giây)
```typescript
if (remaining <= 0) {
  // Dọn dẹp
  clearInterval(autoExitTimerRef.current!);
  
  // Thoát ranked queue
  if (meId) socket.emit('ranked:leave', meId);
  
  // Dọn dẹp WebRTC
  cleanupWebRTC('auto-exit');
  
  // Quay về menu
  navigate('/');
}
```

### 3. Thoát thủ công
- Khi người chơi click nút "Thoát" hoặc "Trở về menu"
- Timer sẽ được clear để tránh xung đột
```typescript
if (autoExitTimerRef.current) {
  clearInterval(autoExitTimerRef.current);
  autoExitTimerRef.current = null;
}
```

## 🎨 UI Display

### Vị trí hiển thị
Countdown được hiển thị trong overlay kết quả trận đấu:

```tsx
{autoExitCountdown !== null && (
  <div style={{ 
    marginTop: 24, 
    fontSize: 16, 
    opacity: 0.9,
    background: 'rgba(255, 107, 107, 0.2)',
    padding: '12px 24px',
    borderRadius: 8,
    border: '1px solid rgba(255, 107, 107, 0.4)'
  }}>
    ⏰ Tự động thoát sau: 
    <span style={{ 
      fontWeight: 700, 
      fontSize: 20, 
      color: autoExitCountdown <= 10 ? '#ff6b6b' : '#fff' 
    }}>
      {autoExitCountdown}
    </span> giây
  </div>
)}
```

### Màu sắc cảnh báo
- **> 10 giây**: Màu trắng (bình thường)
- **≤ 10 giây**: Màu đỏ `#ff6b6b` (cảnh báo)

## 🧹 Cleanup Logic

### Component unmount
```typescript
useEffect(() => {
  return () => {
    if (autoExitTimerRef.current) clearInterval(autoExitTimerRef.current);
    // ... other cleanup
  };
}, []);
```

### Các trường hợp clear timer
1. ✅ Component unmount
2. ✅ Click nút "Thoát" (top-left)
3. ✅ Click nút "Trở về menu" (overlay)
4. ✅ Hết thời gian countdown

## 🔍 Debug & Logs

```typescript
console.log('⏰ Starting 1-minute auto-exit countdown');
console.log('⏰ Auto-exit timeout - forcing exit');
```

## 📊 Flow Chart

```
Trận đấu kết thúc (game:over)
           ↓
    Start 60s countdown
           ↓
    Hiển thị UI countdown
           ↓
    ┌──────────┴──────────┐
    │                     │
    ↓                     ↓
User click thoát     Hết 60 giây
    │                     │
    ↓                     ↓
Clear timer          Auto-exit
    │                     │
    └──────────┬──────────┘
               ↓
        Navigate to '/'
```

## ✨ Tính năng bổ sung có thể thêm

1. **Pause countdown**: Cho phép player pause timer (nếu cần)
2. **Custom timeout**: Cho admin/host tùy chỉnh thời gian
3. **Warning sound**: Âm thanh cảnh báo khi còn 10s
4. **Blink effect**: Nhấp nháy countdown khi sắp hết giờ
5. **Rematch option**: Nút "Chơi lại" để match ngay với đối thủ cũ

## 🐛 Bug Prevention

### Race condition
- ✅ Clear timer trước khi navigate
- ✅ Check null trước khi clear interval
- ✅ Single source of truth cho countdown

### Memory leaks
- ✅ Cleanup trong useEffect return
- ✅ Clear interval khi unmount
- ✅ Remove event listeners

## 📝 Test Cases

### Test 1: Normal auto-exit
1. Kết thúc trận đấu
2. Đợi 60 giây
3. ✅ Expect: Tự động quay về menu

### Test 2: Manual exit before timeout
1. Kết thúc trận đấu
2. Click "Thoát" sau 30 giây
3. ✅ Expect: Quay về menu ngay, không có lỗi

### Test 3: Visual countdown
1. Kết thúc trận đấu
2. Observe UI countdown
3. ✅ Expect: Countdown từ 60 → 0, đổi màu ở 10s

### Test 4: Multiple exits
1. Kết thúc trận đấu
2. Click "Thoát" nhiều lần
3. ✅ Expect: Không có lỗi console, navigate 1 lần

## 🔐 Security Notes

- Timer chạy client-side, có thể bị manipulate
- Server nên có timeout riêng để kick inactive players
- Không dựa hoàn toàn vào client-side timer

## 📌 Files Modified

- `client/src/components/Versus.tsx`: Main implementation

## 🎯 Related Issues

- [x] Auto-exit after match ends
- [ ] Server-side room timeout (TODO)
- [ ] Rematch functionality (TODO)
