# Single Player Features - Tetris Game

## 📋 Overview
Chế độ chơi đơn với hệ thống cài đặt linh hoạt và thống kê real-time chi tiết.

## ⚙️ Settings System

### Pre-game Settings Page (`/single/settings`)
Người chơi có thể tùy chỉnh các thông số trước khi vào trận:

1. **Số hàng cần phá (Lines to Clear)** 
   - Range: 10-150 hàng
   - Default: 40 hàng
   - Slider với hiển thị giá trị real-time

2. **Hiển thị khối ma (Ghost Piece)**
   - Toggle On/Off
   - Default: Bật
   - Hiển thị vị trí rơi của khối hiện tại

3. **Hard Drop**
   - Toggle On/Off
   - Default: Bật
   - Cho phép thả khối xuống ngay lập tức (Space)

4. **Next Queue**
   - Toggle On/Off
   - Default: Bật
   - Hiển thị 4 khối tiếp theo

5. **Hold**
   - Toggle On/Off
   - Default: Bật
   - Cho phép giữ khối hiện tại (Shift)

### Settings Persistence
- Lưu vào `localStorage` với key: `tetris:singleSettings`
- Tự động load khi vào game
- Giá trị mặc định nếu chưa có settings

## 📊 Real-time Statistics Display

Hiển thị trong panel bên phải trong khi chơi:

### 1. **Lines** 
- Số hàng đã phá / Mục tiêu
- Ví dụ: `52 / 40`

### 2. **Level**
- Level hiện tại (1-22)
- Tốc độ tăng theo level

### 3. **Time**
- Thời gian chơi (giây, 2 chữ số thập phân)
- Đếm từ khi bắt đầu đến khi win/game over

### 4. **PPS (Pieces Per Second)**
- Tính bằng: `piecesPlaced / (elapsedMs / 1000)`
- Độ chính xác: 2 chữ số thập phân
- Chỉ số đánh giá tốc độ chơi

### 5. **Pieces**
- Tổng số khối đã đặt
- Tăng mỗi khi 1 khối lock vào board

### 6. **Inputs**
- Tổng số lần nhấn phím
- Bao gồm: Di chuyển trái/phải, xoay, soft drop, hard drop, hold

### 7. **Holds**
- Số lần sử dụng tính năng Hold
- Chỉ đếm khi hold thành công

### 8. **Finesse (Inputs Per Piece)**
- Tính bằng: `inputs / piecesPlaced`
- Độ chính xác: 2 chữ số thập phân
- Chỉ số đánh giá hiệu quả thao tác (càng thấp càng tốt)

## 🎮 Game Flow

### 1. Start Game
```
HomeMenu → Click "Single Player" → /single/settings
```

### 2. Configure Settings
- Điều chỉnh 5 settings theo ý muốn
- Click "Back" để quay lại menu
- Click "Start Game" để bắt đầu

### 3. Countdown
- Đếm ngược 3-2-1 trước khi bắt đầu
- Board hiển thị rỗng trong lúc đếm
- Tự động bắt đầu sau countdown

### 4. During Game
- **Nút "Start Game" ẩn đi** - Không hiển thị trong khi chơi
- Stats cập nhật real-time
- Áp dụng settings đã chọn
- Nút "← Thoát" luôn hiển thị ở góc trên trái

### 5. Win Condition
Khi đạt đủ số hàng cần phá:
- **Board đóng băng hoàn toàn**
  - Không thể di chuyển khối
  - Không thể xoay
  - Không thể hard drop
  - Không thể hold
  - Khối không tự rơi

- **Win Overlay hiển thị ở giữa màn hình** với:
  - Tiêu đề "🎉 YOU WIN! 🎉"
  - Tổng kết đầy đủ statistics:
    - Time
    - Lines Cleared
    - Level
    - Pieces Placed
    - PPS
    - Total Inputs
    - Holds Used
    - Finesse
  - 2 nút:
    - **"Play Again"**: Reset và chơi lại
    - **"Menu"**: Quay về HomeMenu

### 6. Game Over
- Hiển thị "Game Over"
- Nút "Start Game" xuất hiện lại
- Có thể chơi lại hoặc thoát

## 🎯 Key Features

### 1. Conditional Gameplay
Các tính năng chỉ hoạt động khi được bật:
- Hard drop chỉ work khi `enableHardDrop = true`
- Hold chỉ work khi `showHold = true`
- Ghost piece chỉ hiển thị khi `showGhost = true`
- Next queue chỉ hiển thị khi `showNext = true`
- Hold panel chỉ hiển thị khi `showHold = true`

### 2. Input Tracking
Đếm chính xác mọi input:
- ⬅️ ➡️ Di chuyển trái/phải
- ⬇️ Soft drop
- ⬆️ Xoay
- Space Hard drop
- Shift Hold

### 3. Freeze on Win
Khi thắng, game hoàn toàn đóng băng:
- `dropTime = null` → Khối không tự rơi
- Mọi `handleKeyDown` return early khi `win = true`
- `useInterval` skip khi `win = true`
- Board giữ nguyên trạng thái cuối cùng

### 4. Stats Accuracy
- **PPS**: Chính xác đến 0.01 pieces/second
- **Finesse**: Chính xác đến 0.01 inputs/piece
- **Time**: Chính xác đến 0.01 giây
- Tất cả stats update real-time

## 🎨 UI Design

### Color Scheme
- **Background**: rgba(20,20,22,0.35) - Semi-transparent dark
- **Backdrop**: blur(6px) - Glassmorphism effect
- **Win overlay**: rgba(0,0,0,0.75) với blur(4px)
- **Success color**: #00ff88 (green)
- **Text primary**: #fff (white)
- **Text secondary**: #aaa (light gray)

### Layout
- **Hold Panel**: Trái trên board
- **Next + Stats Panel**: Phải trên board
- **Board**: Trung tâm với background image
- **Win Overlay**: Full screen center với backdrop

## 🔧 Technical Implementation

### State Management
```typescript
// Settings
const [gameSettings] = useState(() => { /* Load from localStorage */ });

// Stats
const [piecesPlaced, setPiecesPlaced] = useState(0);
const [inputs, setInputs] = useState(0);
const [holds, setHolds] = useState(0);
const [win, setWin] = useState(false);
const [elapsedMs, setElapsedMs] = useState(0);
const [timerOn, setTimerOn] = useState(false);
```

### Key Functions
1. **Input counting**: Mỗi action tăng `setInputs(prev => prev + 1)`
2. **Piece counting**: Khi lock khối `setPiecesPlaced(prev => prev + 1)`
3. **Hold counting**: Khi hold thành công `setHolds(prev => prev + 1)`
4. **Win detection**: `useEffect` check `rows >= gameSettings.linesToClear`
5. **Freeze logic**: Check `win` flag ở mọi input handler

### CSS Tricks
- **Ghost hiding**: `data-ghost="true"` với conditional styled-components
- **Responsive stats**: Flexbox với space-between
- **Overlay centering**: Fixed position với flexbox center

## 📝 Testing Checklist

- [ ] Settings save/load correctly từ localStorage
- [ ] All 5 settings work properly
- [ ] Stats update real-time
- [ ] PPS calculation chính xác
- [ ] Finesse calculation chính xác
- [ ] Input counting đầy đủ
- [ ] Hold counting chính xác
- [ ] Win overlay hiển thị đúng
- [ ] Board freeze hoàn toàn khi win
- [ ] "Play Again" reset đúng
- [ ] "Menu" navigation work
- [ ] Nút "Start Game" ẩn trong game
- [ ] Nút "Start Game" xuất hiện khi game over

## 🚀 Future Enhancements

Có thể thêm:
- [ ] Leaderboard với best times/PPS
- [ ] More detailed finesse errors
- [ ] Replay system
- [ ] Custom key bindings
- [ ] More game modes (Sprint, Ultra, etc.)
- [ ] Achievement system
- [ ] Export stats to file
