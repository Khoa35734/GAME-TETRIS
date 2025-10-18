# 🎮 Quick Start - Test Authentication Now!

## ⚡ TL;DR - 3 Steps to Test

### Step 1: Start Backend (Terminal 1)
```powershell
cd e:\PBL4\GAME-TETRIS\server
npm run dev
```
✅ Wait for: `🚀 Server running on http://localhost:4000`

### Step 2: Start Frontend (Terminal 2)
```powershell
cd e:\PBL4\GAME-TETRIS\client
npm run dev
```
✅ Wait for: `Local: http://localhost:5173/`

### Step 3: Open Browser
Navigate to: **http://localhost:5173/**

---

## 🧪 Quick Test Scenarios

### Test Tab Navigation (30 seconds)
1. Press **Tab** on keyboard
2. Watch cursor move through fields automatically
3. Press **Enter** to submit
✅ **Expected**: Smooth navigation, no errors

### Test Register (1 minute)
1. Click **"Đăng ký"** tab
2. Fill in any test data:
   - Username: `testuser`
   - Email: `test@test.com`
   - Password: `pass123`
   - Confirm: `pass123`
3. Press **Enter** or click **"✨ Đăng ký ngay"**
✅ **Expected**: Success → Shows game modes menu

### Test Login (30 seconds)
1. Click **"Đăng nhập"** tab
2. Use same credentials:
   - Email: `test@test.com`
   - Password: `pass123`
3. Press **Enter** or click **"🎯 Đăng nhập"**
✅ **Expected**: Success → Shows "Xin chào, testuser!"

### Test Error Handling (30 seconds)
1. Try wrong password
2. See red error box appear
3. Switch to other tab
✅ **Expected**: Error disappears automatically

---

## 🎯 What to Look For

| Feature | What Happens |
|---------|-------------|
| **Tab Navigation** | Press Enter → moves to next field |
| **Auto-focus** | First field is ready to type immediately |
| **Loading State** | Button shows "⏳ " emoji during API call |
| **Success State** | Shows user welcome message + game modes |
| **Error State** | Red box with specific error message |
| **Error Clearing** | Disappears when switching tabs |

---

## 🐛 Common Issues

**Port 4000 already in use?**
```powershell
# Windows: Find and kill process
netstat -ano | findstr :4000
taskkill /PID <process_id> /F
```

**Database not found?**
```powershell
cd server
npm run db:init
```

**Cannot type in fields?**
- Click inside the form first to set focus
- Refresh the page (Ctrl+R)

---

## 📚 Full Documentation

- 📖 **TESTING_GUIDE.md** - Complete testing instructions
- 📝 **AUTH_SUMMARY.md** - Technical implementation details
- 🔐 **AUTH_README.md** (server/) - API documentation

---

## ✨ New Features Implemented

✅ Real JWT authentication  
✅ Tab/Enter keyboard navigation  
✅ Real-time error display  
✅ Loading state indicators  
✅ Email-based login  
✅ Auto-clear errors  
✅ Professional UX  

---

**Status**: 🚀 READY TO TEST  
**Time to test**: ~5 minutes  
**Backend**: localhost:4000  
**Frontend**: localhost:5173  

👉 **Start testing now!**
