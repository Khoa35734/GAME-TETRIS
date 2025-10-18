import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { setupSocketHandlers } from './handles/socketHandlers';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Delegate all socket event wiring to centralized handler
setupSocketHandlers(io);

export { io, server };