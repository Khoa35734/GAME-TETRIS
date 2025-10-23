# 🔥 FIX CONNECTION_REFUSED - Kết nối từ máy khác

**Problem:** Máy khác không thể kết nối đến server (CONNECTION_REFUSED)  
**Date:** 2024-10-13  
**Status:** ✅ Solution Ready

---

## 🎯 NGUYÊN NHÂN

CONNECTION_REFUSED khi kết nối từ máy khác thường do:

1. ❌ **Windows Firewall block port 4000**
2. ❌ **Server bind sai interface** (127.0.0.1 thay vì 0.0.0.0)
3. ❌ **Client connect sai IP**
4. ❌ **Không cùng WiFi network**
5. ❌ **VPN đang bật**

---

## ✅ GIẢI PHÁP ĐÃ TRIỂN KHAI

### **1. Enhanced Server Configuration**
✅ Server đã được cấu hình bind `0.0.0.0` (all interfaces)
✅ Socket.IO CORS cho phép tất cả origins
✅ Thêm detailed connection logging
✅ Thêm test page: `/test-connection`

### **2. New Test Endpoint**
✅ Tạo endpoint `/test-connection` để test từ browser
✅ Realtime Socket.IO connection test
✅ Hiển thị client IP và server IP

### **3. Connection Logging**
✅ Log tất cả connections với IP address
✅ Log transport type (websocket/polling)
✅ Log upgrades và disconnections

---

## 🚀 CÁCH FIX (TỪNG BƯỚC)

### **STEP 1: Kiểm tra IP Server**

```powershell
# Chạy command này trên máy SERVER
ipconfig | Select-String "IPv4"
```

**Output example:**
```
IPv4 Address. . . . . . . . . . . : 192.168.10.108  ← Đây là IP server
IPv4 Address. . . . . . . . . . . : 192.168.56.1    ← Bỏ qua (VirtualBox)
```

✅ **Ghi nhớ IP server** (ví dụ: `192.168.10.108`)

---

### **STEP 2: Kiểm tra Server đang chạy**

```powershell
# Trên máy SERVER
netstat -an | Select-String ":4000"
```

**Expected output:**
```
TCP    0.0.0.0:4000           0.0.0.0:0              LISTENING  ← Phải có dòng này!
```

✅ Nếu thấy `0.0.0.0:4000 LISTENING` → Server đang chạy OK  
❌ Nếu KHÔNG thấy → Start server: `cd server && npm run dev`

---

### **STEP 3: Mở Windows Firewall**

**Option A: Dùng script tự động (RECOMMENDED)**

```powershell
# Chạy PowerShell AS ADMINISTRATOR
cd E:\PBL4\GAME-TETRIS
.\setup-firewall.ps1
```

Script sẽ tự động:
- ✅ Detect IP addresses
- ✅ Check server status
- ✅ Create firewall rules
- ✅ Test connection

**Option B: Mở thủ công**

1. Mở **Windows Defender Firewall with Advanced Security**
2. Click **Inbound Rules** → **New Rule**
3. Select **Port** → Click Next
4. Select **TCP** → Specific local ports: **4000** → Next
5. Select **Allow the connection** → Next
6. Check all profiles (Domain, Private, Public) → Next
7. Name: **Tetris Game Server** → Finish
8. Repeat for **Outbound Rules**

---

### **STEP 4: Test từ Browser trên máy SERVER**

```
http://localhost:4000/test-connection
```

✅ **Expected:** Trang hiển thị "✅ HTTP Connection: OK" và "✅ Socket.IO Connected"

❌ **Nếu fail:** Server không chạy hoặc có lỗi code

---

### **STEP 5: Test từ Browser trên máy SERVER (LAN IP)**

```
http://192.168.10.108:4000/test-connection
```

(Thay `192.168.10.108` bằng IP server của bạn)

✅ **Expected:** Trang hiển thị giống localhost  
❌ **Nếu fail:** Firewall đang block port 4000

---

### **STEP 6: Test từ máy KHÁC (cùng WiFi)**

**Trên máy khác:**

1. Đảm bảo **cùng WiFi** với máy server
2. Mở browser
3. Truy cập: `http://192.168.10.108:4000/test-connection`

✅ **Expected:** 
- HTTP Connection: OK
- Socket.IO Connected với Socket ID

❌ **Nếu fail:** Xem phần Troubleshooting bên dưới

---

### **STEP 7: Test Client App từ máy KHÁC**

```
http://192.168.10.108:5173
```

✅ **Expected:** Trang chủ game hiển thị  
✅ Login → Không có lỗi CONNECTION_REFUSED

---

## 🐛 TROUBLESHOOTING

### **Issue 1: "This site can't be reached" / CONNECTION_REFUSED**

**Check 1: Cùng WiFi network không?**
```powershell
# Trên máy SERVER
ipconfig | Select-String "IPv4"

# Trên máy KHÁC
ipconfig | Select-String "IPv4"
```

✅ Cả 2 phải cùng subnet (ví dụ: 192.168.10.x)  
❌ Nếu khác subnet → Connect cùng WiFi

---

**Check 2: Firewall có mở không?**
```powershell
# Trên máy SERVER (as Administrator)
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*Tetris*" }
```

✅ Phải có 2 rules (Inbound + Outbound) với Enabled = True  
❌ Nếu không có → Chạy `.\setup-firewall.ps1`

---

**Check 3: VPN có bật không?**
- Tắt VPN trên máy server
- Tắt VPN trên máy client
- Test lại

---

**Check 4: Antivirus có block không?**
- Tạm thời disable antivirus
- Test lại
- Nếu OK → Add exception cho port 4000

---

### **Issue 2: HTTP works nhưng Socket.IO fails**

**Triệu chứng:**
- `http://192.168.10.108:4000/test-connection` load được trang
- Nhưng Socket.IO status = ❌ Connection Error

**Fix:**
```powershell
# Check server logs
# Phải thấy:
🔌 [Socket.IO Engine] New connection from ::ffff:192.168.10.246 via polling
```

Nếu KHÔNG thấy log này → CORS issue hoặc transport issue

**Solution:**
1. Check `server/src/index.ts` line ~110:
   ```typescript
   const io = new Server(server, {
     cors: { 
       origin: '*',  // ← Phải là '*'
       methods: ['GET', 'POST'],
       credentials: true
     },
     transports: ['websocket', 'polling'] // ← Phải có cả 2
   });
   ```

2. Restart server
3. Hard refresh browser (Ctrl+Shift+R)

---

### **Issue 3: Test page OK nhưng Client app fails**

**Check client `.env`:**
```properties
VITE_API_URL=http://192.168.10.108:4000/api
```

✅ IP phải đúng  
❌ Nếu sai → Update và restart Vite

**Check `socket.ts`:**
```typescript
import { getApiBaseUrl } from './services/apiConfig';
const getServerUrl = (): string => {
  const apiUrl = getApiBaseUrl();
  return apiUrl.replace('/api', ''); // ← Phải remove /api
};
```

---

### **Issue 4: Router firewall block**

Nếu đang ở công ty/trường học với corporate network:
- Router có thể block traffic giữa các devices
- **Solution:** Dùng hotspot từ điện thoại để test

---

## 📊 CHECK LIST

Trước khi báo lỗi, check tất cả các điều sau:

- [ ] Server đang chạy (`netstat -an | Select-String ":4000"`)
- [ ] Thấy `0.0.0.0:4000 LISTENING` trong netstat
- [ ] Windows Firewall rules đã tạo (`Get-NetFirewallRule | Where Tetris`)
- [ ] Cả 2 máy cùng WiFi (cùng subnet 192.168.x.x)
- [ ] VPN đã tắt trên cả 2 máy
- [ ] Test page works: `http://SERVER_IP:4000/test-connection`
- [ ] Socket.IO connects trên test page
- [ ] Client `.env` có đúng IP không
- [ ] Đã restart Vite sau khi sửa .env

---

## 🧪 TEST COMMANDS

**Test từ máy SERVER:**
```powershell
# Test localhost
curl http://localhost:4000/health

# Test LAN IP
curl http://192.168.10.108:4000/health

# Check listening ports
netstat -an | Select-String ":4000"

# Check firewall rules
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*Tetris*" }
```

**Test từ máy KHÁC:**
```powershell
# Test HTTP
curl http://192.168.10.108:4000/health

# Test DNS (should fail, expected)
ping 192.168.10.108

# Check your IP (should be same subnet)
ipconfig | Select-String "IPv4"
```

---

## 📝 SERVER LOGS

**Khi máy khác connect thành công, server logs sẽ có:**

```
🔌 [Socket.IO Engine] New connection from ::ffff:192.168.10.246 via polling
⬆️ [Socket.IO Engine] Connection upgraded to websocket from ::ffff:192.168.10.246
🔐 [Login] Authenticating socket with accountId: 456
🟢 [Online] User 456 connected (socket: def456uvw)
```

**Nếu KHÔNG thấy logs này → Connection bị block trước khi đến server**

---

## 🎯 QUICK FIX SUMMARY

1. ✅ Check IP server: `ipconfig | Select-String "IPv4"`
2. ✅ Check server running: `netstat -an | Select-String ":4000"`
3. ✅ Run firewall script: `.\setup-firewall.ps1` (as Admin)
4. ✅ Test page: `http://SERVER_IP:4000/test-connection`
5. ✅ Test from other device (same WiFi)

**Estimated time:** 5-10 minutes

---

## 🔗 RELATED FILES

- `server/src/index.ts` - Line ~110: Socket.IO config
- `setup-firewall.ps1` - Automatic firewall setup
- `AUTO_IP_SYNC.md` - IP auto-detection docs

---

## 📞 STILL NOT WORKING?

**Debug steps:**

1. **On SERVER machine:**
   - Open: `http://localhost:4000/test-connection`
   - Screenshot the page
   - Copy server console logs

2. **On OTHER machine:**
   - Open: `http://SERVER_IP:4000/test-connection`
   - Screenshot the page
   - Screenshot browser console (F12)

3. **Check both machines:**
   - Same WiFi SSID?
   - VPN disabled?
   - Firewall rules exist?

Share screenshots để debug tiếp!

---

**Last Updated:** 2024-10-13  
**Status:** ✅ Solution Ready
