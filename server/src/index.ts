import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
console.log('Loaded PG_USER =', process.env.PG_USER);

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import {
  initRedis,
  redis,
  saveRoom,
  deleteRoom,
  addToRankedQueue,
  removeFromRankedQueue,
  popBestMatch,
  storeSocketUser,
  removeSocketUser,
  getSocketUserInfo,
} from './redisStore';
import { initPostgres, sequelize } from './postgres';
import authRouter from './routes/auth';
import settingsRouter from './routes/settings';
import friendsRouter from './routes/friends';
import matchesRouter from './routes/matches';
import feedbacksRouter from './routes/feedbacks';
import reportsRouter from './routes/reports';
import broadcastsRouter from './routes/broadcasts';
import adminRoutes from './routes/admin';
import { matchManager, MatchData, PlayerMatchState } from './matchManager';
import { setupFriendshipAssociations } from './models/Friendship';
import MatchmakingSystem from './matchmaking';
import BO3MatchManager from './bo3MatchManager';
import { QueryTypes } from 'sequelize';

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0'; // bind all interfaces for LAN access

const app = express();

// Add JSON body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function normalizeIp(ip: string | undefined | null): string {
  if (!ip) return '';
  let v = String(ip).trim();
  if (v.startsWith('::ffff:')) v = v.slice(7);
  if (v === '::1') v = '127.0.0.1';
  return v;
}

app.use(cors());



app.get('/api/reports', async (_req, res) => {
  try {
    console.log('[GET /api/reports] Fetching reports from database...');
    const result = await sequelize.query(
      `
      SELECT 
        ur.report_id AS id,
        ur.reporter_id,
        u1.user_name AS reporter_name,
        ur.reported_user_id,
        u2.user_name AS reported_user_name,
        ur.report_type AS type,
        ur.description AS message,
        ur.status,
        ur.evidence_url,
        ur.created_at
      FROM user_reports ur
      LEFT JOIN users u1 ON ur.reporter_id = u1.user_id
      LEFT JOIN users u2 ON ur.reported_user_id = u2.user_id
      ORDER BY ur.created_at DESC
      LIMIT 100
      `,
      { type: QueryTypes.SELECT }
    );
    res.json(result);
  } catch (err) {
    console.error('[GET /api/reports] Database Error:', err);
    res.status(500).json({
      error: 'Database error',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// Get feedbacks from `feedback` table
app.get('/api/feedbacks', async (_req, res) => {
  try {
    console.log('[GET /api/feedbacks] Fetching feedbacks from database...');
    const result = await sequelize.query(
      `
      SELECT 
        f.feedback_id AS id,
        f.user_id,
        u.user_name,
        f.category,
        f.subject,
        f.description AS message,
        f.status,
        f.admin_response,
        f.created_at
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.user_id
      ORDER BY f.created_at DESC
      LIMIT 100
      `,
      { type: QueryTypes.SELECT }
    );
    res.json(result);
  } catch (err) {
    console.error('[GET /api/feedbacks] Database Error:', err);
    res.status(500).json({
      error: 'Database error',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// Get broadcasts from `broadcast_messages` table
app.get('/api/broadcasts', async (_req, res) => {
  try {
    console.log('[GET /api/broadcasts] Fetching broadcasts from database...');
    const result = await sequelize.query(
      `
      SELECT 
        bm.message_id AS id,
        bm.title,
        bm.content AS message,
        bm.message_type,
        bm.priority,
        bm.is_active,
        u.user_name AS admin_name,
        bm.start_date,
        bm.end_date,
        bm.created_at AS sent_at
      FROM broadcast_messages bm
      LEFT JOIN users u ON bm.admin_id = u.user_id
      ORDER BY bm.created_at DESC
      LIMIT 50
      `,
      { type: QueryTypes.SELECT }
    );
    res.json(result);
  } catch (err) {
    console.error('[GET /api/broadcasts] Database Error:', err);
    res.status(500).json({
      error: 'Database error',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// Get rooms from Redis
app.get('/api/rooms', async (_req, res) => {
  try {
    console.log('[GET /api/rooms] Fetching rooms from Redis...');
    const matchKeys = await redis.keys('match:*');
    const rooms = [];
    for (const key of matchKeys) {
      const matchData = await redis.get(key);
      if (matchData) {
        const match = JSON.parse(matchData);
        rooms.push({
          id: match.matchId,
          players: match.players.length,
          status: match.status,
          createdAt: match.createdAt || Date.now(),
        });
      }
    }
    res.json(rooms);
  } catch (err) {
    console.error('[GET /api/rooms] Redis Error:', err);
    res.status(500).json({
      error: 'Redis error',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// Get players from `users` table
app.get('/api/players', async (_req, res) => {
  try {
    console.log('[GET /api/players] Fetching players from database...');
    const result = await sequelize.query(
      `
      SELECT 
        u.user_id AS id,
        u.user_name AS name,
        u.email,
        COALESCE(us.elo_rating, 1000) AS rating,
        u.role,
        u.is_active,
        u.created_at,
        u.last_login,
        COALESCE(us.total_games_played, 0) AS games_played,
        COALESCE(us.total_games_won, 0) AS games_won
      FROM users u
      LEFT JOIN user_stats us ON u.user_id = us.user_id
      ORDER BY COALESCE(us.elo_rating, 1000) DESC, u.created_at DESC
      LIMIT 200
      `,
      { type: QueryTypes.SELECT }
    );
    res.json(result);
  } catch (err) {
    console.error('[GET /api/players] Database Error:', err);
    res.status(500).json({
      error: 'Database error',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// =========================================================
// 🚀 Routers (từ cả hai file)
// =========================================================
app.use('/api/auth', authRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/feedbacks', feedbacksRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/broadcast', broadcastsRouter);
app.use('/api/admin', adminRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

// Matchmaking system stats
let matchmakingSystem: MatchmakingSystem;
let bo3MatchManager: BO3MatchManager;
app.get('/api/matchmaking/stats', (_req, res) => {
  if (matchmakingSystem) {
    res.json(matchmakingSystem.getQueueStats());
  } else {
    res.status(503).json({ error: 'Matchmaking system not initialized' });
  }
});

// Test connection page (socket + http)
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
const onlineUsers = new Map<number, string>(); // userId -> socketId
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

app.get('/whoami', (req, res) => {
  const raw = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
  const ip = normalizeIp(raw);
  res.json({ ip });
});

// Simple test page for socket connectivity
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

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Log all incoming connections at engine level
io.engine.on('connection', (rawSocket) => {
  const transport = rawSocket.transport.name; // polling or websocket
  const remoteAddress = rawSocket.request.socket.remoteAddress;
  console.log(`🔌 [Socket.IO Engine] New connection from ${remoteAddress} via ${transport}`);
  rawSocket.on('upgrade', () => {
    console.log(`⬆️ [Socket.IO Engine] Connection upgraded to websocket from ${remoteAddress}`);
  });
  rawSocket.on('close', () => {
    console.log(`❌ [Socket.IO Engine] Connection closed from ${remoteAddress}`);
  });
});

type TType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
const BAG: TType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

function* bagGenerator(seed = Date.now()) {
  // Simple LCG for deterministic shuffle per room
  let s = seed >>> 0;
  const rand = () => ((s = (1664525 * s + 1013904223) >>> 0) / 2 ** 32);
  while (true) {
    const bag = [...BAG];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    for (const t of bag) yield t;
  }
}

function nextPieces(gen: Generator<TType, any, any>, n: number) {
  const arr: TType[] = [];
  for (let i = 0; i < n; i++) arr.push(gen.next().value as TType);
  return arr;
}

/**
 * Convert MatchData to legacy room snapshot format
 */
function matchToRoomSnapshot(match: MatchData) {
  return {
    id: match.matchId,
    host: match.hostPlayerId,
    started: match.status === 'in_progress',
    maxPlayers: match.maxPlayers,
    players: match.players.map((p) => {
      const pingData = playerPings.get(p.socketId || p.playerId);
      return {
        id: p.playerId,
        ready: p.ready,
        alive: p.alive,
        name: p.accountId || null,
        combo: p.combo || 0,
        b2b: p.b2b || 0,
        pendingGarbage: p.pendingGarbage || 0,
        ping: pingData?.ping ?? null,
      };
    }),
  };
}

/**
 * Find player in match by socket ID
 */
function findPlayerInMatch(match: MatchData | null, socketId: string): PlayerMatchState | undefined {
  if (!match) return undefined;
  return match.players.find((p) => p.socketId === socketId);
}

type PlayerState = {
  id: string;
  ready: boolean;
  alive: boolean;
  combo: number;
  b2b: number; // back-to-back
  name?: string;
  pendingGarbage: number; // Garbage queued to receive
  lastAttackTime: number; // Timestamp of last attack
};

type Room = {
  id: string;
  host: string;
  gen: Generator<TType, any, any>;
  players: Map<string, PlayerState>;
  started: boolean;
  seed: number;
  maxPlayers: number;
};

type RoomAck = {
  ok: boolean;
  error?: 'exists' | 'not-found' | 'started' | 'full' | 'unknown';
  roomId?: string;
};

const rooms = new Map<string, Room>();
// Track accountId to socket.id mapping (1 accountId = 1 active socket)
const accountToSocket = new Map<string, string>();
// Track IP to live socket ids (can be multiple tabs) - DEPRECATED, giữ lại cho legacy
const ipToSockets = new Map<string, Set<string>>();

// [REDIS SUPPORT] Map to store generators for Redis-based matches
// Key: matchId, Value: Generator instance
const matchGenerators = new Map<string, Generator<TType, any, any>>();

// [PING TRACKING] Map to store ping for each player
// Key: socketId, Value: { ping: number, lastUpdate: number }
const playerPings = new Map<string, { ping: number; lastUpdate: number }>();

// [MATCHMAKING SYSTEM] Initialize matchmaking
let matchmakingInitialized = false;

// INIT external services
initRedis().catch((err) => console.error('[redis] init failed', err));
initPostgres()
  .then(() => {
    setupFriendshipAssociations();
    console.log('[postgres] Friendship associations setup complete');
  })
  .catch((err) => console.error('[postgres] init skipped/failed', err));

io.on('connection', (socket) => {
  // Map this socket to client IP
  const rawIp =
    (socket.handshake.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    socket.handshake.address;
  const ip = normalizeIp(typeof rawIp === 'string' ? rawIp : '');
  if (ip) {
    const set = ipToSockets.get(ip) ?? new Set<string>();
    set.add(socket.id);
    ipToSockets.set(ip, set);
  }

  // =========================================================
  // 🚀 WebRTC Signaling for UDP Data Channel
  // =========================================================
  socket.on('webrtc:offer', ({ roomId, offer }: { roomId: string; offer: any }) => {
    console.log(`[WebRTC] 📤 Offer from ${socket.id} → room ${roomId}`);
    socket.to(roomId).emit('webrtc:offer', { from: socket.id, offer });
  });

  socket.on('webrtc:answer', ({ roomId, answer }: { roomId: string; answer: any }) => {
    console.log(`[WebRTC] 📥 Answer from ${socket.id} → room ${roomId}`);
    socket.to(roomId).emit('webrtc:answer', { from: socket.id, answer });
  });

  socket.on('webrtc:ice', ({ roomId, candidate }: { roomId: string; candidate: any }) => {
    console.log(`[WebRTC] 🧊 ICE candidate from ${socket.id} → room ${roomId}`);
    socket.to(roomId).emit('webrtc:ice', { from: socket.id, candidate });
  });

  socket.on('webrtc:ready', ({ roomId }: { roomId: string }) => {
    console.log(`[WebRTC] ✅ DataChannel ready from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit('webrtc:ready', { from: socket.id });
  });

  socket.on('webrtc:failed', ({ roomId, reason }: { roomId: string; reason?: string }) => {
    console.log(
      `[WebRTC] ❌ Connection failed for ${socket.id} in room ${roomId}: ${reason || 'unknown'}`
    );
    socket.to(roomId).emit('webrtc:failed', { from: socket.id, reason });
  });

  // =========================================================
  // 🔌 TCP Game Logic (Socket.IO) - FALLBACK & RELIABLE EVENTS
  // =========================================================

  // Ping/Pong for connectivity and latency tracking
  socket.on('ping', (timestamp?: number) => {
    socket.emit('pong', timestamp);
  });

  // Client reports their measured ping
  socket.on('client:ping', (ping: number) => {
    playerPings.set(socket.id, { ping, lastUpdate: Date.now() });
  });

  // [Auth + Online presence] Client sends userId after login
  socket.on('user:authenticate', async (userId: any) => {
    console.log(`📥 [Auth] Received authentication request:`, { userId, type: typeof userId });

    // Convert to number if needed
    const accountId = typeof userId === 'string' ? parseInt(userId, 10) : userId;

    if (accountId && typeof accountId === 'number' && !isNaN(accountId)) {
      onlineUsers.set(accountId, socket.id);

      // Store in Redis for persistence across reconnects
      const username = `User${accountId}`; // TODO: Fetch from database
      await storeSocketUser(socket.id, accountId, username);

      // Also store in socket as backup (but Redis is source of truth)
      (socket as any).accountId = accountId;
      (socket as any).username = username;

      console.log(`🟢 [Online] User ${accountId} connected (socket: ${socket.id})`);
      console.log(`   💾 [Redis] User auth stored in Redis`);
      console.log(`   📊 Total online users: ${onlineUsers.size}`);
      console.log(`   👥 Online user IDs:`, Array.from(onlineUsers.keys()));

      // Send confirmation back to client
      socket.emit('user:authenticated', { accountId, username });
      console.log(`   ✅ [Auth] Confirmation sent to client`);

      // Broadcast user online to all connected clients
      io.emit('user:online', accountId);
      console.log(`   📡 Broadcasted user:online event for userId: ${accountId}`);
    } else {
      console.warn(`⚠️ [Auth] Invalid userId received:`, {
        received: userId,
        type: typeof userId,
        converted: accountId,
        isNaN: isNaN(accountId),
      });
    }
  });

  // Broadcast chat for quick manual test
  socket.on('chat:message', (data: any) => {
    io.emit('chat:message', { from: socket.id, ...data });
  });

  // Create room
  socket.on('room:create', async (roomId: string, optsOrCb?: any, cbMaybe?: any) => {
    let options: { maxPlayers?: number; name?: string } | undefined;
    let cb: ((result: RoomAck) => void) | undefined;

    if (typeof optsOrCb === 'function') {
      cb = optsOrCb as (result: RoomAck) => void;
    } else {
      options = optsOrCb;
      if (typeof cbMaybe === 'function') cb = cbMaybe;
    }

    try {
      // Check if match already exists in Redis
      const existing = await matchManager.getMatch(roomId);
      if (existing) {
        cb?.({ ok: false, error: 'exists' });
        return;
      }

      const maxPlayers = Math.max(2, Math.min(Number(options?.maxPlayers) || 2, 6));
      const displayName = typeof options?.name === 'string' ? options.name : undefined;

      // Create match in Redis via MatchManager
      const match = await matchManager.createMatch({
        matchId: roomId,
        hostPlayerId: socket.id,
        hostSocketId: socket.id,
        mode: 'custom',
        maxPlayers: maxPlayers,
        roomId: roomId,
        hostAccountId: displayName,
      });

      // Join socket.io room for broadcasting
      await socket.join(roomId);

      console.log(
        `[room:create] ✅ ${socket.id} created match ${roomId} (max ${maxPlayers} players) in Redis`
      );

      // Send success response
      cb?.({ ok: true, roomId });

      // Broadcast to room using new snapshot format
      const snapshot = matchToRoomSnapshot(match);
      io.to(roomId).emit('room:update', snapshot);
    } catch (err) {
      console.error('[room:create] Error:', err);
      cb?.({ ok: false, error: 'unknown' });
    }
  });

  // Join room
  socket.on('room:join', async (roomId: string, optsOrCb?: any, cbMaybe?: any) => {
    let options: { name?: string } | undefined;
    let cb: ((result: RoomAck) => void) | undefined;

    if (typeof optsOrCb === 'function') {
      cb = optsOrCb as (result: RoomAck) => void;
    } else {
      options = optsOrCb;
      if (typeof cbMaybe === 'function') cb = cbMaybe;
    }

    try {
      // Get match from Redis
      const match = await matchManager.getMatch(roomId);

      if (!match) {
        cb?.({ ok: false, error: 'not-found' });
        return;
      }

      // Check match status
      if (match.status === 'in_progress') {
        cb?.({ ok: false, error: 'started' });
        return;
      }

      if (match.players.length >= match.maxPlayers) {
        const existingPlayer = match.players.find((p) => p.socketId === socket.id);
        if (!existingPlayer) {
          cb?.({ ok: false, error: 'full' });
          return;
        }
      }

      const displayName = typeof options?.name === 'string' ? options.name : undefined;

      // Check if player already in match (reconnect case)
      const existingPlayer = match.players.find((p) => p.socketId === socket.id);

      if (!existingPlayer) {
        // New player joining
        await matchManager.addPlayer(roomId, {
          playerId: socket.id,
          socketId: socket.id,
          accountId: displayName,
        });
        console.log(`[room:join] ✅ ${socket.id} joined match ${roomId}`);
      } else {
        // Reconnecting player
        console.log(`[room:join] ✅ ${socket.id} reconnected to match ${roomId}`);
        socket.to(roomId).emit('player:reconnect', { playerId: socket.id });
      }

      // Join socket.io room
      await socket.join(roomId);

      // Send success response
      cb?.({ ok: true, roomId });

      // Broadcast updated room state
      const updatedMatch = await matchManager.getMatch(roomId);
      if (updatedMatch) {
        const snapshot = matchToRoomSnapshot(updatedMatch);
        io.to(roomId).emit('room:update', snapshot);
      }
    } catch (err) {
      console.error('[room:join] Error:', err);
      cb?.({ ok: false, error: 'unknown' });
    }
  });

  // Sync room snapshot
  socket.on('room:sync', async (roomId: string, cb?: (result: any) => void) => {
    if (typeof roomId !== 'string' || !roomId.trim()) {
      cb?.({ ok: false, error: 'invalid-room' });
      return;
    }

    try {
      const match = await matchManager.getMatch(roomId.trim());
      if (!match) {
        cb?.({ ok: false, error: 'not-found' });
        return;
      }

      const snapshot = matchToRoomSnapshot(match);
      io.to(socket.id).emit('room:update', snapshot);
      cb?.({ ok: true, data: snapshot });
    } catch (err) {
      console.error('[room:sync] Error:', err);
      cb?.({ ok: false, error: 'server-error' });
    }
  });

  // Leave room
  socket.on('room:leave', async (roomId: string) => {
    try {
      const match = await matchManager.getMatch(roomId);
      if (!match) {
        console.warn(`[room:leave] Match not found: ${roomId}`);
        return;
      }

      const player = findPlayerInMatch(match, socket.id);
      if (!player) {
        console.warn(`[room:leave] Player ${socket.id} not found in match ${roomId}`);
        return;
      }

      await matchManager.removePlayer(roomId, player.playerId);
      socket.leave(roomId);
      console.log(
        `[room:leave] ✅ Player ${socket.id.slice(0, 8)} left match ${roomId.slice(0, 8)}`
      );

      const updatedMatch = await matchManager.getMatch(roomId);
      if (!updatedMatch || updatedMatch.players.length === 0) {
        await matchManager.deleteMatch(roomId);
        console.log(`[room:leave] 🗑️ Empty match ${roomId.slice(0, 8)} deleted`);
      } else {
        const snapshot = matchToRoomSnapshot(updatedMatch);
        io.to(roomId).emit('room:update', snapshot);
      }
    } catch (err) {
      console.error('[room:leave] Error:', err);
    }
  });

  // Toggle ready
  socket.on('room:ready', async (roomId: string, ready: boolean) => {
    try {
      const match = await matchManager.getMatch(roomId);

      if (!match) {
        console.error('[room:ready] Match not found:', roomId);
        return;
      }

      const player = findPlayerInMatch(match, socket.id);
      if (player) {
        await matchManager.setPlayerReady(roomId, player.playerId, ready);
        console.log(
          `[room:ready] ✅ Player ${socket.id.slice(0, 8)} ready=${ready} in match ${roomId.slice(
            0,
            8
          )}`
        );
      } else {
        console.warn(
          `[room:ready] ⚠️ Player ${socket.id.slice(0, 8)} not found in match ${roomId.slice(
            0,
            8
          )}`
        );
      }

      const updatedMatch = await matchManager.getMatch(roomId);
      if (updatedMatch) {
        const snapshot = matchToRoomSnapshot(updatedMatch);
        io.to(roomId).emit('room:update', snapshot);
      }
    } catch (err) {
      console.error('[room:ready] Error:', err);
    }
  });

  // [NEW] room:invite - Invite friend by userId
  const playersReadyForGame = new Map<string, Set<string>>();
  socket.on(
    'room:invite',
    async (
      data: {
        roomId: string;
        friendId: number;
        friendUsername: string;
        inviterName: string;
      },
      cb?: (result: any) => void
    ) => {
      try {
        const { roomId, friendId, friendUsername, inviterName } = data;

        if (!roomId || !friendId || !friendUsername) {
          console.error('[room:invite] ❌ Missing required fields');
          cb?.({ ok: false, error: 'Thiếu thông tin cần thiết' });
          return;
        }

        const match = await matchManager.getMatch(roomId);
        if (!match) {
          console.error('[room:invite] ❌ Match not found:', roomId);
          cb?.({ ok: false, error: 'Phòng không tồn tại' });
          return;
        }

        const inviter = findPlayerInMatch(match, socket.id);
        if (!inviter || inviter.playerId !== match.hostPlayerId) {
          console.error('[room:invite] ❌ Only host can invite');
          cb?.({ ok: false, error: 'Chỉ chủ phòng mới có thể mời bạn bè' });
          return;
        }

        if (match.players.length >= match.maxPlayers) {
          console.error('[room:invite] ❌ Room is full');
          cb?.({ ok: false, error: 'Phòng đã đầy' });
          return;
        }

        const friendSocketId = onlineUsers.get(friendId);
        if (!friendSocketId) {
          console.error('[room:invite] ❌ Friend is offline:', friendId);
          cb?.({ ok: false, error: `${friendUsername} hiện đang offline` });
          return;
        }

        const friendInRoom = match.players.some((p) => {
          const userIdStr = p.playerId.split('_')[0];
          return parseInt(userIdStr) === friendId;
        });
        if (friendInRoom) {
          console.error('[room:invite] ❌ Friend already in room');
          cb?.({ ok: false, error: `${friendUsername} đã ở trong phòng` });
          return;
        }

        io.to(friendSocketId).emit('room:invitation', {
          roomId,
          roomName: match.matchId,
          inviterName: inviterName || inviter.playerId,
          maxPlayers: match.maxPlayers,
          currentPlayers: match.players.length,
          timestamp: Date.now(),
        });

        console.log(
          `[room:invite] ✅ Invitation sent from ${inviterName || inviter.playerId} to ${friendUsername} (${friendId}) for room ${roomId.slice(
            0,
            8
          )}`
        );

        cb?.({
          ok: true,
          message: `Đã gửi lời mời đến ${friendUsername}`,
        });
      } catch (err) {
        console.error('[room:invite] Error:', err);
        cb?.({ ok: false, error: 'Lỗi khi gửi lời mời' });
      }
    }
  );

  // Start game (announce only; clients must reply with game:im_ready)
  socket.on('room:startGame', async (roomId: string, cb?: (result: any) => void) => {
    try {
      const match = await matchManager.getMatch(roomId);

      if (!match) {
        cb?.({ ok: false, error: 'Phòng không tồn tại' });
        return;
      }

      const player = findPlayerInMatch(match, socket.id);
      if (!player || player.playerId !== match.hostPlayerId) {
        console.error('[room:startGame] Only host can start game');
        cb?.({ ok: false, error: 'Chỉ chủ phòng mới có thể bắt đầu' });
        return;
      }

      if (match.players.length < 2) {
        cb?.({ ok: false, error: 'Cần ít nhất 2 người chơi' });
        return;
      }

      const nonHostPlayers = match.players.filter((p) => p.playerId !== match.hostPlayerId);
      const allNonHostReady = nonHostPlayers.every((p) => p.ready);

      console.log(`[room:startGame] 🔍 Ready check:`, {
        matchId: roomId.slice(0, 8),
        hostPlayerId: match.hostPlayerId.slice(0, 8),
        totalPlayers: match.players.length,
        nonHostPlayersCount: nonHostPlayers.length,
        allNonHostReady,
        players: match.players.map((p) => ({
          playerId: p.playerId.slice(0, 8),
          socketId: p.socketId?.slice(0, 8) || 'N/A',
          isHost: p.playerId === match.hostPlayerId,
          ready: p.ready,
        })),
      });

      if (!allNonHostReady) {
        cb?.({ ok: false, error: 'Chưa đủ người sẵn sàng' });
        return;
      }

      await matchManager.startMatch(roomId);
      console.log(`[room:startGame] ✅ Match ${roomId} started by ${socket.id}`);

      // Initialize ready set for this room
      playersReadyForGame.set(roomId, new Set());

      // Notify players to prepare (wait for game:im_ready)
      io.to(roomId).emit('game:starting', { roomId });
      console.log(`[Room ${roomId}] Game is starting. Waiting for clients to be ready...`);

      cb?.({ ok: true, seed: match.seed });
    } catch (err) {
      console.error('[room:startGame] Error:', err);
      cb?.({ ok: false, error: 'unknown' });
    }
  });

  // Client says they are ready to receive game data
  socket.on('game:im_ready', async (roomId: string) => {
    try {
      const match = await matchManager.getMatch(roomId);
      const readySet = playersReadyForGame.get(roomId);

      if (!match) {
        console.warn(`[game:im_ready] Received ready signal for non-existent match: ${roomId}`);
        return;
      }
      if (!readySet) {
        console.warn(`[game:im_ready] No ready set found for room: ${roomId}`);
        return;
      }

      readySet.add(socket.id);
      const expectedPlayers = match.players.length;
      console.log(`[Room ${roomId}] Player ${socket.id} is ready. (${readySet.size}/${expectedPlayers})`);

      if (readySet.size === expectedPlayers) {
        console.log(`[Room ${roomId}] ✅ All players are ready. Sending full game data.`);

        const gen = bagGenerator(match.seed);
        const first = nextPieces(gen, 14);
        const playerIds = match.players.map((p) => p.socketId);

        matchGenerators.set(roomId, gen);
        console.log(`[Room ${roomId}] 💾 Stored generator for Redis match`);

        for (const playerId of playerIds) {
          const opponentId = playerIds.find((id) => id !== playerId);
          io.to(playerId).emit('game:start', {
            next: first,
            roomId,
            opponent: opponentId,
            seed: match.seed,
          });
        }

        playersReadyForGame.delete(roomId);
        console.log(`[Room ${roomId}] 🎮 Game started! Piece queue sent to all players.`);
      }
    } catch (err) {
      console.error('[game:im_ready] Error:', err);
    }
  });

  // Legacy game:start (kept for backward compatibility)
  socket.on('game:start', (roomId: string) => {
    const r = rooms.get(roomId);
    if (!r || r.host !== socket.id) return;
    if (![...r.players.values()].every((p) => p.ready)) return;
    r.started = true;
    const first = nextPieces(r.gen, 14);
    saveRoom(r);

    for (const [playerId] of r.players) {
      const opponentId = [...r.players.keys()].find((id) => id !== playerId);
      io.to(playerId).emit('game:start', {
        next: first,
        roomId,
        opponent: opponentId,
      });
    }
  });

  // Request more pieces
  socket.on('game:requestNext', async (roomId: string, n: number = 7) => {
    try {
      const match = await matchManager.getMatch(roomId);
      const r = rooms.get(roomId);

      if (!match && !r) {
        console.warn(`[game:requestNext] Room not found: ${roomId}`);
        return;
      }

      let pieces: any[] = [];
      if (r && r.started) {
        pieces = nextPieces(r.gen, n);
      } else if (match && match.status === 'in_progress') {
        const gen = matchGenerators.get(roomId);
        if (gen) {
          pieces = nextPieces(gen, n);
          console.log(`[game:requestNext] Generated ${n} pieces for Redis match ${roomId}`);
        } else {
          console.warn(`[game:requestNext] No generator found for Redis match ${roomId}`);
        }
      }

      if (pieces.length > 0) {
        io.to(socket.id).emit('game:next', pieces);
      }
    } catch (err) {
      console.error('[game:requestNext] Error:', err);
    }
  });

  // Relay real-time board state to other players in the same room
  socket.on('game:state', async (roomId: string, payload: any) => {
    try {
      const match = await matchManager.getMatch(roomId);
      const r = rooms.get(roomId);

      if (!match && !r) {
        console.warn(`[game:state] Room not found: ${roomId}`);
        return;
      }

      socket.to(roomId).emit('game:state', { ...payload, from: socket.id });
    } catch (err) {
      console.error('[game:state] Error:', err);
    }
  });

  // Room chat (legacy map)
  socket.on('room:chat', (roomId: string, message: any, cb?: (ack: RoomAck) => void) => {
    const r = rooms.get(roomId);
    if (!r) {
      cb?.({ ok: false, error: 'not-found' });
      return;
    }
    if (!r.players.has(socket.id)) {
      cb?.({ ok: false, error: 'unknown' });
      return;
    }
    const payload = {
      from: socket.id,
      message,
      ts: Date.now(),
    };
    io.to(roomId).emit('room:chat', payload);
    cb?.({ ok: true, roomId });
  });

  // Attack flow (garbage)
  socket.on('game:attack', async (roomId: string, payload: { lines: number; isClear?: boolean }) => {
    const { lines: rawLines, isClear = false } = payload;
    const lines = Math.max(0, Math.min(10, Number(rawLines) || 0));
    if (lines === 0) return;

    try {
      const match = await matchManager.getMatch(roomId);
      const r = rooms.get(roomId);

      if (!match && !r) {
        console.error('[game:attack] Match/Room not found:', roomId);
        return;
      }

      let attackerId = socket.id;

      if (match) {
        const attacker = findPlayerInMatch(match, socket.id);
        if (!attacker || !attacker.alive) {
          console.error('[game:attack] Attacker not found or dead:', socket.id);
          return;
        }
        attackerId = attacker.playerId;
      } else if (r) {
        const p = r.players.get(socket.id);
        if (!p || !p.alive) {
          console.error('[game:attack] Attacker not in legacy room or dead');
          return;
        }
        p.lastAttackTime = Date.now();
      }

      console.log(`[game:attack] ${socket.id} sending ${lines} garbage lines (isClear=${isClear})`);

      const opponents: Array<{ id: string; socketId: string }> = [];
      if (match) {
        match.players
          .filter((p) => p.playerId !== attackerId && p.alive)
          .forEach((p) => opponents.push({ id: p.playerId, socketId: p.socketId }));
      } else if (r) {
        [...r.players.entries()]
          .filter(([sid, sp]) => sid !== socket.id && sp.alive)
          .forEach(([sid]) => opponents.push({ id: sid, socketId: sid }));
      }

      if (opponents.length === 0) {
        console.log('[game:attack] No alive opponents');
        return;
      }

      for (const opponent of opponents) {
        let actualGarbage = 0;

        if (match) {
          if (isClear) {
            const result = await matchManager.cancelGarbage(roomId, opponent.id, lines);
            actualGarbage = result.remaining;
            console.log(
              `[game:attack] 🔄 Cancel mechanic for ${opponent.id}: ${result.cancelled} cancelled, ${result.remaining} remaining`
            );
            if (result.cancelled > 0) {
              io.to(opponent.socketId).emit('game:garbageCancelled', {
                cancelled: result.cancelled,
                remaining: result.remaining,
              });
            }
          } else {
            actualGarbage = await matchManager.queueGarbage(roomId, opponent.id, lines);
          }

          if (actualGarbage > 0) {
            io.to(opponent.socketId).emit('game:incomingGarbage', {
              lines: actualGarbage,
              from: attackerId,
            });
          }
        } else if (r) {
          const opp = r.players.get(opponent.id);
          if (!opp) continue;

          if (isClear && opp.pendingGarbage > 0) {
            const cancelled = Math.min(opp.pendingGarbage, lines);
            opp.pendingGarbage -= cancelled;
            const remaining = lines - cancelled;
            console.log(
              `[game:attack] Cancelled ${cancelled} garbage for ${opponent.id}, remaining: ${remaining}`
            );
            io.to(opponent.socketId).emit('game:garbageCancelled', {
              cancelled,
              remaining: opp.pendingGarbage,
            });
            if (remaining > 0) {
              opp.pendingGarbage += remaining;
              actualGarbage = remaining;
            }
          } else {
            opp.pendingGarbage += lines;
            actualGarbage = lines;
          }

          console.log(
            `[game:attack] Queued ${actualGarbage} garbage to ${opponent.id}, total pending: ${opp.pendingGarbage}`
          );

          io.to(opponent.socketId).emit('game:incomingGarbage', {
            lines: opp.pendingGarbage,
            from: attackerId,
          });
        }

        setTimeout(async () => {
          if (match) {
            const toApply = await matchManager.consumeGarbage(roomId, opponent.id);
            if (toApply > 0) {
              console.log(`[game:attack] Applying ${toApply} garbage to ${opponent.id}`);
              io.to(opponent.socketId).emit('game:applyGarbage', { lines: toApply });
            }
          } else {
            const rr = rooms.get(roomId);
            if (!rr) return;
            const oo = rr.players.get(opponent.id);
            if (!oo || !oo.alive) return;

            const toApply = oo.pendingGarbage;
            if (toApply > 0) {
              oo.pendingGarbage = 0;
              console.log(`[game:attack] Applying ${toApply} garbage to ${opponent.id}`);
              io.to(opponent.socketId).emit('game:applyGarbage', { lines: toApply });
            }
          }
        }, 500);
      }

      if (r) {
        saveRoom(r).catch((err) => console.error('[game:attack] saveRoom error:', err));
      }
    } catch (err) {
      console.error('[game:attack] Error:', err);
    }
  });

  // Keep old game:lock for backward compatibility / other logic
  socket.on(
    'game:lock',
    (roomId: string, payload: { lines: number; tspinType?: 'none' | 'mini' | 'normal'; pc?: boolean }) => {
      const r = rooms.get(roomId);
      if (!r || !r.started) return;
      const p = r.players.get(socket.id);
      if (!p) return;

      const lines = Math.max(0, Math.min(4, Number(payload?.lines) || 0));
      const tspinType = payload?.tspinType ?? 'none';
      const pc = Boolean(payload?.pc);

      console.log(
        `[LOCK] Player ${socket.id} locked piece: ${lines} lines, tspinType: ${tspinType}, pc: ${pc}`
      );

      const isTetris = tspinType === 'none' && lines === 4;
      const isTSpinClear = tspinType !== 'none' && lines > 0;

      if (lines > 0 && (isTetris || isTSpinClear)) {
        p.b2b += 1;
      } else if (lines > 0) {
        p.b2b = 0;
      }

      if (lines > 0) {
        p.combo = Math.max(1, p.combo + 1);
      } else {
        p.combo = 0;
      }

      saveRoom(r);
    }
  );

  // Topout flow (end of round)
  socket.on('game:topout', async (roomId: string, reason?: string) => {
    try {
      const match = await matchManager.getMatch(roomId);
      const r = rooms.get(roomId);

      if (!match && !r) {
        console.warn(`[game:topout] Room/Match not found: ${roomId}`);
        return;
      }

      if (match) {
        const player = findPlayerInMatch(match, socket.id);
        if (!player) {
          console.warn(`[game:topout] Player not found in Redis match: ${socket.id}`);
          return;
        }

        console.log(
          `[game:topout] Player ${player.playerId} topped out in match ${roomId}. Reason: ${
            reason || 'topout'
          }`
        );

        player.alive = false;
        match.updatedAt = Date.now();
        await redis.set(`match:${roomId}`, JSON.stringify(match), { EX: 7200 });

        io.to(roomId).emit('room:update', matchToRoomSnapshot(match));

        const alivePlayers = match.players.filter((p) => p.alive);

        if (alivePlayers.length <= 1) {
          console.log(`[game:topout] Match ${roomId} ended. Alive players:`, alivePlayers.length);

          const winner = alivePlayers[0] || null;
          const winnerId = winner?.playerId || undefined;

          if (reason === 'afk') {
            io.to(socket.id).emit('game:over', {
              winner: winner?.socketId ?? null,
              reason: 'Bạn đã AFK nên bị xử thua',
            });
            if (winner) {
              io.to(winner.socketId).emit('game:over', {
                winner: winner.socketId,
                reason: 'Đối thủ đã AFK',
              });
            }
          } else {
            io.to(roomId).emit('game:over', { winner: winner?.socketId ?? null });
          }

          await matchManager.endMatch(roomId, winnerId);

          match.status = 'waiting';
          match.players.forEach((p) => {
            p.alive = true;
            p.ready = false;
            p.combo = 0;
            p.b2b = 0;
          });
          match.updatedAt = Date.now();
          await redis.set(`match:${roomId}`, JSON.stringify(match), { EX: 7200 });

          for (const p of match.players) {
            await redis.del(`garbage:${roomId}:${p.playerId}`);
          }

          console.log(`[game:topout] ✅ Match ${roomId} reset for rematch`);
        }

        return;
      }

      // Legacy
      if (r) {
        const p = r.players.get(socket.id);
        if (!p) return;
        p.alive = false;
        saveRoom(r);
        io.to(roomId).emit('room:update', roomSnapshot(roomId));
        const alive = [...r.players.values()].filter((p) => p.alive);
        if (alive.length <= 1) {
          if (reason === 'afk') {
            io.to(socket.id).emit('game:over', {
              winner: alive[0]?.id ?? null,
              reason: 'Bạn đã AFK nên bị xử thua',
            });
            if (alive[0]) {
              io.to(alive[0].id).emit('game:over', {
                winner: alive[0].id,
                reason: 'Đối thủ đã AFK',
              });
            }
          } else {
            io.to(roomId).emit('game:over', { winner: alive[0]?.id ?? null });
          }
          r.started = false;
          r.players.forEach((pl) => {
            pl.ready = false;
            pl.alive = true;
            pl.combo = 0;
            pl.b2b = 0;
            pl.pendingGarbage = 0;
            pl.lastAttackTime = 0;
          });
          saveRoom(r);
        }
      }
    } catch (err) {
      console.error('[game:topout] Error:', err);
    }
  });

  // Ranked queue events
  socket.on('ranked:enter', async (playerId: string, elo: number, cb?: (ok: boolean) => void) => {
    try {
      accountToSocket.set(playerId, socket.id);
      await addToRankedQueue(playerId, elo);
      cb?.(true);
    } catch {
      cb?.(false);
    }
  });

  socket.on('ranked:leave', async (playerId: string) => {
    accountToSocket.delete(playerId);
    await removeFromRankedQueue(playerId);
  });

  socket.on('ranked:match', async (playerId: string, elo: number, cb?: (data: any) => void) => {
    const opponent = await popBestMatch(elo, 150, playerId);
    if (!opponent) {
      accountToSocket.set(playerId, socket.id);
      await addToRankedQueue(playerId, elo);
      return cb?.({ match: null });
    }
    if (opponent.playerId === playerId) {
      accountToSocket.set(playerId, socket.id);
      await addToRankedQueue(playerId, elo);
      return cb?.({ match: null });
    }

    const oppSocketId = accountToSocket.get(String(opponent.playerId));
    if (!oppSocketId || !io.sockets.sockets.has(oppSocketId as any)) {
      accountToSocket.set(playerId, socket.id);
      await addToRankedQueue(playerId, elo);
      cb?.({ match: null });
      return;
    }

    const roomId = `rk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const seed = Date.now() ^ roomId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const room: Room = {
      id: roomId,
      host: socket.id,
      gen: bagGenerator(seed),
      players: new Map([
        [
          socket.id,
          {
            id: socket.id,
            ready: true,
            alive: true,
            combo: 0,
            b2b: 0,
            name: playerId,
            pendingGarbage: 0,
            lastAttackTime: 0,
          },
        ],
        [
          oppSocketId,
          {
            id: oppSocketId,
            ready: true,
            alive: true,
            combo: 0,
            b2b: 0,
            name: opponent.playerId,
            pendingGarbage: 0,
            lastAttackTime: 0,
          },
        ],
      ]),
      started: true,
      seed,
      maxPlayers: 2,
    };
    rooms.set(roomId, room);
    saveRoom(room);

    try {
      socket.join(roomId);
    } catch {}
    const oppSocket = oppSocketId ? io.sockets.sockets.get(oppSocketId) : undefined;
    try {
      oppSocket?.join(roomId);
    } catch {}

    socket.emit('ranked:found', { roomId, opponent: opponent.playerId, elo: opponent.elo });
    if (oppSocketId)
      io.to(oppSocketId).emit('ranked:found', { roomId, opponent: playerId, elo });

    io.to(roomId).emit('room:update', roomSnapshot(roomId));
    const first = nextPieces(room.gen, 14);

    io.to(socket.id).emit('game:start', { next: first, roomId, opponent: oppSocketId });
    if (oppSocketId)
      io.to(oppSocketId).emit('game:start', { next: first, roomId, opponent: socket.id });

    cb?.({ match: { roomId, opponent: opponent.playerId, elo: opponent.elo } });
  });

  // Disconnect handling
  socket.on('disconnect', async () => {
    console.log(`[disconnect] ${socket.id} disconnected`);

    try {
      // Find match this player was in (Redis)
      const matchInfo = await matchManager.getMatchByPlayer(socket.id);

      if (matchInfo) {
        const { matchId } = matchInfo;
        const match = await matchManager.getMatch(matchId);

        if (match) {
          await matchManager.markDisconnected(matchId, socket.id);
          console.log(`[disconnect] Player ${socket.id} marked disconnected in match ${matchId}`);

          socket.to(matchId).emit('player:disconnect', { playerId: socket.id });

          if (match.status === 'in_progress') {
            const player = findPlayerInMatch(match, socket.id);
            if (player) {
              player.alive = false;
              player.lastActionTime = Date.now();
              match.updatedAt = Date.now();

              io.to(matchId).emit('game:playerDied', { playerId: socket.id });

              const alivePlayers = match.players.filter((p) => p.alive);

              if (alivePlayers.length === 1) {
                await matchManager.endMatch(matchId, alivePlayers[0].playerId);

                matchGenerators.delete(matchId);
                console.log(`[disconnect] 🧹 Cleaned up generator for match ${matchId}`);

                io.to(matchId).emit('game:over', {
                  winner: alivePlayers[0].playerId,
                  reason: 'Đối thủ đã ngắt kết nối',
                });

                console.log(`[disconnect] Winner: ${alivePlayers[0].playerId} in match ${matchId}`);
              } else if (alivePlayers.length === 0) {
                await matchManager.endMatch(matchId);

                matchGenerators.delete(matchId);
                console.log(`[disconnect] 🧹 Cleaned up generator for match ${matchId}`);

                io.to(matchId).emit('game:draw');
                console.log(`[disconnect] Draw in match ${matchId}`);
              }
            }
          } else {
            const wasHost = match.hostPlayerId === socket.id;

            if (wasHost) {
              await matchManager.deleteMatch(matchId);
              deleteRoom(matchId).catch((err) =>
                console.error('[disconnect] deleteRoom error:', err)
              );
              io.to(matchId).emit('room:closed', { reason: 'host-left' });
              console.log(`[disconnect] Host left, match ${matchId} deleted`);
            } else {
              const updatedMatch = await matchManager.getMatch(matchId);
              if (updatedMatch) {
                const snapshot = matchToRoomSnapshot(updatedMatch);
                io.to(matchId).emit('room:update', snapshot);
              }
            }
          }
        }
      }

      // Legacy rooms
      for (const [roomId, r] of rooms) {
        const p = r.players.get(socket.id);
        if (!p) continue;

        socket.to(roomId).emit('player:disconnect', { playerId: socket.id });

        p.alive = false;
        saveRoom(r).catch((err) => console.error('[disconnect] saveRoom error:', err));
        io.to(roomId).emit('room:update', roomSnapshot(roomId));

        setTimeout(() => {
          const rr = rooms.get(roomId);
          if (!rr || !rr.started) return;
          const pp = rr.players.get(socket.id);
          if (pp && pp.alive === false) {
            const alive = [...rr.players.values()].filter((x) => x.id !== socket.id);

            io.to(socket.id).emit('game:over', {
              winner: alive[0]?.id ?? null,
              reason: 'Bạn đã ngắt kết nối nên bị xử thua',
            });

            if (alive[0]) {
              io.to(alive[0].id).emit('game:over', {
                winner: alive[0].id,
                reason: 'Đối thủ đã ngắt kết nối',
              });
            }

            rr.started = false;
            rr.players.forEach((pl) => {
              pl.ready = false;
              pl.alive = true;
              pl.combo = 0;
              pl.b2b = 0;
              pl.pendingGarbage = 0;
              pl.lastAttackTime = 0;
            });
            saveRoom(rr).catch((err) => console.error('[disconnect] saveRoom error:', err));
          }
        }, 5000);
      }

      // Remove accountId → socket.id mapping
      for (const [accountId, sockId] of accountToSocket.entries()) {
        if (sockId === socket.id) {
          accountToSocket.delete(accountId);
        }
      }

      // Presence: user offline broadcast + cleanup
      for (const [userId, sockId] of onlineUsers.entries()) {
        if (sockId === socket.id) {
          onlineUsers.delete(userId);
          console.log(`⚪ [Offline] User ${userId} disconnected (socket: ${socket.id})`);
          console.log(`   📊 Total online users: ${onlineUsers.size}`);
          console.log(`   👥 Remaining online user IDs:`, Array.from(onlineUsers.keys()));
          io.emit('user:offline', userId);
          console.log(`   📡 Broadcasted user:offline event for userId: ${userId}`);
          break;
        }
      }

      await removeSocketUser(socket.id);
      console.log(`   💾 [Redis] User auth removed from Redis`);

      playerPings.delete(socket.id);

      if (ip) {
        const set = ipToSockets.get(ip);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) ipToSockets.delete(ip);
        }
      }
    } catch (err) {
      console.error('[disconnect] Error:', err);
    }
  });
});

// ========================================
// 🧹 PERIODIC CLEANUP FOR STALE MATCHES
// ========================================
setInterval(async () => {
  try {
    const cleaned = await matchManager.cleanupStaleMatches();
    if (cleaned > 0) {
      console.log(`[Cleanup] 🧹 Removed ${cleaned} stale matches`);
    }
  } catch (err) {
    console.error('[Cleanup] Error:', err);
  }
}, 5 * 60 * 1000); // Every 5 minutes

console.log('[Cleanup] ✅ Periodic cleanup task started (5 min interval)');

function roomSnapshot(roomId: string) {
  const r = rooms.get(roomId);
  if (!r) return null;
  return {
    id: r.id,
    host: r.host,
    started: r.started,
    maxPlayers: r.maxPlayers,
    players: [...r.players.values()].map((p) => {
      const pingData = playerPings.get(p.id);
      return {
        id: p.id,
        ready: p.ready,
        alive: p.alive,
        name: p.name ?? null,
        ping: pingData?.ping ?? null,
      };
    }),
  };
}

// Presence helpers
export function isUserOnline(userId: number): boolean {
  return onlineUsers.has(userId);
}
export function getOnlineUsers(): number[] {
  return Array.from(onlineUsers.keys());
}

server.listen(PORT, HOST, () => {
  console.log(`Versus server listening on http://${HOST}:${PORT}`);

  // Initialize matchmaking system after server starts
  matchmakingSystem = new MatchmakingSystem(io);
  matchmakingInitialized = true;
  console.log('[Matchmaking] System initialized ✅');

  // Initialize BO3 match manager
  bo3MatchManager = new BO3MatchManager(io);
  console.log('[BO3] Match Manager initialized ✅');
});