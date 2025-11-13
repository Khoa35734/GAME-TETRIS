
import dotenv from 'dotenv';
dotenv.config();

console.log('=== Environment Configuration ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('REDIS_URL:', process.env.REDIS_URL);
console.log('================================\n');

import { server, io } from './server';
import { initRedis } from './stores/redisStore';
import { initPostgres } from './stores/postgres';
import { setupFriendshipAssociations } from './models/Friendship';
import { startCleanupJob } from './jobs/cleanup';
import { onlineUsers, userPresence, type Presence } from './core/state';
import messagesRouter from './routes/messages';

const PORT = process.env.PORT || 4000;

// Prevent multiple bootstrap calls (hot reload issue)
let isBootstrapped = false;

async function bootstrap() {
  if (isBootstrapped) {
    console.log('[Bootstrap] ⚠️ Already bootstrapped, skipping...');
    return;
  }
  isBootstrapped = true;

  try {
    // Initialize external services
    console.log('[Bootstrap] Initializing Redis...');
    await initRedis();

    console.log('[Bootstrap] Initializing PostgreSQL...');
    await initPostgres();

    console.log('[Bootstrap] Setting up model associations...');
    setupFriendshipAssociations();

    // Start cleanup job
    startCleanupJob();

    // Start server
    server.listen(PORT, () => {
      console.log(`\n🚀 Server is running on port ${PORT}`);
      console.log(`📡 WebSocket server ready`);
      console.log(`🎮 Matchmaking system initializing...`);
      // Matchmaking system is initialized in server.ts
    });
  } catch (error) {
    console.error('[Bootstrap] Fatal error during startup:', error);
    process.exit(1);
  }
}

bootstrap();

// Graceful shutdown handler
function gracefulShutdown(signal: string) {
  console.log(`\n[Shutdown] Received ${signal}, closing server gracefully...`);
  
  if (server.listening) {
    server.close(() => {
      console.log('[Shutdown] HTTP server closed');
      io.close(() => {
        console.log('[Shutdown] Socket.IO server closed');
        process.exit(0);
      });
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('[Shutdown] Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Presence helper exports (for backward compatibility)
export function isUserOnline(accountId: number): boolean {
  return onlineUsers.has(accountId);
}

export function getOnlineUsers(): number[] {
  return Array.from(onlineUsers.keys());
}
export function getUserPresence(accountId: number): Presence | undefined {
  return userPresence.get(accountId);
}







