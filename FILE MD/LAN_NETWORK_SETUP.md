# 🌐 LAN Network Setup Guide

## 🔥 Vấn đề: Máy khác không kết nối được

### Nguyên nhân:
1. ❌ Client hardcoded `localhost:4000` 
2. ❌ Vite chỉ listen trên localhost
3. ❌ Windows Firewall có thể block port 5173

## ✅ Giải pháp

### 1. Lấy IP của máy Server

**Windows:**
```powershell
ipconfig
```

**Linux/Mac:**
```bash
ifconfig
# hoặc
ip addr
```

**Ví dụ output:**
```
IPv4 Address: 192.168.23.19  ← Dùng IP này
```

### 2. Cấu hình Client

#### Option A: Sử dụng .env (Khuyến nghị)

**Trên máy Server (localhost):**
```bash
# File: client/.env
VITE_API_URL=http://localhost:4000/api
```

**Trên máy khác (LAN):**
```bash
# File: client/.env
VITE_API_URL=http://192.168.23.19:4000/api
```

#### Option B: Build với mode khác nhau

```bash
# Development (localhost)
npm run dev

# LAN mode (dùng .env.lan)
npm run dev -- --mode lan
```

### 3. Cấu hình Server

**File: `server/src/index.ts`**
```typescript
const HOST = '0.0.0.0'; // ✅ Đã có sẵn
const PORT = 4000;
```

**File: `client/vite.config.ts`**
```typescript
server: {
  host: '0.0.0.0', // ✅ Đã cập nhật
  port: 5173,
}
```

### 4. Mở Windows Firewall

**Option A: PowerShell (Run as Administrator)**
```powershell
# Cho phép port 4000 (Server)
New-NetFirewallRule -DisplayName "Tetris Server" -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow

# Cho phép port 5173 (Vite Dev Server)
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
```

**Option B: GUI**
1. Mở **Windows Defender Firewall** → Advanced Settings
2. **Inbound Rules** → New Rule
3. Chọn **Port** → TCP → Specific ports: `4000, 5173`
4. **Allow the connection**
5. Áp dụng cho **Domain, Private, Public**
6. Đặt tên: "Tetris Game Ports"

### 5. Restart Services

**Terminal 1 - Server:**
```bash
cd server
npm run dev
```

**Terminal 2 - Client:**
```bash
cd client
npm run dev
```

**Vite output sẽ hiển thị:**
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.23.19:5173/  ← Dùng link này từ máy khác
```

## 🧪 Testing

### Trên máy Server:
1. Mở browser: `http://localhost:5173`
2. Đăng nhập → OK ✅

### Trên máy khác (cùng LAN):
1. **Option 1:** Dùng IP trực tiếp
   - Mở browser: `http://192.168.23.19:5173`
   - Client tự động gọi API qua `http://192.168.23.19:4000`

2. **Option 2:** Build riêng cho máy đó
   - Copy source code sang máy khác
   - Tạo `.env` với `VITE_API_URL=http://192.168.23.19:4000/api`
   - Chạy `npm run dev`
   - Truy cập `http://localhost:5173` trên máy đó

## 🔍 Troubleshooting

### 1. Still can't connect?

**Check Server IP:**
```powershell
ipconfig | Select-String "IPv4"
```

**Test Server port:**
```powershell
# Trên máy khác
Test-NetConnection -ComputerName 192.168.23.19 -Port 4000
# Output: TcpTestSucceeded: True ✅
```

**Test Client port:**
```powershell
Test-NetConnection -ComputerName 192.168.23.19 -Port 5173
```

### 2. Firewall blocking?

**Tạm thời tắt firewall để test:**
```powershell
# Run as Administrator
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
```

**Sau khi test xong, BẬT LẠI:**
```powershell
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
```

### 3. CORS errors?

**File: `server/src/index.ts`**
```typescript
app.use(cors({
  origin: '*', // Allow all origins (dev only)
  credentials: true
}));
```

### 4. Environment variable không load?

**Restart Vite dev server:**
```bash
# Ctrl+C to stop
npm run dev
```

**Check env trong browser console:**
```javascript
console.log(import.meta.env.VITE_API_URL);
```

## 📋 Quick Checklist

### Máy Server:
- ✅ Server running trên `0.0.0.0:4000`
- ✅ Vite running trên `0.0.0.0:5173`
- ✅ Windows Firewall cho phép port 4000, 5173
- ✅ Biết IP của máy: `192.168.23.19`

### Máy khác:
- ✅ Cùng mạng LAN với máy server
- ✅ Có thể ping được máy server: `ping 192.168.23.19`
- ✅ `.env` file config đúng IP server
- ✅ Truy cập qua `http://192.168.23.19:5173`

## 🚀 Production Deployment

Nếu muốn deploy production, không dùng Vite dev server:

```bash
# Build client
cd client
npm run build

# Serve với nginx hoặc serve
npx serve -s dist -l 80

# Hoặc dùng nginx
# nginx.conf
server {
  listen 80;
  root /path/to/dist;
  
  location /api {
    proxy_pass http://localhost:4000;
  }
}
```

---

**Created:** 2025-10-13  
**Server IP:** 192.168.23.19  
**Server Port:** 4000  
**Client Port:** 5173  
