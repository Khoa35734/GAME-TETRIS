# 🎮 Tetris Game - LAN Setup (Quick Guide)

## 🚀 Cách setup để máy khác chơi cùng (LAN)

### Bước 1: Chạy Auto Setup (Khuyến nghị)
```powershell
.\quick-start-lan.ps1
```
Script này sẽ tự động:
- ✅ Detect IP của máy server
- ✅ Tạo file `.env` với config đúng
- ✅ Hướng dẫn start server/client

### Bước 2: Setup Firewall (Chỉ cần làm 1 lần)
```powershell
# Right-click PowerShell → Run as Administrator
.\setup-firewall.ps1
```

### Bước 3: Start Services
**Terminal 1:**
```bash
cd server
npm run dev
```

**Terminal 2:**
```bash
cd client
npm run dev
```

### Bước 4: Kết nối
**Máy server:**
- `http://localhost:5173`

**Máy khác (cùng LAN):**
- `http://192.168.23.19:5173` (thay IP bằng IP máy server)

---

## 🔧 Manual Setup (Nếu auto script không work)

### 1. Lấy IP của máy server:
```powershell
ipconfig
# Tìm dòng IPv4 Address: 192.168.x.x
```

### 2. Tạo file `client/.env`:
```env
VITE_API_URL=http://192.168.23.19:4000/api
```
(Thay `192.168.23.19` bằng IP thực của máy server)

### 3. Mở Firewall:
- Mở **Windows Defender Firewall with Advanced Security**
- **Inbound Rules** → **New Rule**
- Chọn **Port** → TCP → Ports: `4000, 5173`
- **Allow the connection** → Next → Next
- Đặt tên: "Tetris Game" → Finish

### 4. Start services (giống bước 3 ở trên)

---

## ❓ Troubleshooting

### Máy khác vẫn không kết nối được?

**1. Test ping:**
```bash
ping 192.168.23.19
```

**2. Test port:**
```powershell
Test-NetConnection -ComputerName 192.168.23.19 -Port 4000
# Output: TcpTestSucceeded: True ✅
```

**3. Tạm tắt firewall để test:**
```powershell
# Run as Administrator
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False

# Sau khi test xong, BẬT LẠI:
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
```

### Browser console báo lỗi CORS?

Không sao! Server đã config CORS với `cors()` middleware.

### Vite không hiển thị Network URL?

Check `client/vite.config.ts`:
```typescript
server: {
  host: '0.0.0.0', // ✅ Must have this
  port: 5173,
}
```

---

## 📁 Files Created

- ✅ `client/.env` - Client environment config
- ✅ `client/.env.lan` - LAN mode template
- ✅ `setup-firewall.ps1` - Auto firewall setup
- ✅ `quick-start-lan.ps1` - Auto LAN configuration
- ✅ `FILE MD/LAN_NETWORK_SETUP.md` - Full documentation

---

**Happy Gaming! 🎮**
