import 'dotenv/config';
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
// Track IP to live socket ids (can be multiple tabs)
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
      players: new Map([[socket.id, { id: socket.id, ready: false, alive: true, combo: 0, b2b: 0, name: displayName }]]),
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

    r.players.set(socket.id, { id: socket.id, ready: false, alive: true, combo: 0, b2b: 0, name: displayName });
    socket.join(roomId);
    cb?.({ ok: true, roomId });
    saveRoom(r);
    io.to(roomId).emit('room:update', roomSnapshot(roomId));
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
    r.players.delete(socket.id);
    socket.leave(roomId);
    if (r.players.size === 0) { rooms.delete(roomId); deleteRoom(roomId); }
    else { saveRoom(r); io.to(roomId).emit('room:update', roomSnapshot(roomId)); }
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

  socket.on('game:start', (roomId: string) => {
    const r = rooms.get(roomId);
    if (!r || r.host !== socket.id) return;
    if (![...r.players.values()].every(p => p.ready)) return;
    r.started = true;
    const first = nextPieces(r.gen, 14); // 14 = 7 preview + current for both sides typically
    saveRoom(r);
    io.to(roomId).emit('game:start', { next: first });
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

  // Garbage logic (simple guideline-ish)
  socket.on('game:lock', (roomId: string, payload: { lines: number; tspin?: boolean; pc?: boolean }) => {
    const r = rooms.get(roomId);
    if (!r || !r.started) return;
    const p = r.players.get(socket.id);
    if (!p) return;

    let g = 0;
    if (payload.pc) {
      g += 10;
    } else {
      const base = payload.tspin ? [2,4,6,0] : [0,1,2,4]; // 0/Single/Double/Triple/Quad
      g += base[payload.lines] || 0;
      // B2B bonus for T-Spin or Quad
      if (payload.tspin && payload.lines > 0 || payload.lines === 4) {
        g += p.b2b >= 1 ? 1 : 0;
        p.b2b += 1;
      } else if (payload.lines > 0) {
        p.b2b = 0;
      }
      // Combo
      if (payload.lines > 0) p.combo += 1; else p.combo = -1;
      if (p.combo >= 1) g += Math.min(5, Math.floor((p.combo + 1) / 2));
    }

    // Send garbage to all other players in room
    for (const [sid, sp] of r.players) {
      if (sid !== socket.id && sp.alive) io.to(sid).emit('game:garbage', g);
    }
    saveRoom(r);
  });

  socket.on('game:topout', (roomId: string) => {
    const r = rooms.get(roomId);
    if (!r) return;
    const p = r.players.get(socket.id);
    if (!p) return;
    p.alive = false;
    saveRoom(r);
    io.to(roomId).emit('room:update', roomSnapshot(roomId));
    const alive = [...r.players.values()].filter(p => p.alive);
    if (alive.length <= 1) {
      io.to(roomId).emit('game:over', { winner: alive[0]?.id ?? null });
      r.started = false;
      // reset ready state
      r.players.forEach(pl => { pl.ready = false; pl.alive = true; pl.combo = 0; pl.b2b = 0; });
      saveRoom(r);
    }
  });

  // Ranked queue events
  socket.on('ranked:enter', async (playerId: string, elo: number, cb?: (ok:boolean)=>void) => {
    try { await addToRankedQueue(playerId, elo); cb?.(true); } catch { cb?.(false); }
  });
  socket.on('ranked:leave', async (playerId: string) => { await removeFromRankedQueue(playerId); });
  socket.on('ranked:match', async (playerId: string, elo: number, cb?: (data:any)=>void) => {
    // playerId here is IP identity; we still operate room with socket ids
    const opponent = await popBestMatch(elo, 150, playerId);
    if (!opponent) {
      // No opponent yet, ensure we are in queue
      await addToRankedQueue(playerId, elo);
      return cb?.({ match: null });
    }
    if (opponent.playerId === playerId) {
      // Safety: shouldn't happen due to exclude, but guard
      await addToRankedQueue(playerId, elo);
      return cb?.({ match: null });
    }
    // Resolve opponent's live socket by IP id or treat as socket id
    const resolveOpponentSocketId = (pid: string): string | undefined => {
      const byIp = ipToSockets.get(String(pid));
      if (byIp && byIp.size > 0) return Array.from(byIp)[0];
      // As a fallback, if pid looks like a socket id and exists, use it
      return io.sockets.sockets.has(pid as any) ? pid : undefined;
    };

    const oppSocketId = resolveOpponentSocketId(String(opponent.playerId));
    if (!oppSocketId) {
      // Opponent not currently connected; requeue and exit
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
        [socket.id, { id: socket.id, ready: true, alive: true, combo: 0, b2b: 0, name: socket.id }],
        [oppSocketId, { id: oppSocketId, ready: true, alive: true, combo: 0, b2b: 0, name: opponent.playerId }]
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
    io.to(socket.id).emit('game:start', { next: first, roomId });
    if (oppSocketId) io.to(oppSocketId).emit('game:start', { next: first, roomId });
    cb?.({ match: { roomId, opponent: opponent.playerId, elo: opponent.elo } });
  });

  socket.on('disconnect', () => {
    for (const [roomId, r] of rooms) {
      const p = r.players.get(socket.id);
      if (!p) continue;
      // Mark temporarily disconnected
      p.alive = false;
      saveRoom(r);
      io.to(roomId).emit('room:update', roomSnapshot(roomId));
      // After 10s, if still not back and game started, declare the other as winner
      setTimeout(() => {
        const rr = rooms.get(roomId);
        if (!rr || !rr.started) return;
        const pp = rr.players.get(socket.id);
        if (pp && pp.alive === false) {
          // pp loses
          const alive = [...rr.players.values()].filter(x => x.id !== socket.id);
          io.to(roomId).emit('game:over', { winner: alive[0]?.id ?? null, reason: 'disconnect' });
          rr.started = false;
          rr.players.forEach(pl => { pl.ready = false; pl.alive = true; pl.combo = 0; pl.b2b = 0; });
          saveRoom(rr);
        }
      }, 10000);
    }
    // Remove mapping
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
