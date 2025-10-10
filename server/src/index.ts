import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
console.log('Loaded PG_USER =', process.env.PG_USER);

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { initRedis, redis, saveRoom, deleteRoom, addToRankedQueue, removeFromRankedQueue, popBestMatch } from './redisStore';
import { initPostgres } from './postgres';
import authRouter from './routes/auth';
import { matchManager, MatchData, PlayerMatchState } from './matchManager';

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
app.use('/api/auth', authRouter); // Mount auth routes
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/whoami', (req, res) => {
  // Express req.ip returns remote address (e.g., ::ffff:192.168.1.10)
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
        const url = location.origin.replace(/^http/,'ws').replace(/^ws\:/,'http:');
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
  cors: { origin: '*', methods: ['GET','POST'] }
});

type TType = 'I'|'J'|'L'|'O'|'S'|'T'|'Z';
const BAG: TType[] = ['I','J','L','O','S','T','Z'];

function* bagGenerator(seed = Date.now()) {
  // Simple LCG for deterministic shuffle per room
  let s = seed >>> 0;
  const rand = () => (s = (1664525 * s + 1013904223) >>> 0) / 2**32;
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
 * Used for room:update events to maintain client compatibility
 */
function matchToRoomSnapshot(match: MatchData) {
  return {
    id: match.matchId,
    host: match.hostPlayerId,
    started: match.status === 'in_progress',
    maxPlayers: match.maxPlayers,
    players: match.players.map(p => {
      const pingData = playerPings.get(p.socketId || p.playerId);
      return {
        id: p.playerId,
        ready: p.ready,
        alive: p.alive,
        name: p.accountId || null,
        combo: p.combo || 0,
        b2b: p.b2b || 0,
        pendingGarbage: p.pendingGarbage || 0,
        ping: pingData?.ping ?? null
      };
    }),
  };
}

/**
 * Find player in match by socket ID
 */
function findPlayerInMatch(match: MatchData | null, socketId: string): PlayerMatchState | undefined {
  if (!match) return undefined;
  return match.players.find(p => p.socketId === socketId);
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

// [THÊM MỚI] Map để theo dõi những người chơi đã sẵn sàng cho trận đấu
const playersReadyForGame = new Map<string, Set<string>>();

// [REDIS SUPPORT] Map to store generators for Redis-based matches
// Key: matchId, Value: Generator instance
const matchGenerators = new Map<string, Generator<TType, any, any>>();

// [PING TRACKING] Map to store ping for each player
// Key: socketId, Value: { ping: number, lastUpdate: number }
const playerPings = new Map<string, { ping: number; lastUpdate: number }>();

initRedis().catch(err => console.error('[redis] init failed', err));
initPostgres().catch(err => console.error('[postgres] init skipped/failed', err));

io.on('connection', (socket) => {
  // Map this socket to client IP
  const rawIp = (socket.handshake.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || socket.handshake.address;
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
    console.log(`[WebRTC] ❌ Connection failed for ${socket.id} in room ${roomId}: ${reason || 'unknown'}`);
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
  
  // Broadcast chat for quick manual test
  socket.on('chat:message', (data: any) => {
    io.emit('chat:message', { from: socket.id, ...data });
  });
  
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

      // Also check legacy rooms Map (during transition)
      if (rooms.has(roomId)) {
        cb?.({ ok: false, error: 'exists' });
        return;
      }

      const maxPlayers = Math.max(2, Math.min(Number(options?.maxPlayers) || 2, 6));
      const seed = Date.now() ^ roomId.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
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

      // Also create in legacy Map for backward compatibility (DUAL MODE)
      const room: Room = {
        id: roomId,
        host: socket.id,
        gen: bagGenerator(seed),
        players: new Map([[socket.id, { 
          id: socket.id, 
          ready: false, 
          alive: true, 
          combo: 0, 
          b2b: 0, 
          name: displayName, 
          pendingGarbage: 0, 
          lastAttackTime: 0 
        }]]),
        started: false,
        seed,
        maxPlayers,
      };
      rooms.set(roomId, room);

      // Join socket.io room for broadcasting
      await socket.join(roomId);

      console.log(`[room:create] ✅ ${socket.id} created match ${roomId} (max ${maxPlayers} players)`);

      // Send success response
      cb?.({ ok: true, roomId });

      // Save to Redis (legacy function)
      saveRoom(room).catch(err => 
        console.error('[room:create] Redis saveRoom error:', err)
      );

      // Broadcast to room using new snapshot format
      const snapshot = matchToRoomSnapshot(match);
      io.to(roomId).emit('room:update', snapshot);

    } catch (err) {
      console.error('[room:create] Error:', err);
      cb?.({ ok: false, error: 'unknown' });
    }
  });

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
      // Get match from Redis first
      const match = await matchManager.getMatch(roomId);
      
      // Fallback to legacy room
      const r = rooms.get(roomId);
      
      if (!match && !r) {
        cb?.({ ok: false, error: 'not-found' });
        return;
      }

      // Check using match if available, otherwise legacy room
      if (match) {
        if (match.status === 'in_progress') {
          cb?.({ ok: false, error: 'started' });
          return;
        }
        if (match.players.length >= match.maxPlayers) {
          const existingPlayer = match.players.find(p => p.socketId === socket.id);
          if (!existingPlayer) {
            cb?.({ ok: false, error: 'full' });
            return;
          }
        }
      } else if (r) {
        if (r.started) {
          cb?.({ ok: false, error: 'started' });
          return;
        }
        if (r.players.size >= r.maxPlayers && !r.players.has(socket.id)) {
          cb?.({ ok: false, error: 'full' });
          return;
        }
      }

      const displayName = typeof options?.name === 'string' ? options.name : undefined;

      // Add player to MatchManager if match exists
      if (match) {
        const existingPlayer = match.players.find(p => p.socketId === socket.id);
        
        if (!existingPlayer) {
          // New player joining
          await matchManager.addPlayer(roomId, {
            playerId: socket.id,
            socketId: socket.id,
            accountId: displayName,
          });
        }
        // If player exists, no action needed - they're already in the match
      }

      // Also update legacy room (DUAL MODE)
      if (r) {
        const existingPlayer = r.players.get(socket.id);
        const isReconnect = existingPlayer && !existingPlayer.alive;

        r.players.set(socket.id, { 
          id: socket.id, 
          ready: existingPlayer?.ready ?? false, 
          alive: true, 
          combo: existingPlayer?.combo ?? 0, 
          b2b: existingPlayer?.b2b ?? 0, 
          name: displayName ?? existingPlayer?.name, 
          pendingGarbage: existingPlayer?.pendingGarbage ?? 0, 
          lastAttackTime: existingPlayer?.lastAttackTime ?? 0 
        });
        
        saveRoom(r).catch(err => console.error('[room:join] saveRoom error:', err));
        
        // Notify others if this is a reconnect
        if (isReconnect && r.started) {
          socket.to(roomId).emit('player:reconnect', { playerId: socket.id });
        }
      }

      // Join socket.io room
      await socket.join(roomId);

      console.log(`[room:join] ✅ ${socket.id} joined match ${roomId}`);

      // Send success response
      cb?.({ ok: true, roomId });

      // Broadcast updated room state
      const updatedMatch = await matchManager.getMatch(roomId);
      if (updatedMatch) {
        const snapshot = matchToRoomSnapshot(updatedMatch);
        io.to(roomId).emit('room:update', snapshot);
      } else if (r) {
        // Fallback to legacy snapshot
        io.to(roomId).emit('room:update', roomSnapshot(roomId));
      }

    } catch (err) {
      console.error('[room:join] Error:', err);
      cb?.({ ok: false, error: 'unknown' });
    }
  });

  socket.on('room:sync', (roomId: string, cb?: (result: any) => void) => {
    if (typeof roomId !== 'string' || !roomId.trim()) {
      cb?.({ ok: false, error: 'invalid-room' });
      return;
    }
    const snapshot = roomSnapshot(roomId.trim());
    if (!snapshot) {
      cb?.({ ok: false, error: 'not-found' });
      return;
    }
    io.to(socket.id).emit('room:update', snapshot);
    cb?.({ ok: true, data: snapshot });
  });

  socket.on('room:leave', (roomId: string) => {
    const r = rooms.get(roomId);
    if (!r) return;
    
    const wasHost = r.host === socket.id;
    r.players.delete(socket.id);
    socket.leave(roomId);
    
    if (r.players.size === 0) {
      // Empty room - delete it
      rooms.delete(roomId);
      deleteRoom(roomId);
    } else {
      // Transfer host if current host left
      if (wasHost) {
        const newHost = [...r.players.keys()][0];
        r.host = newHost;
        console.log(`[Room ${roomId}] Host left. New host: ${newHost}`);
      }
      saveRoom(r);
      io.to(roomId).emit('room:update', roomSnapshot(roomId));
    }
  });

  socket.on('room:ready', async (roomId: string, ready: boolean) => {
    try {
      const match = await matchManager.getMatch(roomId);
      const r = rooms.get(roomId);
      
      if (!match && !r) {
        console.error('[room:ready] Match/Room not found:', roomId);
        return;
      }

      // Update in MatchManager if exists
      if (match) {
        const player = findPlayerInMatch(match, socket.id);
        if (player) {
          await matchManager.setPlayerReady(roomId, player.playerId, ready);
          console.log(`[room:ready] ✅ Player ${socket.id.slice(0, 8)} (playerId: ${player.playerId.slice(0, 8)}) ready=${ready} in match ${roomId.slice(0, 8)}`);
        } else {
          console.warn(`[room:ready] ⚠️ Player ${socket.id.slice(0, 8)} not found in match ${roomId.slice(0, 8)}`);
        }
      }

      // Update legacy room (DUAL MODE)
      if (r) {
        const p = r.players.get(socket.id);
        if (p) {
          p.ready = ready;
          saveRoom(r).catch(err => console.error('[room:ready] saveRoom error:', err));
        }
      }

      // Broadcast updated room state
      const updatedMatch = await matchManager.getMatch(roomId);
      if (updatedMatch) {
        const snapshot = matchToRoomSnapshot(updatedMatch);
        io.to(roomId).emit('room:update', snapshot);
      } else if (r) {
        io.to(roomId).emit('room:update', roomSnapshot(roomId));
      }

    } catch (err) {
      console.error('[room:ready] Error:', err);
    }
  });

  // [SỬA LẠI] room:startGame giờ chỉ báo hiệu, không gửi dữ liệu game
  socket.on('room:startGame', async (roomId: string, cb?: (result: any) => void) => {
    try {
      const match = await matchManager.getMatch(roomId);
      const r = rooms.get(roomId);
      
      if (!match && !r) {
        cb?.({ ok: false, error: 'Phòng không tồn tại' });
        return;
      }

      // Check host permission using match if available
      if (match) {
        const player = findPlayerInMatch(match, socket.id);
        if (!player || player.playerId !== match.hostPlayerId) {
          console.error('[room:startGame] Only host can start game');
          cb?.({ ok: false, error: 'Chỉ chủ phòng mới có thể bắt đầu' });
          return;
        }

        // Check player count
        if (match.players.length < 2) {
          cb?.({ ok: false, error: 'Cần ít nhất 2 người chơi' });
          return;
        }

        // Check if all non-host players are ready (host doesn't need to be ready)
        const nonHostPlayers = match.players.filter(p => p.playerId !== match.hostPlayerId);
        const allNonHostReady = nonHostPlayers.every(p => p.ready);
        
        console.log(`[room:startGame] 🔍 Ready check:`, {
          matchId: roomId.slice(0, 8),
          hostPlayerId: match.hostPlayerId.slice(0, 8),
          totalPlayers: match.players.length,
          nonHostPlayersCount: nonHostPlayers.length,
          allNonHostReady,
          players: match.players.map(p => ({ 
            playerId: p.playerId.slice(0, 8),
            socketId: p.socketId?.slice(0, 8) || 'N/A',
            isHost: p.playerId === match.hostPlayerId, 
            ready: p.ready 
          }))
        });
        
        if (!allNonHostReady) {
          cb?.({ ok: false, error: 'Chưa đủ người sẵn sàng' });
          return;
        }

        // Start match in Redis
        await matchManager.startMatch(roomId);
        console.log(`[room:startGame] ✅ Match ${roomId} started by ${socket.id}`);

      } else if (r) {
        // Legacy room checks
        if (r.host !== socket.id) {
          cb?.({ ok: false, error: 'Chỉ chủ phòng mới có thể bắt đầu' });
          return;
        }
        if (r.players.size < 2) {
          cb?.({ ok: false, error: 'Cần ít nhất 2 người chơi' });
          return;
        }
        
        const allReady = [...r.players.values()].every(p => p.id === r.host || p.ready);
        if (!allReady) {
          cb?.({ ok: false, error: 'Chưa đủ người sẵn sàng' });
          return;
        }
        
        r.started = true;
        saveRoom(r).catch(err => console.error('[room:startGame] saveRoom error:', err));
      }
      
      // Initialize ready set for this room
      playersReadyForGame.set(roomId, new Set());

      // Notify players to prepare (wait for game:im_ready)
      io.to(roomId).emit('game:starting', { roomId });
      console.log(`[Room ${roomId}] Game is starting. Waiting for clients to be ready...`);

      cb?.({ ok: true, seed: match?.seed || r?.seed });

    } catch (err) {
      console.error('[room:startGame] Error:', err);
      cb?.({ ok: false, error: 'unknown' });
    }
  });
  
  // [THÊM MỚI] Lắng nghe sự kiện client báo đã sẵn sàng
  socket.on('game:im_ready', async (roomId: string) => {
    try {
      const match = await matchManager.getMatch(roomId);
      const r = rooms.get(roomId);
      const readySet = playersReadyForGame.get(roomId);
      
      if (!match && !r) {
        console.warn(`[game:im_ready] Received ready signal for non-existent room: ${roomId}`);
        return;
      }
      
      if (!readySet) {
        console.warn(`[game:im_ready] No ready set found for room: ${roomId}`);
        return;
      }

      readySet.add(socket.id);
      
      // Determine expected player count from match or legacy room
      const expectedPlayers = match ? match.players.length : (r ? r.players.size : 0);
      
      console.log(`[Room ${roomId}] Player ${socket.id} is ready. (${readySet.size}/${expectedPlayers})`);

      // 3. Khi TẤT CẢ client trong phòng đã báo sẵn sàng
      if (readySet.size === expectedPlayers) {
        console.log(`[Room ${roomId}] ✅ All players are ready. Sending full game data.`);
        
        // Generate pieces from the correct generator
        let first: any;
        let playerIds: string[] = [];
        let gen: Generator<TType, any, any> | undefined;
        
        if (match) {
          // Create generator from match seed and STORE IT for future requests
          gen = bagGenerator(match.seed);
          first = nextPieces(gen, 14);
          playerIds = match.players.map(p => p.socketId);
          
          // Store generator for this match so game:requestNext can use it
          matchGenerators.set(roomId, gen);
          console.log(`[Room ${roomId}] 💾 Stored generator for Redis match`);
        } else if (r) {
          // Use legacy room generator (already stored in room)
          first = nextPieces(r.gen, 14);
          playerIds = [...r.players.keys()];
        }

        // Gửi MỘT LẦN DUY NHẤT sự kiện 'game:start' với đầy đủ dữ liệu
        for (const playerId of playerIds) {
          const opponentId = playerIds.find(id => id !== playerId);
          io.to(playerId).emit('game:start', {
            next: first,
            roomId,
            opponent: opponentId,
            seed: match?.seed || r?.seed
          });
        }
        
        // Dọn dẹp sau khi đã gửi
        playersReadyForGame.delete(roomId);
        
        console.log(`[Room ${roomId}] 🎮 Game started! Piece queue sent to all players.`);
      }
    } catch (err) {
      console.error('[game:im_ready] Error:', err);
    }
  });


  // This event is now only triggered by the robust handshake above
  socket.on('game:start', (roomId: string) => {
    // This listener can be simplified or removed if all start logic is handled by the ready handshake
    // For now, keeping it but it's less critical.
    const r = rooms.get(roomId);
    if (!r || r.host !== socket.id) return;
    if (![...r.players.values()].every(p => p.ready)) return;
    r.started = true;
    const first = nextPieces(r.gen, 14); 
    saveRoom(r);
    
    for (const [playerId] of r.players) {
      const opponentId = [...r.players.keys()].find(id => id !== playerId);
      io.to(playerId).emit('game:start', { 
        next: first, 
        roomId,
        opponent: opponentId 
      });
    }
  });

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
        // Use legacy room generator
        pieces = nextPieces(r.gen, n);
      } else if (match && match.status === 'in_progress') {
        // Get stored generator for this Redis match
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
      // Check both Redis and legacy Map (DUAL MODE)
      const match = await matchManager.getMatch(roomId);
      const r = rooms.get(roomId);
      
      if (!match && !r) {
        console.warn(`[game:state] Room not found: ${roomId}`);
        return;
      }
      
      // Broadcast to all other players in the room
      socket.to(roomId).emit('game:state', { ...payload, from: socket.id });
      
      // Optional: Log for debugging (can remove in production)
      // console.log(`[game:state] Broadcasted state from ${socket.id} to room ${roomId}`);
    } catch (err) {
      console.error('[game:state] Error:', err);
    }
  });

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

  // NEW: Client sends attack (garbage) to server
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

      // Get attacker info
      let attackerId = socket.id;
      let attackerAlive = false;
      
      if (match) {
        const attacker = findPlayerInMatch(match, socket.id);
        if (!attacker || !attacker.alive) {
          console.error('[game:attack] Attacker not found or dead:', socket.id);
          return;
        }
        attackerId = attacker.playerId;
        attackerAlive = true;
        
        // Note: We don't update totalGarbageSent here because updatePlayerStats
        // doesn't support it. The stat will be calculated at match end.
      } else if (r) {
        const p = r.players.get(socket.id);
        if (!p || !p.alive) {
          console.error('[game:attack] Attacker not in legacy room or dead');
          return;
        }
        attackerAlive = true;
        p.lastAttackTime = Date.now();
      }

      console.log(`[game:attack] ${socket.id} sending ${lines} garbage lines (isClear=${isClear})`);

      // Find opponents
      const opponents: Array<{ id: string; socketId: string }> = [];
      
      if (match) {
        match.players
          .filter(p => p.playerId !== attackerId && p.alive)
          .forEach(p => opponents.push({ id: p.playerId, socketId: p.socketId }));
      } else if (r) {
        [...r.players.entries()]
          .filter(([sid, sp]) => sid !== socket.id && sp.alive)
          .forEach(([sid]) => opponents.push({ id: sid, socketId: sid }));
      }

      if (opponents.length === 0) {
        console.log('[game:attack] No alive opponents');
        return;
      }

      // Queue garbage to each opponent
      for (const opponent of opponents) {
        let actualGarbage = 0;

        if (match) {
          // Use Redis atomic operations
          if (isClear) {
            // Target just cleared lines → CANCEL mechanic
            const result = await matchManager.cancelGarbage(roomId, opponent.id, lines);
            actualGarbage = result.remaining;

            console.log(
              `[game:attack] 🔄 Cancel mechanic for ${opponent.id}: ${result.cancelled} cancelled, ${result.remaining} remaining`
            );

            // Notify opponent about cancel
            if (result.cancelled > 0) {
              io.to(opponent.socketId).emit('game:garbageCancelled', {
                cancelled: result.cancelled,
                remaining: result.remaining,
              });
            }
          } else {
            // Normal attack → QUEUE garbage
            actualGarbage = await matchManager.queueGarbage(roomId, opponent.id, lines);
          }

          // Notify opponent about incoming garbage
          if (actualGarbage > 0) {
            io.to(opponent.socketId).emit('game:incomingGarbage', { 
              lines: actualGarbage,
              from: attackerId,
            });

            // Update opponent stats
            const oppData = match.players.find(p => p.playerId === opponent.id);
            if (oppData) {
              // Note: pendingGarbage is managed by queueGarbage/cancelGarbage
              // We don't need to update it separately here
            }
          }

        } else if (r) {
          // Legacy room logic (keep for backward compatibility)
          const opp = r.players.get(opponent.id);
          if (!opp) continue;

          if (isClear && opp.pendingGarbage > 0) {
            // Cancel mechanic
            const cancelled = Math.min(opp.pendingGarbage, lines);
            opp.pendingGarbage -= cancelled;
            const remaining = lines - cancelled;
            
            console.log(`[game:attack] Cancelled ${cancelled} garbage for ${opponent.id}, remaining: ${remaining}`);
            
            io.to(opponent.socketId).emit('game:garbageCancelled', { 
              cancelled, 
              remaining: opp.pendingGarbage 
            });
            
            if (remaining > 0) {
              opp.pendingGarbage += remaining;
              actualGarbage = remaining;
            }
          } else {
            opp.pendingGarbage += lines;
            actualGarbage = lines;
          }

          console.log(`[game:attack] Queued ${actualGarbage} garbage to ${opponent.id}, total pending: ${opp.pendingGarbage}`);
          
          io.to(opponent.socketId).emit('game:incomingGarbage', { 
            lines: opp.pendingGarbage,
            from: attackerId,
          });
        }

        // Schedule actual application after delay (~500ms)
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

      // Save room state (legacy)
      if (r) {
        saveRoom(r).catch(err => console.error('[game:attack] saveRoom error:', err));
      }

    } catch (err) {
      console.error('[game:attack] Error:', err);
    }
  });

  // Keep old game:lock for backward compatibility / other logic
  socket.on('game:lock', (roomId: string, payload: { lines: number; tspinType?: 'none' | 'mini' | 'normal'; pc?: boolean }) => {
    const r = rooms.get(roomId);
    if (!r || !r.started) return;
    const p = r.players.get(socket.id);
    if (!p) return;

    const lines = Math.max(0, Math.min(4, Number(payload?.lines) || 0));
    const tspinType = payload?.tspinType ?? 'none';
    const pc = Boolean(payload?.pc);

    console.log(`[LOCK] Player ${socket.id} locked piece: ${lines} lines, tspinType: ${tspinType}, pc: ${pc}`);

    // Update combo and b2b state
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
  });

  socket.on('game:topout', async (roomId: string, reason?: string) => {
    try {
      // 🔄 DUAL MODE: Check both Redis and legacy Map
      const match = await matchManager.getMatch(roomId);
      const r = rooms.get(roomId);
      
      if (!match && !r) {
        console.warn(`[game:topout] Room/Match not found: ${roomId}`);
        return;
      }

      // ========================================
      // REDIS MATCH LOGIC
      // ========================================
      if (match) {
        const player = findPlayerInMatch(match, socket.id);
        if (!player) {
          console.warn(`[game:topout] Player not found in Redis match: ${socket.id}`);
          return;
        }
        
        console.log(`[game:topout] Player ${player.playerId} topped out in match ${roomId}. Reason: ${reason || 'topout'}`);
        
        // Mark player as dead (modify in-memory, then save)
        player.alive = false;
        match.updatedAt = Date.now();
        await redis.set(`match:${roomId}`, JSON.stringify(match), { EX: 7200 }); // 2h TTL
        
        // Broadcast room update
        io.to(roomId).emit('room:update', matchToRoomSnapshot(match));
        
        // Check if game should end
        const alivePlayers = match.players.filter(p => p.alive);
        
        if (alivePlayers.length <= 1) {
          console.log(`[game:topout] Match ${roomId} ended. Alive players:`, alivePlayers.length);
          
          const winner = alivePlayers[0] || null;
          const winnerId = winner?.playerId || undefined;
          
          // Send different messages based on reason
          if (reason === 'afk') {
            // Loser (AFK player) gets: "Bạn đã AFK nên bị xử thua"
            io.to(socket.id).emit('game:over', { 
              winner: winner?.socketId ?? null, 
              reason: 'Bạn đã AFK nên bị xử thua' 
            });
            // Winner gets: "Đối thủ đã AFK"
            if (winner) {
              io.to(winner.socketId).emit('game:over', { 
                winner: winner.socketId, 
                reason: 'Đối thủ đã AFK' 
              });
            }
          } else {
            // Normal game over
            io.to(roomId).emit('game:over', { winner: winner?.socketId ?? null });
          }
          
          // End match and save stats
          await matchManager.endMatch(roomId, winnerId);
          
          // Reset all players for potential rematch (update in-memory and save)
          match.status = 'waiting'; // Allow rematch
          match.players.forEach(p => {
            p.alive = true;
            p.ready = false;
            p.combo = 0;
            p.b2b = 0;
          });
          match.updatedAt = Date.now();
          await redis.set(`match:${roomId}`, JSON.stringify(match), { EX: 7200 });
          
          // Clear all garbage queues
          for (const p of match.players) {
            await redis.del(`garbage:${roomId}:${p.playerId}`);
          }
          
          console.log(`[game:topout] ✅ Match ${roomId} reset for rematch`);
        }
        
        return;
      }

      // ========================================
      // LEGACY ROOM LOGIC
      // ========================================
      if (r) {
        const p = r.players.get(socket.id);
        if (!p) return;
        p.alive = false;
        saveRoom(r);
        io.to(roomId).emit('room:update', roomSnapshot(roomId));
        const alive = [...r.players.values()].filter(p => p.alive);
        if (alive.length <= 1) {
          // Determine different reasons for each side
          if (reason === 'afk') {
            // Send different messages to each player
            // Loser (AFK player) gets: "Bạn đã AFK nên bị xử thua"
            io.to(socket.id).emit('game:over', { 
              winner: alive[0]?.id ?? null, 
              reason: 'Bạn đã AFK nên bị xử thua' 
            });
            // Winner gets: "Đối thủ đã AFK"
            if (alive[0]) {
              io.to(alive[0].id).emit('game:over', { 
                winner: alive[0].id, 
                reason: 'Đối thủ đã AFK' 
              });
            }
          } else {
            // Normal game over - same message for both
            io.to(roomId).emit('game:over', { winner: alive[0]?.id ?? null });
          }
          r.started = false;
          // reset ready state
          r.players.forEach(pl => { 
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
  socket.on('ranked:enter', async (playerId: string, elo: number, cb?: (ok:boolean)=>void) => {
    // playerId giờ là accountId (string number)
    try { 
      accountToSocket.set(playerId, socket.id); // Map accountId → socket.id
      await addToRankedQueue(playerId, elo); 
      cb?.(true); 
    } catch { cb?.(false); }
  });
  
  socket.on('ranked:leave', async (playerId: string) => { 
    accountToSocket.delete(playerId);
    await removeFromRankedQueue(playerId); 
  });
  
  socket.on('ranked:match', async (playerId: string, elo: number, cb?: (data:any)=>void) => {
    // Note: This flow should also be updated to the ready-handshake for robustness
    const opponent = await popBestMatch(elo, 150, playerId);
    if (!opponent) {
      // No opponent yet, ensure we are in queue
      accountToSocket.set(playerId, socket.id);
      await addToRankedQueue(playerId, elo);
      return cb?.({ match: null });
    }
    if (opponent.playerId === playerId) {
      // Safety: shouldn't happen due to exclude, but guard
      accountToSocket.set(playerId, socket.id);
      await addToRankedQueue(playerId, elo);
      return cb?.({ match: null });
    }
    
    // Resolve opponent's socket.id từ accountId
    const oppSocketId = accountToSocket.get(String(opponent.playerId));
    if (!oppSocketId || !io.sockets.sockets.has(oppSocketId as any)) {
      // Opponent not currently connected; requeue and exit
      accountToSocket.set(playerId, socket.id);
      await addToRankedQueue(playerId, elo);
      cb?.({ match: null });
      return;
    }

    // Create ephemeral room for the match
    const roomId = `rk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
    const seed = Date.now() ^ roomId.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
    const room: Room = {
      id: roomId,
      host: socket.id, // requester is host
      gen: bagGenerator(seed),
      players: new Map([
        [socket.id, { id: socket.id, ready: true, alive: true, combo: 0, b2b: 0, name: playerId, pendingGarbage: 0, lastAttackTime: 0 }],
        [oppSocketId, { id: oppSocketId, ready: true, alive: true, combo: 0, b2b: 0, name: opponent.playerId, pendingGarbage: 0, lastAttackTime: 0 }]
      ]),
      started: true,
      seed,
      maxPlayers: 2,
    };
    rooms.set(roomId, room);
    saveRoom(room);
    // Join sockets into the room
    try { socket.join(roomId); } catch {}
    const oppSocket = oppSocketId ? io.sockets.sockets.get(oppSocketId) : undefined;
    try { oppSocket?.join(roomId); } catch {}
    // Notify both sockets if connected
    socket.emit('ranked:found', { roomId, opponent: opponent.playerId, elo: opponent.elo });
    if (oppSocketId) io.to(oppSocketId).emit('ranked:found', { roomId, opponent: playerId, elo });
    // Broadcast room update
    io.to(roomId).emit('room:update', roomSnapshot(roomId));
    const first = nextPieces(room.gen, 14);
    
    // Fix for ranked match: send opponent's socket.id for WebRTC negotiation
    io.to(socket.id).emit('game:start', { next: first, roomId, opponent: oppSocketId });
    if (oppSocketId) io.to(oppSocketId).emit('game:start', { next: first, roomId, opponent: socket.id });

    cb?.({ match: { roomId, opponent: opponent.playerId, elo: opponent.elo } });
  });

  socket.on('disconnect', async () => {
    console.log(`[disconnect] ${socket.id} disconnected`);

    try {
      // Find match this player was in (Redis)
      const matchInfo = await matchManager.getMatchByPlayer(socket.id);
      
      if (matchInfo) {
        const { matchId } = matchInfo;
        const match = await matchManager.getMatch(matchId);
        
        if (match) {
          // Mark as disconnected in Redis
          await matchManager.markDisconnected(matchId, socket.id);

          console.log(`[disconnect] Player ${socket.id} marked disconnected in match ${matchId}`);

          // Notify other players
          socket.to(matchId).emit('player:disconnect', { playerId: socket.id });

          // If match was in progress, handle disconnect
          if (match.status === 'in_progress') {
            const player = findPlayerInMatch(match, socket.id);
            if (player) {
              // Mark player as not alive
              player.alive = false;
              player.lastActionTime = Date.now();
              match.updatedAt = Date.now();
              
              // Broadcast player death
              io.to(matchId).emit('game:playerDied', { playerId: socket.id });

              // Check if match should end
              const alivePlayers = match.players.filter(p => p.alive);
              
              if (alivePlayers.length === 1) {
                // One player left - declare winner
                await matchManager.endMatch(matchId, alivePlayers[0].playerId);
                
                // Cleanup generator for this match
                matchGenerators.delete(matchId);
                console.log(`[disconnect] 🧹 Cleaned up generator for match ${matchId}`);
                
                io.to(matchId).emit('game:over', {
                  winner: alivePlayers[0].playerId,
                  reason: 'Đối thủ đã ngắt kết nối',
                });
                
                console.log(`[disconnect] Winner: ${alivePlayers[0].playerId} in match ${matchId}`);
              } else if (alivePlayers.length === 0) {
                // All dead - draw
                await matchManager.endMatch(matchId);
                
                // Cleanup generator for this match
                matchGenerators.delete(matchId);
                console.log(`[disconnect] 🧹 Cleaned up generator for match ${matchId}`);
                
                io.to(matchId).emit('game:draw');
                console.log(`[disconnect] Draw in match ${matchId}`);
              }
            }
          } else {
            // Match not started yet
            const wasHost = match.hostPlayerId === socket.id;
            
            if (wasHost) {
              // Host left → delete match
              await matchManager.deleteMatch(matchId);
              deleteRoom(matchId).catch(err => console.error('[disconnect] deleteRoom error:', err));
              io.to(matchId).emit('room:closed', { reason: 'host-left' });
              console.log(`[disconnect] Host left, match ${matchId} deleted`);
            } else {
              // Regular player left → just update
              const updatedMatch = await matchManager.getMatch(matchId);
              if (updatedMatch) {
                const snapshot = matchToRoomSnapshot(updatedMatch);
                io.to(matchId).emit('room:update', snapshot);
              }
            }
          }
        }
      }

      // Also handle legacy rooms (DUAL MODE)
      for (const [roomId, r] of rooms) {
        const p = r.players.get(socket.id);
        if (!p) continue;
        
        // Notify other players in room about disconnect
        socket.to(roomId).emit('player:disconnect', { playerId: socket.id });
        
        // Mark temporarily disconnected
        p.alive = false;
        saveRoom(r).catch(err => console.error('[disconnect] saveRoom error:', err));
        io.to(roomId).emit('room:update', roomSnapshot(roomId));
        
        // After 5s, if still not back and game started, declare the other as winner
        setTimeout(() => {
          const rr = rooms.get(roomId);
          if (!rr || !rr.started) return;
          const pp = rr.players.get(socket.id);
          if (pp && pp.alive === false) {
            // pp loses - send different messages to each player
            const alive = [...rr.players.values()].filter(x => x.id !== socket.id);
            
            // Loser (disconnected player) - if they're still connected somehow
            io.to(socket.id).emit('game:over', { 
              winner: alive[0]?.id ?? null, 
              reason: 'Bạn đã ngắt kết nối nên bị xử thua' 
            });
            
            // Winner gets different message
            if (alive[0]) {
              io.to(alive[0].id).emit('game:over', { 
                winner: alive[0].id, 
                reason: 'Đối thủ đã ngắt kết nối' 
              });
            }
            
            rr.started = false;
            rr.players.forEach(pl => { 
              pl.ready = false; 
              pl.alive = true; 
              pl.combo = 0; 
              pl.b2b = 0;
              pl.pendingGarbage = 0;
              pl.lastAttackTime = 0;
            });
            saveRoom(rr).catch(err => console.error('[disconnect] saveRoom error:', err));
          }
        }, 5000);
      }
      
      // Remove accountId → socket.id mapping
      for (const [accountId, sockId] of accountToSocket.entries()) {
        if (sockId === socket.id) {
          accountToSocket.delete(accountId);
        }
      }
      
      // Remove ping tracking
      playerPings.delete(socket.id);
      
      // Remove legacy IP mapping
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
    players: [...r.players.values()].map(p => {
      const pingData = playerPings.get(p.id);
      return {
        id: p.id,
        ready: p.ready,
        alive: p.alive,
        name: p.name ?? null,
        ping: pingData?.ping ?? null
      };
    })
  };
}

server.listen(PORT, HOST, () => {
  console.log(`Versus server listening on http://${HOST}:${PORT}`);
});