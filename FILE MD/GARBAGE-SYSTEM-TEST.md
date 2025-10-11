# 🗑️ GARBAGE SYSTEM - Testing Guide

## ✅ Những gì đã được sửa:

### 1. **Cell.tsx** - Thêm xử lý cho garbage type
- Thêm check cho `type === 'garbage'` để render màu xám đúng cách
- Garbage sẽ hiển thị với màu xám (100, 100, 100)

### 2. **tetrominos.ts** - Điều chỉnh màu garbage
- Thay đổi từ `128, 128, 128` → `100, 100, 100` (đậm hơn để dễ thấy)

### 3. **StyledCell.tsx** - Style đặc biệt cho garbage
- Garbage có alpha 0.95 (đậm hơn các block thường 0.8)
- Viền đậm 2px với màu `rgba(60, 60, 60, 0.8)`
- Dễ phân biệt với các mảnh tetromino thường

### 4. **Versus.tsx** - Sửa logic apply garbage
- Thêm console.log để debug:
  - `🗑️ Received garbage:` khi nhận garbage từ đối thủ
  - `🔒 Lock piece - Pending garbage:` khi lock mảnh
  - `✂️ Offset garbage:` khi clear lines giảm incoming
  - `⬆️ Applying X garbage rows` khi add hàng rác vào board
- Sửa logic reset pending garbage về 0 sau khi apply
- Garbage offset: clear lines sẽ giảm incoming garbage trước khi apply

## 🎮 Cách Test:

### Bước 1: Start Server và Client
```bash
# Terminal 1 - Server
cd server
npm run dev

# Terminal 2 - Client  
cd client
npm run dev -- --host
```

### Bước 2: Tạo Match
1. Mở 2 browser windows (hoặc 1 browser + 1 incognito)
2. Cả 2 đều vào **Online Menu** → **Ranked**
3. Chờ matchmaking kết nối

### Bước 3: Test Garbage Generation

#### Test Case 1: Line Clear Garbage
- Player 1: Clear **Double** (2 lines) → gửi **1** garbage
- Player 2: Lock piece tiếp theo → nhận **1 hàng rác màu xám** từ dưới lên

#### Test Case 2: Tetris
- Player 1: Clear **Tetris** (4 lines) → gửi **4** garbage
- Player 2: Lock piece tiếp theo → nhận **4 hàng rác màu xám**

#### Test Case 3: T-Spin Double
- Player 1: T-Spin Double → gửi **4** garbage
- Player 2: Nhận **4 hàng rác**

#### Test Case 4: Combo
- Player 1: Clear lines liên tục:
  - Clear 1st → Combo 1 (no bonus)
  - Clear 2nd → Combo 2 (**+1 bonus**)
  - Clear 3rd → Combo 3 (**+2 bonus**)
  - Mỗi lần clear sẽ gửi thêm garbage (base + combo bonus)

#### Test Case 5: Back-to-Back (B2B)
- Player 1: 
  - Clear Tetris (4) → gửi 4 garbage
  - Clear Tetris lại (**B2B**) → gửi **4 + 1 = 5** garbage
  - Clear Tetris lần 3 (**B2B x2**) → gửi **4 + 1 = 5** garbage

#### Test Case 6: Garbage Offset
- Player 2 có **5 pending garbage** đang chờ
- Player 2 clear **Triple** (3 lines)
- → Offset 3 garbage → còn **2 garbage**
- Lock piece tiếp theo → chỉ nhận **2 hàng rác** thay vì 5

#### Test Case 7: Perfect Clear
- Player 1: Clear toàn bộ board (Perfect Clear)
- → Gửi **10 garbage** cho Player 2
- Check console log để verify

## 📊 Console Logs - Ý nghĩa:

```
🗑️ Received garbage: 4 lines. Total pending: 4
```
→ Nhận được 4 garbage từ đối thủ, tổng pending = 4

```
🔒 Lock piece - Pending garbage: 4 Lines cleared: 0
```
→ Lock mảnh, có 4 garbage pending, không clear lines nào

```
⬆️ Applying 4 garbage rows to board
```
→ Đang thêm 4 hàng rác màu xám vào board

```
✂️ Offset garbage: 2 Remaining: 2
```
→ Clear 2 lines offset 2 garbage, còn lại 2

## 🎨 Hình dạng Garbage:

- **Màu**: Xám đậm (RGB: 100, 100, 100)
- **Viền**: 2px solid xám tối
- **Hình dạng**: Hàng đầy ô xám, có 1 lỗ ngẫu nhiên để có thể clear
- **Vị trí**: Được thêm từ **dưới lên** (push lên từ bottom)

## 🔧 Troubleshooting:

### Không thấy garbage?
1. Check console logs - có log `🗑️ Received garbage` không?
2. Đối thủ có clear lines không? (Phải có clear mới gửi garbage)
3. Bạn phải **lock piece tiếp theo** mới thấy garbage được apply

### Garbage không có màu xám?
1. Check console - có errors về TETROMINOES không?
2. Restart client để reload tetrominos.ts
3. Check Cell.tsx có handle 'garbage' type không

### Pending garbage không giảm khi clear lines?
1. Check console log `✂️ Offset garbage`
2. Offset chỉ hoạt động khi có pending > 0 VÀ clear lines > 0

## 📈 Garbage Formula (đã implement):

```
garbage = base + b2b_bonus + combo_bonus + perfect_clear_bonus

Base:
- Single: 0
- Double: 1  
- Triple: 2
- Tetris: 4
- T-Spin Single: 2
- T-Spin Double: 4
- T-Spin Triple: 6

B2B: +1 (nếu liên tiếp Tetris/T-Spin)

Combo:
- Combo 2: +1
- Combo 3-4: +2
- Combo 5-6: +3
- Combo 7-8: +4
- Combo ≥9: +5

Perfect Clear: +10 (override base)
```

## ✨ Expected Behavior:

1. ✅ Garbage hiển thị màu **xám đậm**
2. ✅ Garbage có **viền đậm 2px**
3. ✅ Garbage được thêm từ **dưới lên**
4. ✅ Garbage có **1 lỗ ngẫu nhiên** mỗi hàng
5. ✅ Clear lines **giảm pending garbage** trước khi apply
6. ✅ Console logs hiển thị đầy đủ thông tin
7. ✅ Combo/B2B bonus **tính chính xác**
8. ✅ Perfect Clear gửi **10 garbage**

---

**Test thành công** khi bạn thấy:
- Hàng rác màu xám xuất hiện sau khi lock piece
- Console logs hiển thị đúng số lượng garbage
- Garbage offset hoạt động khi clear lines
- Combo và B2B tăng garbage đúng công thức
