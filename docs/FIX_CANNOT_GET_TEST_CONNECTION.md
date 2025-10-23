# ⚡ QUICK FIX: Cannot GET /test-connection

**Error:** `Cannot GET /test-connection`  
**Cause:** Server chưa restart sau khi code thay đổi  
**Fix Time:** 30 seconds

---

## 🚀 SOLUTION

### **Step 1: Stop Server**

Vào terminal đang chạy server, nhấn **Ctrl+C** để stop

---

### **Step 2: Restart Server**

```powershell
cd server
npm run dev
```

**Expected output:**
```
> tetris-server@1.0.0 dev
> nodemon src/index.ts

[nodemon] starting `ts-node src/index.ts`
Loaded PG_USER = postgres
Versus server listening on http://0.0.0.0:4000
```

✅ Phải thấy: `Versus server listening on http://0.0.0.0:4000`

---

### **Step 3: Test Again**

```
http://localhost:4000/test-connection
```

✅ **Expected:** Trang HTML hiển thị với Socket.IO test

❌ **If still fails:** Xem troubleshooting bên dưới

---

## 🐛 TROUBLESHOOTING

### **Issue 1: Port 4000 already in use**

**Error message:**
```
Error: listen EADDRINUSE: address already in use :::4000
```

**Fix:**
```powershell
# Find process using port 4000
netstat -ano | Select-String ":4000.*LISTENING"

# Output example:
# TCP    0.0.0.0:4000    0.0.0.0:0    LISTENING    12345
#                                                   ↑ PID

# Kill the process (replace 12345 with actual PID)
taskkill /PID 12345 /F

# Start server again
npm run dev
```

---

### **Issue 2: Module not found errors**

**Error message:**
```
Error: Cannot find module 'express'
```

**Fix:**
```powershell
# Reinstall dependencies
cd server
npm install

# Start again
npm run dev
```

---

### **Issue 3: TypeScript compilation errors**

**Check for errors:**
```powershell
cd server
npm run build
```

**If errors appear:** Share the error message để tôi fix

---

### **Issue 4: Server starts but endpoint still not found**

**Check if endpoint is registered:**
```powershell
# In browser console (after server starts), try:
fetch('http://localhost:4000/health')
  .then(r => r.json())
  .then(d => console.log('Health check:', d))
```

✅ If `/health` works but `/test-connection` doesn't:
- File `server/src/index.ts` might have syntax error
- Check server console for error messages

---

## 📋 VERIFICATION CHECKLIST

After restart, verify:

- [ ] Terminal shows: `Versus server listening on http://0.0.0.0:4000`
- [ ] No error messages in terminal
- [ ] `http://localhost:4000/health` returns `{"ok":true}`
- [ ] `http://localhost:4000/test-connection` loads HTML page
- [ ] Socket.IO test shows green "Connected" status

---

## 🎯 EXPECTED BEHAVIOR

**URL:** `http://localhost:4000/test-connection`

**Should display:**
```
🔌 Server Connection Test
────────────────────────────────
Your IP: ::1 (or your IP)
Server IP: localhost:4000
Time: 2024-10-13T...

✅ HTTP Connection: OK
You successfully connected to the HTTP server!

🔌 Socket.IO Connection Test
⏳ Testing...
[After 1-2 seconds]
✅ Connected (ID: abc123xyz)

📋 Connection Logs
[Time] 🔌 Connecting to: http://localhost:4000
[Time] ✅ Socket.IO Connected! ID: abc123xyz
```

---

## 🔍 DEBUG COMMANDS

```powershell
# 1. Check if server is running
netstat -an | Select-String ":4000"
# Expected: TCP    0.0.0.0:4000    LISTENING

# 2. Check server logs
# Look for any error messages in the terminal

# 3. Test health endpoint
curl http://localhost:4000/health
# Expected: {"ok":true}

# 4. Test new endpoint
curl http://localhost:4000/test-connection
# Expected: HTML content (long response)

# 5. Check if nodemon is watching files
# Should see: [nodemon] watching extensions: ts,json
```

---

## 💡 WHY THIS HAPPENS

Node.js servers need to be **restarted** when:
- ✅ New routes/endpoints are added
- ✅ Middleware configuration changes
- ✅ Import statements change
- ❌ NOT needed for hot-reload with nodemon (but sometimes fails)

**Best practice:** Always restart after adding new endpoints

---

## 🚀 AFTER FIX

Once server restarts successfully:

1. ✅ Test `http://localhost:4000/test-connection` → Should work
2. ✅ Test `http://YOUR_IP:4000/test-connection` → Should work
3. ✅ Continue with STEP 5 in `FIX_CONNECTION_REFUSED.md`

---

**Next Steps:**
- Read: `FIX_CONNECTION_REFUSED.md` STEP 5 onwards
- Test from other device once localhost works

---

**Fix Time:** < 1 minute  
**Last Updated:** 2024-10-13
