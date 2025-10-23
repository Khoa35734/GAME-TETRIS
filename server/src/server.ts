import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { setupSocketHandlers } from './handles/socketHandlers';
import MatchmakingSystem from './matchmaking';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ===============================
// ?? Middleware x�c th?c socket
// ===============================
io.use((socket, next) => {
  const { token, accountId, username } = socket.handshake.auth || {};

  if (!token || !accountId) {
    console.warn(`[Socket.IO] ? Unauthorized connection from ${socket.id}`);
    return next(new Error('Authentication error'));
  }

  // G?n d? li?u user l�n socket
  (socket as any).accountId = Number(accountId);
  (socket as any).username = username || `User${accountId}`;

  console.log(`[Socket.IO] ? Authenticated user ${username} (${accountId})`);
  next();
});

const matchmaking = new MatchmakingSystem(io);

// ===============================
// ?? Setup event co b?n
// ===============================
setupSocketHandlers(io, matchmaking);

export { io, server };
