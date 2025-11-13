import { Express } from 'express';
import { normalizeIp } from '../libs/helpers';
import { onlineUsers } from '../core/state';

export function mountTestPages(app: Express) {
  // Test connection page
  app.get('/test-connection', (req, res) => {
    const clientIp = normalizeIp(
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip
    );
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Connection Test</title>
        <style>
          body { font-family: monospace; padding: 20px; background: #1a1a2e; color: #eee; }
          .success { color: #00ff00; }
          .error { color: #ff0000; }
          .info { color: #00ffff; }
          .test { margin: 10px 0; padding: 10px; background: #16213e; border-radius: 5px; }
          button { background: #4ecdc4; color: #000; border: none; padding: 10px 20px; margin: 5px; cursor: pointer; border-radius: 5px; }
          button:hover { background: #45b7aa; }
        </style>
      </head>
      <body>
        <h2>🔌 Server Connection Test</h2>
        <div class="test">
          <div><strong>Your IP:</strong> <span class="info">${clientIp}</span></div>
          <div><strong>Server IP:</strong> <span class="info">${req.headers.host}</span></div>
          <div><strong>Time:</strong> <span class="info">${new Date().toISOString()}</span></div>
        </div>

        <div class="test">
          <h3>✅ HTTP Connection: <span class="success">OK</span></h3>
          <p>You successfully connected to the HTTP server!</p>
        </div>

        <div class="test">
          <h3>🔌 Socket.IO Connection Test</h3>
          <div id="socket-status">⏳ Testing...</div>
          <button onclick="reconnect()">🔄 Reconnect</button>
        </div>

        <div class="test">
          <h3>📋 Connection Logs</h3>
          <div id="logs" style="max-height: 300px; overflow-y: auto; background: #0a0a0a; padding: 10px; border-radius: 5px;"></div>
        </div>

        <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
        <script>
          let socket;
          const logsEl = document.getElementById('logs');
          const statusEl = document.getElementById('socket-status');

          function log(msg, color = '#eee') {
            const time = new Date().toLocaleTimeString();
            logsEl.innerHTML += \`<div style="color: \${color}">[\${time}] \${msg}</div>\`;
            logsEl.scrollTop = logsEl.scrollHeight;
          }

          function connect() {
            const url = location.origin;
            log('🔌 Connecting to: ' + url, '#00ffff');
            
            socket = io(url, {
              transports: ['websocket', 'polling'],
              reconnection: true
            });

            socket.on('connect', () => {
              log('✅ Socket.IO Connected! ID: ' + socket.id, '#00ff00');
              statusEl.innerHTML = '<span class="success">✅ Connected (ID: ' + socket.id + ')</span>';
            });

            socket.on('connect_error', (err) => {
              log('❌ Connection Error: ' + err.message, '#ff0000');
              statusEl.innerHTML = '<span class="error">❌ Connection Failed: ' + err.message + '</span>';
            });

            socket.on('disconnect', (reason) => {
              log('⚠️ Disconnected: ' + reason, '#ffff00');
              statusEl.innerHTML = '<span class="error">⚠️ Disconnected: ' + reason + '</span>';
            });

            socket.on('reconnect_attempt', () => {
              log('🔄 Attempting to reconnect...', '#ffff00');
            });
          }

          function reconnect() {
            if (socket) socket.disconnect();
            logsEl.innerHTML = '';
            connect();
          }

          connect();
        </script>
      </body>
      </html>
    `);
  });

  // Server LAN IPs
  app.get('/api/server-info', (_req, res) => {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];
    const PORT = Number(process.env.PORT) || 4000;
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }
    res.json({
      ok: true,
      serverIPs: addresses,
      port: PORT,
      apiBaseUrl: addresses.length > 0 ? `http://${addresses[0]}:${PORT}/api` : `http://localhost:${PORT}/api`,
    });
  });

  // Online users debug
  app.get('/api/debug/online-users', (_req, res) => {
    res.json({
      ok: true,
      onlineUsers: Array.from(onlineUsers.entries()).map(([userId, socketId]) => ({
        userId,
        socketId,
      })),
      totalOnline: onlineUsers.size,
    });
  });

  // Whoami
  app.get('/whoami', (req, res) => {
    const raw = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const ip = normalizeIp(raw);
    res.json({ ip });
  });

  // WebSocket test page
  app.get('/ws-test', (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html>
    <html>
      <head><meta charset="utf-8" /><title>WS Test</title></head>
      <body style="font-family: sans-serif;">
        <h3>Socket Test</h3>
        <div id="log"></div>
        <input id="msg" placeholder="type message"/>
        <button id="send">Send</button>
        <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
        <script>
          const log = (...a)=>{
            const el = document.getElementById('log');
            const p = document.createElement('div'); p.textContent = a.join(' ');
            el.appendChild(p);
          };
          const url = location.origin.replace(/^http/,'ws').replace(/^ws\\:/,'http:');
          const socket = io(url, { transports: ['websocket','polling'] });
          socket.on('connect', ()=>{ log('connected:', socket.id); socket.emit('ping'); });
          socket.on('pong', ()=> log('pong')); 
          socket.on('chat:message', (data)=> log('chat:', JSON.stringify(data)));
          document.getElementById('send').onclick = ()=>{
            const v = document.getElementById('msg').value; socket.emit('chat:message', { text: v });
          };
        </script>
      </body>
    </html>`);
  });
}