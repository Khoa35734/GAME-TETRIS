import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

const PORT = Number(process.env.PORT) || 4000;

const app = express();
app.use(cors());
app.get('/health', (_req, res) => res.json({ ok: true }));

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
};

type Room = {
  id: string;
  host: string;
  gen: Generator<TType, any, any>;
  players: Map<string, PlayerState>;
  started: boolean;
};

const rooms = new Map<string, Room>();

io.on('connection', (socket) => {
  socket.on('room:create', (roomId: string, cb?: (ok: boolean) => void) => {
    if (rooms.has(roomId)) return cb?.(false);
    rooms.set(roomId, {
      id: roomId,
      host: socket.id,
      gen: bagGenerator(Date.now() ^ roomId.split('').reduce((a,c)=>a+c.charCodeAt(0),0)),
      players: new Map([[socket.id, { id: socket.id, ready: false, alive: true, combo: 0, b2b: 0 }]]),
      started: false,
    });
    socket.join(roomId);
    cb?.(true);
    io.to(roomId).emit('room:update', roomSnapshot(roomId));
  });

  socket.on('room:join', (roomId: string, cb?: (ok: boolean) => void) => {
    const r = rooms.get(roomId);
    if (!r || r.started) return cb?.(false);
    r.players.set(socket.id, { id: socket.id, ready: false, alive: true, combo: 0, b2b: 0 });
    socket.join(roomId);
    cb?.(true);
    io.to(roomId).emit('room:update', roomSnapshot(roomId));
  });

  socket.on('room:leave', (roomId: string) => {
    const r = rooms.get(roomId);
    if (!r) return;
    r.players.delete(socket.id);
    socket.leave(roomId);
    if (r.players.size === 0) rooms.delete(roomId);
    else io.to(roomId).emit('room:update', roomSnapshot(roomId));
  });

  socket.on('room:ready', (roomId: string, ready: boolean) => {
    const r = rooms.get(roomId);
    if (!r) return;
    const p = r.players.get(socket.id);
    if (!p) return;
    p.ready = ready;
    io.to(roomId).emit('room:update', roomSnapshot(roomId));
  });

  socket.on('game:start', (roomId: string) => {
    const r = rooms.get(roomId);
    if (!r || r.host !== socket.id) return;
    if (![...r.players.values()].every(p => p.ready)) return;
    r.started = true;
    const first = nextPieces(r.gen, 14); // 14 = 7 preview + current for both sides typically
    io.to(roomId).emit('game:start', { next: first });
  });

  socket.on('game:requestNext', (roomId: string, n: number = 7) => {
    const r = rooms.get(roomId);
    if (!r || !r.started) return;
    io.to(socket.id).emit('game:next', nextPieces(r.gen, n));
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
  });

  socket.on('game:topout', (roomId: string) => {
    const r = rooms.get(roomId);
    if (!r) return;
    const p = r.players.get(socket.id);
    if (!p) return;
    p.alive = false;
    io.to(roomId).emit('room:update', roomSnapshot(roomId));
    const alive = [...r.players.values()].filter(p => p.alive);
    if (alive.length <= 1) {
      io.to(roomId).emit('game:over', { winner: alive[0]?.id ?? null });
      r.started = false;
      // reset ready state
      r.players.forEach(pl => { pl.ready = false; pl.alive = true; pl.combo = 0; pl.b2b = 0; });
    }
  });

  socket.on('disconnect', () => {
    for (const [roomId, r] of rooms) {
      if (r.players.has(socket.id)) {
        r.players.delete(socket.id);
        io.to(roomId).emit('room:update', roomSnapshot(roomId));
        if (r.players.size === 0) rooms.delete(roomId);
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
    players: [...r.players.values()].map(p => ({ id: p.id, ready: p.ready, alive: p.alive }))
  };
}

server.listen(PORT, () => {
  console.log(`Versus server listening on http://localhost:${PORT}`);
});
