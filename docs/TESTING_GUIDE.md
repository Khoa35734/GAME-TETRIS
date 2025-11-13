# 🧪 Testing Guide - Authentication System

## ✅ What's Been Updated

### Frontend (HomeMenu.tsx)
- ✨ **Real API Integration**: Connected to backend authentication service
- 🔑 **Login Form**: Email + Password with real JWT authentication
- 📝 **Register Form**: Username + Email + Password + Confirm Password
- ⌨️ **Keyboard Navigation**: Tab/Enter moves between fields smoothly
- 🚨 **Error Display**: Real-time error messages from API
- ⏳ **Loading States**: Visual feedback during API calls
- 🎨 **Emoji Indicators**: 
  - Login: "🎯 Đăng nhập" → "⏳ Đang đăng nhập..."
  - Register: "✨ Đăng ký ngay" → "⏳ Đang tạo tài khoản..."

### Backend (server/)
- 🔐 **Authentication Routes**: `/api/auth/register`, `/api/auth/login`, `/api/auth/verify`
- 🗄️ **Database**: PostgreSQL with `account` table
- 🔒 **Security**: bcrypt password hashing, JWT tokens (7-day expiry)
- ✅ **Validation**: Email format, password strength, duplicate prevention

## 🚀 Quick Start Testing

### Step 1: Start Backend Server
```powershell
cd server
npm run dev
```
Expected output:
```
🚀 Server running on http://localhost:4000
🔗 PostgreSQL connected successfully
```

### Step 2: Start Frontend
```powershell
cd client
npm run dev
```
Expected output:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Step 3: Open Browser
Navigate to: http://localhost:5173/

## 🧪 Test Scenarios

### Test 1: Tab Navigation (Login Form)
1. Click on "Đăng nhập" tab
2. **Press Tab** → Focus moves to Email field
3. **Press Tab** → Focus moves to Password field
4. **Press Enter** → Attempts login (will show error if empty)
5. ✅ **Expected**: Smooth focus movement, no page scrolling

### Test 2: Tab Navigation (Register Form)
1. Click on "Đăng ký" tab
2. **Press Tab** → Focus moves to Username field
3. **Press Tab** → Focus moves to Email field
4. **Press Tab** → Focus moves to Password field
5. **Press Tab** → Focus moves to Confirm Password field
6. **Press Enter** → Attempts registration
7. ✅ **Expected**: Smooth navigation through all fields

### Test 3: Register New User
1. Switch to "Đăng ký" tab
2. Fill in:
   - **Username**: testuser123
   - **Email**: testuser@example.com
   - **Password**: SecurePass123!
   - **Confirm Password**: SecurePass123!
3. Click "✨ Đăng ký ngay"
4. ✅ **Expected**:
   - Button changes to "⏳ Đang tạo tài khoản..."
   - Success: Auto-login and show game modes menu
   - Error: Red error box appears above form

### Test 4: Login with Created User
1. Switch to "Đăng nhập" tab
2. Fill in:
   - **Email**: testuser@example.com
   - **Password**: SecurePass123!
3. Click "🎯 Đăng nhập"
4. ✅ **Expected**:
   - Button changes to "⏳ Đang đăng nhập..."
   - Success: Show "Xin chào, testuser123!" and game modes
   - Error: Red error box with specific error message

### Test 5: Error Handling
1. Try to register with existing email:
   - ❌ **Expected**: "Email đã được sử dụng"
2. Try weak password (e.g., "123"):
   - ❌ **Expected**: "Mật khẩu phải có ít nhất 6 ký tự"
3. Try invalid email format (e.g., "notanemail"):
   - ❌ **Expected**: "Email không hợp lệ"
4. Try mismatched passwords:
   - ❌ **Expected**: "Mật khẩu xác nhận không khớp"
5. Try wrong login password:
   - ❌ **Expected**: "Email hoặc mật khẩu không chính xác"

### Test 6: Error Clearing
1. Trigger an error (e.g., wrong password)
2. See red error box appear
3. **Click on opposite tab** (Login ↔ Register)
4. ✅ **Expected**: Error box disappears immediately

### Test 7: Loading States
1. Fill in register form
2. Click submit button
3. During loading:
   - ✅ All input fields should be disabled (opacity 0.6)
   - ✅ Submit button shows "⏳ " emoji
   - ✅ Cursor changes to "not-allowed"
   - ✅ Cannot interact with form fields

### Test 8: Guest Play (Fallback)
1. Click "HOẶC" divider below forms
2. Click "Chơi với tư cách Khách" button
3. ✅ **Expected**: 
   - Alert shows guest username
   - Can play without authentication

## 🔍 Backend Testing (Optional)

### Test Database Initialization
```powershell
cd server
npm run db:init
```
✅ **Expected**: Creates `account` table with proper columns

### Test API Endpoints Directly
```powershell
cd server
npm run test:auth
```
✅ **Expected**: All 7 tests pass (register, login, verify, etc.)

## 🐛 Troubleshooting

### Problem: "Network Error" in browser
**Solution**: Make sure backend server is running on port 4000
```powershell
cd server
npm run dev
```

### Problem: Database connection error
**Solution**: Check PostgreSQL credentials in `server/src/postgres.ts`
- Default: localhost:5432, username: `postgres`, database: `Tetris`

### Problem: Tab navigation not working
**Solution**: Make sure you're clicking inside the form first to set initial focus

### Problem: Error doesn't clear when switching tabs
**Solution**: Already fixed! Error should clear automatically now.

### Problem: Button still shows loading after error
**Solution**: Check browser console for JavaScript errors, refresh page

## 📊 Expected API Responses

### Successful Registration
```json
{
  "success": true,
  "message": "Tạo tài khoản thành công!",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "testuser123",
    "email": "testuser@example.com",
    "eloRating": 1000
  }
}
```

### Successful Login
```json
{
  "success": true,
  "message": "Đăng nhập thành công!",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "testuser123",
    "email": "testuser@example.com",
    "eloRating": 1000,
    "gamesPlayed": 0
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Email đã được sử dụng"
}
```

## ✨ Features Implemented

| Feature | Status | Description |
|---------|--------|-------------|
| Tab Navigation | ✅ | Enter key moves between fields |
| Real-time Errors | ✅ | Display API errors instantly |
| Loading States | ✅ | Disable inputs during API calls |
| Emoji Feedback | ✅ | Visual loading indicators |
| Error Clearing | ✅ | Clear errors when switching tabs |
| Email Login | ✅ | Changed from username to email |
| Password Validation | ✅ | Backend validates strength |
| JWT Authentication | ✅ | Secure token-based auth |
| Auto-focus | ✅ | First field focused on mount |

## 📝 Notes

1. **Passwords are securely hashed** using bcrypt before storage
2. **JWT tokens expire after 7 days** - automatic logout
3. **Email must be unique** - cannot register twice with same email
4. **Guest play still works** - no authentication required for guest mode
5. **All form data is validated** both frontend and backend

## 🎯 Success Criteria

✅ All tests pass  
✅ No console errors  
✅ Smooth keyboard navigation  
✅ Clear error messages  
✅ Fast loading feedback  
✅ Professional UX  

---

**Last Updated**: Today  
**Backend Port**: 4000  
**Frontend Port**: 5173  
**Database**: PostgreSQL (Tetris)
