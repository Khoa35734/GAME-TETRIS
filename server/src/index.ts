import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
console.log('Loaded PG_USER =', process.env.PG_USER);

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { initRedis, saveRoom, deleteRoom, addToRankedQueue, removeFromRankedQueue, popBestMatch } from './redisStore';
import { initPostgres } from './postgres';

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0'; // bind all interfaces for LAN access

const app = express();

function normalizeIp(ip: string | undefined | null): string {
  if (!ip) return '';
  let v = String(ip).trim();
  if (v.startsWith('::ffff:')) v = v.slice(7);
  if (v === '::1') v = '127.0.0.1';
  return v;
}
app.use(cors());
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
  // Basic connectivity test
  socket.on('ping', () => socket.emit('pong'));
  // Broadcast chat for quick manual test
  socket.on('chat:message', (data: any) => {
    io.emit('chat:message', { from: socket.id, ...data });
  });
  socket.on('room:create', (roomId: string, optsOrCb?: any, cbMaybe?: any) => {
    let options: { maxPlayers?: number; name?: string } | undefined;
    let cb: ((result: RoomAck) => void) | undefined;

    if (typeof optsOrCb === 'function') {
      cb = optsOrCb as (result: RoomAck) => void;
    } else {
      options = optsOrCb;
      if (typeof cbMaybe === 'function') cb = cbMaybe;
    }

    if (rooms.has(roomId)) {
      cb?.({ ok: false, error: 'exists' });
      return;
    }

    const maxPlayers = Math.max(2, Math.min(Number(options?.maxPlayers) || 2, 6));
    const seed = Date.now() ^ roomId.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
    const displayName = typeof options?.name === 'string' ? options.name : undefined;

    const room: Room = {
      id: roomId,
      host: socket.id,
      gen: bagGenerator(seed),
      players: new Map([[socket.id, { id: socket.id, ready: false, alive: true, combo: 0, b2b: 0, name: displayName, pendingGarbage: 0, lastAttackTime: 0 }]]),
      started: false,
      seed,
      maxPlayers,
    };
    rooms.set(roomId, room);
    socket.join(roomId);
    cb?.({ ok: true, roomId });
    saveRoom(room);
    io.to(roomId).emit('room:update', roomSnapshot(roomId));
  });

  socket.on('room:join', (roomId: string, optsOrCb?: any, cbMaybe?: any) => {
    let options: { name?: string } | undefined;
    let cb: ((result: RoomAck) => void) | undefined;

    if (typeof optsOrCb === 'function') {
      cb = optsOrCb as (result: RoomAck) => void;
    } else {
      options = optsOrCb;
      if (typeof cbMaybe === 'function') cb = cbMaybe;
    }

    const r = rooms.get(roomId);
    if (!r) {
      cb?.({ ok: false, error: 'not-found' });
      return;
    }
    if (r.started) {
      cb?.({ ok: false, error: 'started' });
      return;
    }
    if (r.players.size >= r.maxPlayers && !r.players.has(socket.id)) {
      cb?.({ ok: false, error: 'full' });
      return;
    }

    const displayName = typeof options?.name === 'string' ? options.name : undefined;

    // Check if player was already in room (reconnecting)
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
    socket.join(roomId);
    cb?.({ ok: true, roomId });
    saveRoom(r);
    io.to(roomId).emit('room:update', roomSnapshot(roomId));
    
    // Notify others if this is a reconnect
    if (isReconnect && r.started) {
      socket.to(roomId).emit('player:reconnect', { playerId: socket.id });
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

  socket.on('room:ready', (roomId: string, ready: boolean) => {
    const r = rooms.get(roomId);
    if (!r) return;
    const p = r.players.get(socket.id);
    if (!p) return;
    p.ready = ready;
    saveRoom(r);
    io.to(roomId).emit('room:update', roomSnapshot(roomId));
  });

  socket.on('room:startGame', (roomId: string, cb?: (result: any) => void) => {
    const r = rooms.get(roomId);
    if (!r) {
      cb?.({ ok: false, error: 'Phòng không tồn tại' });
      return;
    }
    if (r.host !== socket.id) {
      cb?.({ ok: false, error: 'Chỉ chủ phòng mới có thể bắt đầu' });
      return;
    }
    if (r.players.size < 2) {
      cb?.({ ok: false, error: 'Cần ít nhất 2 người chơi' });
      return;
    }
    
    // Check all non-host players are ready
    const allReady = [...r.players.values()].every(p => p.id === r.host || p.ready);
    if (!allReady) {
      cb?.({ ok: false, error: 'Chưa đủ người sẵn sàng' });
      return;
    }
    
    r.started = true;
    const first = nextPieces(r.gen, 14);
    saveRoom(r);
    cb?.({ ok: true });
    
    // Emit game:start LẦN 1: Để RoomLobby navigate ngay lập tức
    io.to(roomId).emit('game:start', { roomId });
    
    // Emit game:start LẦN 2: Sau delay để Versus đã mount và nhận data đầy đủ
    setTimeout(() => {
      for (const [playerId] of r.players) {
        const opponentId = [...r.players.keys()].find(id => id !== playerId);
        io.to(playerId).emit('game:start', { 
          next: first, 
          roomId,
          opponent: opponentId 
        });
      }
      console.log(`[Room ${roomId}] Game started, sent game:start with full data to all players`);
    }, 1000); // 1 giây delay để clients mount Versus component
  });

  socket.on('game:start', (roomId: string) => {
    const r = rooms.get(roomId);
    if (!r || r.host !== socket.id) return;
    if (![...r.players.values()].every(p => p.ready)) return;
    r.started = true;
    const first = nextPieces(r.gen, 14); // 14 = 7 preview + current for both sides typically
    saveRoom(r);
    
    // Send game:start to each player with their opponent's ID (consistent with room:startGame)
    for (const [playerId] of r.players) {
      const opponentId = [...r.players.keys()].find(id => id !== playerId);
      io.to(playerId).emit('game:start', { 
        next: first, 
        roomId,
        opponent: opponentId 
      });
    }
  });

  socket.on('game:requestNext', (roomId: string, n: number = 7) => {
    const r = rooms.get(roomId);
    if (!r || !r.started) return;
    io.to(socket.id).emit('game:next', nextPieces(r.gen, n));
  });

  // Relay real-time board state to other players in the same room
  socket.on('game:state', (roomId: string, payload: any) => {
    if (!rooms.has(roomId)) return;
    socket.to(roomId).emit('game:state', { ...payload, from: socket.id });
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
  socket.on('game:attack', (roomId: string, payload: { lines: number }) => {
    const r = rooms.get(roomId);
    if (!r || !r.started) return;
    const p = r.players.get(socket.id);
    if (!p || !p.alive) return;

    const lines = Math.max(0, Math.min(10, Number(payload?.lines) || 0));
    if (lines === 0) return;

    console.log(`[ATTACK] Player ${socket.id} sending ${lines} garbage lines`);

    p.lastAttackTime = Date.now();

    // Find opponents
    const opponents = [...r.players.entries()].filter(([sid, sp]) => sid !== socket.id && sp.alive);
    if (opponents.length === 0) {
      console.log('[ATTACK] No alive opponents');
      return;
    }

    // Queue garbage to each opponent with delay
    for (const [oppId, opp] of opponents) {
      // Cancel mechanic: if opponent has pending garbage, reduce it first
      if (opp.pendingGarbage > 0) {
        const cancelled = Math.min(opp.pendingGarbage, lines);
        opp.pendingGarbage -= cancelled;
        const remaining = lines - cancelled;
        console.log(`[ATTACK] Cancelled ${cancelled} garbage for ${oppId}, remaining: ${remaining}`);
        
        // Notify opponent about cancel
        io.to(oppId).emit('game:garbageCancelled', { cancelled, remaining: opp.pendingGarbage });
        
        if (remaining > 0) {
          opp.pendingGarbage += remaining;
        }
      } else {
        opp.pendingGarbage += lines;
      }

      console.log(`[ATTACK] Queued ${lines} garbage to ${oppId}, total pending: ${opp.pendingGarbage}`);
      
      // Notify opponent of incoming garbage (they see it in queue)
      io.to(oppId).emit('game:incomingGarbage', { lines: opp.pendingGarbage });

      // Schedule actual application after delay (~500ms)
      setTimeout(() => {
        const rr = rooms.get(roomId);
        if (!rr) return;
        const oo = rr.players.get(oppId);
        if (!oo || !oo.alive) return;
        
        const toApply = oo.pendingGarbage;
        if (toApply > 0) {
          oo.pendingGarbage = 0;
          console.log(`[ATTACK] Applying ${toApply} garbage to ${oppId}`);
          io.to(oppId).emit('game:applyGarbage', { lines: toApply });
        }
      }, 500);
    }

    saveRoom(r);
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

  socket.on('game:topout', (roomId: string, reason?: string) => {
    const r = rooms.get(roomId);
    if (!r) return;
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
    // playerId là accountId
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
    io.to(socket.id).emit('game:start', { next: first, roomId, opponent: opponent.playerId });
    if (oppSocketId) io.to(oppSocketId).emit('game:start', { next: first, roomId, opponent: playerId });
    cb?.({ match: { roomId, opponent: opponent.playerId, elo: opponent.elo } });
  });

  socket.on('disconnect', () => {
    for (const [roomId, r] of rooms) {
      const p = r.players.get(socket.id);
      if (!p) continue;
      
      // Notify other players in room about disconnect
      socket.to(roomId).emit('player:disconnect', { playerId: socket.id });
      
      // Mark temporarily disconnected
      p.alive = false;
      saveRoom(r);
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
          saveRoom(rr);
        }
      }, 5000); // Changed from 10s to 5s
    }
    
    // Remove accountId → socket.id mapping
    for (const [accountId, sockId] of accountToSocket.entries()) {
      if (sockId === socket.id) {
        accountToSocket.delete(accountId);
      }
    }
    
    // Remove legacy IP mapping
    if (ip) {
      const set = ipToSockets.get(ip);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) ipToSockets.delete(ip);
      }
    }
  });
});

function roomSnapshot(roomId: string) {
  const r = rooms.get(roomId);
  if (!r) return null;
  return {
    id: r.id,
    host: r.host,
    started: r.started,
    maxPlayers: r.maxPlayers,
    players: [...r.players.values()].map(p => ({ id: p.id, ready: p.ready, alive: p.alive, name: p.name ?? null }))
  };
}

server.listen(PORT, HOST, () => {
  console.log(`Versus server listening on http://${HOST}:${PORT}`);
});