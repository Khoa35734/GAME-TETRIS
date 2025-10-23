# 🧪 PROFILE & BO3 SYSTEM - QUICK TEST GUIDE

## 🚀 Cách Test Profile Modal

### 1. Mở Profile
1. Vào HomeMenu (đã login)
2. Click vào avatar ở góc trên trái
3. ✅ Modal hiển thị với animation fade-in

### 2. Xem Profile Info
- ✅ Avatar lớn với chữ cái đầu
- ✅ Username và ID
- ✅ Thống kê: 3 trận (2W 1L)
- ✅ Win rate: 66.7%
- ✅ BO3 info box

### 3. Xem Match History
**Danh sách 3 trận mock:**

#### Match 1 (1 giờ trước)
- ✅ WIN badge (xanh)
- ⚔️ CASUAL mode
- 🎯 vs Player123
- 📊 Score: 2-1

#### Match 2 (2 giờ trước)
- ❌ LOSE badge (đỏ)
- 🏆 RANKED mode
- 🎯 vs ProGamer99
- 📊 Score: 1-2

#### Match 3 (1 ngày trước)
- ✅ WIN badge (xanh)
- ⚔️ CASUAL mode
- 🎯 vs Noob42
- 📊 Score: 2-0

### 4. Xem Chi Tiết Trận
1. Click vào Match 1 (2-1 WIN)
2. ✅ Hiển thị overview:
   - Bạn: 2 wins
   - Player123: 1 win
   - Kết quả: CHIẾN THẮNG
3. ✅ Chi tiết 3 ván:

**Ván 1 (THẮNG):**
- Bạn: 40 lines, 2.5 PPS, 85% finesse
- Đối thủ: 35 lines, 2.1 PPS, 78% finesse

**Ván 2 (THUA):**
- Bạn: 32 lines, 2.2 PPS, 80% finesse
- Đối thủ: 40 lines, 2.6 PPS, 88% finesse

**Ván 3 (THẮNG):**
- Bạn: 40 lines, 2.7 PPS, 90% finesse
- Đối thủ: 30 lines, 2.0 PPS, 75% finesse

4. Click "◀ Quay lại" → Về danh sách

### 5. Test Match 2 (LOSE 1-2)
- Click Match 2
- ✅ Hiển thị "😔 THẤT BẠI"
- ✅ Score: 1-2
- ✅ 3 ván với stats đầy đủ

### 6. Test Match 3 (WIN 2-0)
- Click Match 3
- ✅ Chỉ có 2 ván (kết thúc sớm)
- ✅ Cả 2 ván đều WIN

## 🎮 BO3 System Flow

### Luồng 1 trận BO3

```
START → Game 1 → [Winner?]
              ↓
         Game 2 → [Winner?]
              ↓
         [Score 2-0?] → END
              ↓ No (1-1)
         Game 3 → END
```

### Score Scenarios

**2-0 (Sweep):**
- Game 1: WIN
- Game 2: WIN
- → Match ends, no Game 3

**2-1 (Close):**
- Game 1: WIN
- Game 2: LOSE
- Game 3: WIN
- → Match ends

**1-2 (Close Loss):**
- Game 1: WIN
- Game 2: LOSE
- Game 3: LOSE
- → Match ends

## 🔍 UI Checklist

### Profile Modal
- [ ] Modal xuất hiện với fade-in
- [ ] Backdrop blur
- [ ] Avatar hiển thị đúng
- [ ] Stats đúng (3 trận, 2W 1L, 66.7%)
- [ ] BO3 info box hiển thị
- [ ] Nút "✕ Đóng" hoạt động

### Match History List
- [ ] 3 cards hiển thị
- [ ] WIN/LOSE badge đúng màu
- [ ] Mode badge (Casual/Ranked)
- [ ] Opponent name hiển thị
- [ ] Score format "2-1", "1-2", "2-0"
- [ ] Time ago format
- [ ] Hover effect (translateX + shadow)
- [ ] Arrow indicator (▶)

### Match Detail View
- [ ] Back button hoạt động
- [ ] Match overview hiển thị
- [ ] Player vs Opponent comparison
- [ ] Score hiển thị đúng
- [ ] Win/Lose message đúng
- [ ] Game cards (2-3 ván)
- [ ] Stats đầy đủ cho mỗi ván
- [ ] Winner indicator mỗi ván

### Stats Display
- [ ] Lines
- [ ] PPS (2 chữ số thập phân)
- [ ] Finesse (%)
- [ ] Pieces
- [ ] Holds
- [ ] Inputs
- [ ] Time (format mm:ss)

## 🐛 Debug Tips

### Modal không hiển thị?
```typescript
// Check HomeMenu.tsx
const [showProfile, setShowProfile] = useState(false);
// Click avatar should call: setShowProfile(true)
```

### Mock data không load?
```typescript
// Check ProfileModal.tsx loadMatchHistory()
// Should set mockMatches array
console.log('Match history:', matchHistory);
```

### Stats không hiển thị?
```typescript
// Check StatsDisplay component
// Verify data structure matches GameStats interface
```

### Avatar không clickable?
```typescript
// Check HomeMenu.tsx avatar div
// Should have: onClick={() => setShowProfile(true)}
// Should have: cursor: 'pointer'
```

## 📊 Expected Results

### Console Logs (Normal)
```
[ProfileModal] Loading user data...
[ProfileModal] User: { id: 1, username: "Player1" }
[ProfileModal] Loading match history...
[ProfileModal] Loaded 3 matches
```

### No Errors
- ✅ No TypeScript errors (chỉ có warnings về unused vars)
- ✅ No runtime errors
- ✅ ProfileModal imports correctly
- ✅ getUserData() function exports correctly

## 🔄 Testing Workflow

1. **Start client:**
```bash
cd client
npm run dev
```

2. **Login to account**

3. **Test Profile:**
   - Click avatar
   - Verify modal opens
   - Check stats
   - Check match list

4. **Test Match Details:**
   - Click each match
   - Verify details show
   - Check stats accuracy
   - Test back button

5. **Test Close:**
   - Click "✕ Đóng"
   - Click outside modal
   - Verify closes correctly

## ✅ Success Criteria

Profile system works if:
- [x] Avatar clickable with hover effect
- [x] Modal opens with animation
- [x] Stats display correctly
- [x] 3 mock matches show
- [x] Can click into match details
- [x] All stats visible and formatted
- [x] Can navigate back
- [x] Modal closes properly

BO3 system ready if:
- [x] BO3MatchManager class created
- [x] Socket events defined
- [x] Database schema ready
- [x] API routes created
- [x] Server integrated

---

**Status:** ✅ Ready to test with mock data
**Next:** Connect to real database and implement real-time match recording
