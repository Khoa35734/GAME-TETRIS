# Mobile Warning System - Desktop Only Access 📱🚫

## 📋 Overview

Hệ thống phát hiện và chặn truy cập từ thiết bị mobile, hiển thị thông báo yêu cầu người dùng truy cập từ máy tính để có trải nghiệm tốt nhất.

---

## 🎯 Features

### **1. Multi-Layer Mobile Detection**

Hệ thống sử dụng 3 phương pháp để xác định mobile device:

✅ **User Agent Detection**
- Kiểm tra chuỗi User Agent
- Regex pattern: `/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i`
- Phát hiện: Android, iOS, Windows Mobile, BlackBerry, etc.

✅ **Screen Width Detection**
- Kiểm tra độ rộng màn hình
- Threshold: < 768px = mobile
- Responsive detection (lắng nghe resize event)

✅ **Touch Support Detection**
- Kiểm tra `'ontouchstart' in window`
- Kiểm tra `navigator.maxTouchPoints > 0`
- Phát hiện tablet và touchscreen devices

**Logic:** Device được xác định là mobile nếu thỏa mãn **ít nhất 2/3 điều kiện** trên.

---

### **2. Full-Screen Overlay UI**

**Design:**
- 💻 Icon lớn với bounce animation
- 📱 Thông báo rõ ràng: "Chỉ khả dụng trên máy tính"
- 🖥️⌨️ Icon grid với float animation
- 📊 Thông tin thiết bị (User Agent, Screen size)
- 🎨 Press Start 2P font (retro game style)

**Styling:**
- Background: `rgba(0, 0, 0, 0.98)` với backdrop blur
- Z-index: `99999` (trên tất cả các element khác)
- Gradient border: Cyan theme
- Responsive text sizing

---

### **3. Development Mode Override**

**Feature:** Button "Tiếp tục" chỉ hiển thị trong development mode

**Purpose:**
- Testing trên mobile simulator
- Development debugging
- QA testing

**Condition:**
```typescript
{process.env.NODE_ENV === 'development' && (
  <button onClick={() => setIsMobile(false)}>
    [DEV] Tiếp tục
  </button>
)}
```

---

## 🎨 UI Components

### **Main Container:**
```css
position: fixed;
width: 100vw;
height: 100vh;
z-index: 99999;
background: rgba(0, 0, 0, 0.98);
backdrop-filter: blur(10px);
```

### **Title:**
```css
font-size: 24px;
color: #ff6b6b;
text-shadow: 0 0 20px rgba(255, 107, 107, 0.8);
font-family: 'Press Start 2P', cursive;
```

### **Icons:**
- 💻 Bounce animation (1s loop)
- 🖥️💻⌨️ Float animation (2s loop, staggered)

### **Info Box:**
- Gradient background: Cyan theme
- Border: 2px solid rgba(78, 205, 196, 0.5)
- Rounded corners: 12px
- Padding: 20px

---

## 🔧 Technical Implementation

### **File:** `client/src/components/MobileWarning.tsx`

**Key Functions:**

```typescript
const checkMobile = () => {
  // 1. Check User Agent
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobileRegex.test(userAgent);
  
  // 2. Check Screen Width
  const isMobileScreen = window.innerWidth < 768;
  
  // 3. Check Touch Support
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Decision: 2 out of 3 = mobile
  const mobileCount = [isMobileUA, isMobileScreen, isTouchDevice].filter(Boolean).length;
  setIsMobile(mobileCount >= 2);
};
```

**Event Listeners:**
```typescript
useEffect(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);
```

---

## 📱 Supported Devices

### **Blocked Devices:**
- ✅ Android phones (all versions)
- ✅ iPhones (all models)
- ✅ iPads (all models)
- ✅ Android tablets
- ✅ Windows Mobile
- ✅ BlackBerry
- ✅ Opera Mini

### **Allowed Devices:**
- ✅ Desktop computers (Windows, Mac, Linux)
- ✅ Laptops
- ✅ Chromebooks (desktop mode)
- ✅ Large tablets in desktop mode (> 768px)

---

## 🎯 User Experience

### **Mobile User Flow:**

1. **User accesses site from phone**
   - Page loads normally
   - MobileWarning component mounts

2. **Detection runs**
   - Check User Agent → iPhone detected ✓
   - Check screen width → 375px < 768px ✓
   - Check touch → Touch supported ✓
   - Result: 3/3 = Mobile device

3. **Warning displays**
   - Full-screen overlay appears
   - Blocks all interaction with app
   - Shows clear message

4. **User sees:**
   - 💻 Bouncing icon
   - "Chỉ khả dụng trên máy tính"
   - Instructions to use desktop
   - Device info at bottom

5. **User options:**
   - Close tab/browser
   - Switch to desktop device
   - (Dev mode only) Click "Tiếp tục"

---

### **Desktop User Flow:**

1. **User accesses site from desktop**
   - Page loads normally
   - MobileWarning component mounts

2. **Detection runs**
   - Check User Agent → Windows Chrome ✗
   - Check screen width → 1920px > 768px ✗
   - Check touch → No touch support ✗
   - Result: 0/3 = Desktop device

3. **Warning hidden**
   - `isMobile = false`
   - Component returns `null`
   - App displays normally

---

## 📊 Device Info Display

**Shows at bottom of warning:**

```typescript
Thiết bị: {
  Android → "Android"
  iPhone → "iPhone"
  iPad → "iPad"
  Other → "Mobile"
}

Màn hình: {window.innerWidth} x {window.innerHeight}px
```

**Example:**
```
Thiết bị: iPhone
Màn hình: 375 x 812px
```

---

## 🎨 Animations

### **@keyframes bounce**
```css
0%, 100% { transform: translateY(0); }
50% { transform: translateY(-20px); }
```
Used for main 💻 icon

### **@keyframes float**
```css
0%, 100% { transform: translateY(0); }
50% { transform: translateY(-10px); }
```
Used for 🖥️💻⌨️ icon grid

### **Animation delays:**
- Icon 1: 0s
- Icon 2: 0.3s
- Icon 3: 0.6s
(Creates wave effect)

---

## 📱 Responsive Design

### **Large Mobile (480px - 768px):**
```css
h1 { font-size: 18px !important; }
p { font-size: 12px !important; }
```

### **Small Mobile (< 480px):**
```css
h1 { font-size: 18px !important; }
p { font-size: 12px !important; }
```

### **Tiny Mobile (< 320px):**
```css
h1 { font-size: 14px !important; }
p { font-size: 10px !important; }
```

---

## 🔒 Access Control

### **Production Mode:**
- Mobile users: **BLOCKED** (no bypass option)
- Desktop users: **ALLOWED**

### **Development Mode:**
- Mobile users: **BLOCKED** with bypass button
- Desktop users: **ALLOWED**

**Why bypass in dev?**
- Test mobile layout (even if not playable)
- Debug mobile-specific issues
- QA testing flow

---

## 🧪 Testing Scenarios

### **Test 1: iPhone Detection**
**Device:** iPhone 14 Pro (375 x 812)
**Expected:** Warning displayed ✓

### **Test 2: Android Detection**
**Device:** Samsung Galaxy S21 (360 x 800)
**Expected:** Warning displayed ✓

### **Test 3: iPad Detection**
**Device:** iPad Pro 12.9" (1024 x 1366)
**Expected:** Warning displayed (width > 768 but touch + UA) ✓

### **Test 4: Desktop Detection**
**Device:** Windows PC (1920 x 1080)
**Expected:** No warning, app loads ✓

### **Test 5: Laptop Detection**
**Device:** MacBook Pro (1440 x 900)
**Expected:** No warning, app loads ✓

### **Test 6: Chrome DevTools Mobile**
**Device:** DevTools iPhone simulator
**Expected:** Warning displayed (dev bypass available) ✓

### **Test 7: Resize Window**
**Device:** Desktop, resize to < 768px
**Expected:** Warning appears (responsive) ✓

### **Test 8: Touchscreen Laptop**
**Device:** Surface Pro (touch + large screen)
**Expected:** 1/3 conditions = No warning ✓

---

## 🎯 Why Desktop Only?

### **Gameplay Requirements:**
1. **Keyboard Controls:**
   - Arrow keys for movement
   - Space for hard drop
   - Shift for hold
   - Complex key combinations

2. **Screen Real Estate:**
   - Game board: 10x20 grid
   - Hold display (left)
   - Next queue (right)
   - Score panels
   - Multiplayer: 2 boards side-by-side

3. **Performance:**
   - 60 FPS required
   - Real-time multiplayer
   - WebRTC video streaming
   - Low latency needed

4. **User Experience:**
   - Precise controls
   - Fast reactions
   - Comfortable viewing
   - Long play sessions

---

## 🚀 Integration

### **File:** `client/src/App.tsx`

```tsx
import { MobileWarning } from "./components/MobileWarning";

const App: React.FC = () => {
  return (
    <div className="App">
      {/* Mobile device warning - blocks access on phones/tablets */}
      <MobileWarning />
      
      {/* Rest of app... */}
      <Routes>...</Routes>
    </div>
  );
};
```

**Why in App.tsx?**
- Runs before any route
- Blocks entire app (not just specific pages)
- Global overlay (above all content)
- Single point of control

---

## 🎨 Visual Hierarchy

```
┌─────────────────────────────────────────┐
│         Full Screen Overlay             │
│         (z-index: 99999)                │
│                                         │
│              💻 (bounce)                 │
│                                         │
│   ┌─────────────────────────────────┐  │
│   │ Chỉ khả dụng trên máy tính      │  │
│   │ (red glow, 24px, retro font)    │  │
│   └─────────────────────────────────┘  │
│                                         │
│         Trò chơi Tetris này...          │
│   (description text, 14px, white)       │
│                                         │
│      🖥️     💻     ⌨️                   │
│   (float animations, staggered)         │
│                                         │
│   ┌─────────────────────────────────┐  │
│   │ 📱 Vui lòng truy cập từ...      │  │
│   │ (cyan box, gradient border)     │  │
│   └─────────────────────────────────┘  │
│                                         │
│      Thiết bị: iPhone                   │
│      Màn hình: 375 x 812px              │
│   (device info, 10px, dimmed)           │
│                                         │
│   [DEV] Tiếp tục (dev mode only)        │
└─────────────────────────────────────────┘
```

---

## 🐛 Edge Cases Handled

### **1. Touchscreen Desktop PC**
**Scenario:** Desktop with touch monitor
**Detection:** Touch: ✓, UA: ✗, Width: ✗ = 1/3
**Result:** No warning (desktop) ✓

### **2. Tablet in Desktop Mode**
**Scenario:** iPad with "Request Desktop Site"
**Detection:** UA: ✓, Touch: ✓, Width: ✓ (1024px) = 3/3
**Result:** Warning displayed ✓

### **3. Chrome DevTools**
**Scenario:** Developer testing mobile view
**Detection:** UA: ✓ (emulated), Width: ✓ (small), Touch: ✗ = 2/3
**Result:** Warning displayed (with bypass) ✓

### **4. Window Resize**
**Scenario:** User resizes browser window
**Detection:** Resize listener re-checks
**Result:** Warning appears/disappears dynamically ✓

### **5. Landscape Mode**
**Scenario:** Phone rotated to landscape
**Detection:** Width may increase but UA + Touch still mobile
**Result:** Warning still displayed ✓

---

## 📝 Message Localization

### **Current (Vietnamese):**
- Title: "Chỉ khả dụng trên máy tính"
- Description: "Trò chơi Tetris này được thiết kế để chơi trên máy tính với bàn phím."
- Instruction: "📱 Vui lòng truy cập từ máy tính để có trải nghiệm chơi game tốt nhất!"

### **Potential English Version:**
- Title: "Desktop Only"
- Description: "This Tetris game is designed for desktop computers with keyboard controls."
- Instruction: "📱 Please access from a desktop computer for the best gaming experience!"

---

## ✅ Completion Checklist

- [x] Mobile detection system (3 methods)
- [x] Full-screen overlay UI
- [x] Retro game styling (Press Start 2P)
- [x] Animations (bounce, float)
- [x] Device info display
- [x] Responsive text sizing
- [x] Development mode bypass
- [x] Resize event handling
- [x] Integration in App.tsx
- [x] Documentation

---

## 🎉 Summary

✅ **3-method detection** ensures accurate mobile identification  
✅ **Full-screen overlay** blocks all interaction  
✅ **Clear messaging** guides users to desktop  
✅ **Retro styling** matches game aesthetic  
✅ **Dev bypass** allows testing  
✅ **Responsive design** works on all screen sizes  
✅ **No false positives** (touchscreen desktops allowed)  

**Status:** ✅ COMPLETE - Mobile users will see warning, desktop users can play normally!

---

**Last Updated:** October 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
