import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { setupSocketHandlers } from './handles/socketHandlers';
import MatchmakingSystem from './matchmaking';
import { setupRoomHandlers } from './handles/roomHandlers';
import { match } from 'assert';
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: function (origin: string | undefined, callback: any) {
      // Cho phép Postman, server-to-server, hoặc request nội bộ không có Origin
      if (!origin) return callback(null, true);

      // ✅ Cho phép tất cả IP thuộc mạng nội bộ + localhost
      // Đã SỬA: RegExp này xử lý đúng 10.x.x.x, 172.16-31.x.x, và 192.168.x.x
      const allowedPattern = /^http:\/\/(localhost|127\.0\.0\.1|10(\.\d+){3}|172\.(1[6-9]|2\d|3[0-1])(\.\d+){2}|192\.168(\.\d+){2})(:\d+)?$/;

      if (allowedPattern.test(origin)) {
        // Dòng log này sẽ xác nhận điện thoại của bạn được phép
        console.log('[Socket.IO CORS] ✅ Allowed origin:', origin);
        return callback(null, true);
      }

      console.warn('[Socket.IO CORS] ❌ Blocked origin:', origin);
      return callback(new Error('Not allowed by Socket.IO CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ===============================
// ?? Middleware xc th?c socket
// ===============================
io.use((socket, next) => {
  const { token, accountId, username } = socket.handshake.auth || {};

  if (!token || !accountId) {
    console.warn(`[Socket.IO] ? Unauthorized connection from ${socket.id}`);
    return next(new Error('Authentication error'));
  }

  // G?n d? li?u user ln socket
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
// Room handlers are registered per-socket inside setupSocketHandlers
export { io, server };