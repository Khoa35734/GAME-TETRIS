# 🎵 Background Music - Home Menu

## 📋 Tổng quan
Đã thêm background music tự động phát khi vào Home Menu với file `bg.mp3`.

## ✨ Tính năng

### 1. **Auto-play Music**
- Tự động phát nhạc khi vào menu
- Volume mặc định: 30%
- Loop vô hạn

### 2. **Music Toggle Button**
- Nút bật/tắt nhạc ở top bar (góc phải)
- Hiển thị:
  - 🎵 Nhạc (màu xanh lá) - Đang phát
  - 🔇 Nhạc (màu đỏ) - Đã tắt
- Hover effect với animation

### 3. **User Interaction Fallback**
- Nếu browser chặn autoplay → đợi click đầu tiên của user
- Tự động cleanup khi unmount component

## 🎨 UI/UX

### Music Button Style:
```typescript
// Đang phát - Màu xanh
background: 'rgba(78, 205, 196, 0.15)'
border: '1px solid rgba(78, 205, 196, 0.4)'
color: '#4ecdc4'

// Đã tắt - Màu đỏ  
background: 'rgba(255, 107, 107, 0.15)'
border: '1px solid rgba(255, 107, 107, 0.4)'
color: '#ff6b6b'
```

### Hover Effects:
- translateY(-2px) - Nút nhô lên
- boxShadow với màu tương ứng
- background sáng hơn

## 🔧 Implementation

### File Audio:
```
📁 client/sound/bg.mp3
```

### Code Structure:

```typescript
// 1. Refs & State
const bgMusicRef = useRef<HTMLAudioElement | null>(null);
const [isMusicPlaying, setIsMusicPlaying] = useState(false);

// 2. useEffect - Initialize & Auto-play
useEffect(() => {
  const audio = new Audio('/sound/bg.mp3');
  audio.loop = true;
  audio.volume = 0.3;
  bgMusicRef.current = audio;
  
  // Auto-play with fallback
  playMusic();
  
  // Cleanup on unmount
  return () => {
    audio.pause();
    audio.currentTime = 0;
  };
}, []);

// 3. Toggle Function
const toggleMusic = () => {
  if (bgMusicRef.current) {
    if (isMusicPlaying) {
      bgMusicRef.current.pause();
    } else {
      bgMusicRef.current.play();
    }
    setIsMusicPlaying(!isMusicPlaying);
  }
};
```

## 🎯 Cách sử dụng

1. **Vào Home Menu** → Nhạc tự động phát
2. **Click nút 🎵/🔇** → Bật/tắt nhạc
3. **Rời khỏi menu** → Nhạc tự động dừng

## 📝 Lưu ý

### Browser Autoplay Policy:
- Chrome/Firefox có thể chặn autoplay
- Cần user interaction (click) để bắt đầu
- Code đã xử lý fallback tự động

### Volume Control:
- Volume mặc định: 0.3 (30%)
- Có thể điều chỉnh trong Settings page (future)

### Performance:
- Audio object được tạo 1 lần duy nhất
- Cleanup khi component unmount
- Loop vô hạn không gây memory leak

## 🚀 Future Enhancements

1. **Settings Integration:**
   - Lưu trạng thái music on/off vào localStorage
   - Volume slider trong Settings
   - Cho phép chọn nhạc nền khác

2. **Fade In/Out:**
   - Fade in khi bắt đầu
   - Fade out khi tắt
   - Cross-fade khi chuyển scene

3. **Multiple Tracks:**
   - Random chọn từ playlist
   - Shuffle mode
   - Next/Previous buttons

## ✅ Completed
- ✅ Auto-play music on menu load
- ✅ Toggle button with visual feedback
- ✅ Autoplay fallback for blocked browsers
- ✅ Cleanup on unmount
- ✅ Smooth hover animations
- ✅ No TypeScript errors

---
**Created:** 2025-10-11  
**File:** `client/sound/bg.mp3`  
**Component:** `client/src/components/HomeMenu.tsx`
