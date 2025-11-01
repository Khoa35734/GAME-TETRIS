import { Server, Socket } from 'socket.io';
import { redis, saveRoom, deleteRoom, addToRankedQueue, removeFromRankedQueue, popBestMatch, storeSocketUser, removeSocketUser } from '../stores/redisStore';
import { matchManager, MatchData, PlayerMatchState } from '../managers/matchManager';
import MatchmakingSystem from '../matchmaking';
import BO3MatchManager from '../managers/bo3MatchManager';
import { bagGenerator, nextPieces, TType } from '../game/pieceGenerator';
import { onlineUsers as onlineUsersState, userPresence } from '../core/state';
import { setupRoomHandlers } from './roomHandlers';
export type PlayerState = {
  id: string;
  ready: boolean;
  alive: boolean;
  combo: number;
  b2b: number;
  name?: string;
  pendingGarbage: number;
  lastAttackTime: number;
};

export type Room = {
  id: string;
  host: string;
  gen: Generator<TType, any, any>;
  players: Map<string, PlayerState>;
  started: boolean;
  seed: number;
  maxPlayers: number;
};

function normalizeIp(ip: string | undefined | null): string {
  if (!ip) return '';
  let v = String(ip).trim();
  if (v.startsWith('::ffff:')) v = v.slice(7);
  if (v === '::1') v = '127.0.0.1';
  return v;
}

function matchToRoomSnapshot(match: MatchData) {
  return {
    id: match.matchId,
    host: match.hostPlayerId,
    started: match.status === 'in_progress',
    maxPlayers: match.maxPlayers,
    players: match.players.map((p) => ({
      id: p.playerId,
      ready: p.ready,
      alive: p.alive,
      name: p.accountId || null,
      combo: p.combo || 0,
      b2b: p.b2b || 0,
      pendingGarbage: p.pendingGarbage || 0,
    })),
  };
}

function findPlayerInMatch(match: MatchData | null, socketId: string): PlayerMatchState | undefined {
  if (!match) return undefined;
  return match.players.find((p) => p.socketId === socketId);
}

export function setupSocketHandlers(io: Server, matchmaking: MatchmakingSystem) {
  console.log('[SocketHandlers] Setting up socket event handlers...');

  io.on('connection', async (socket: Socket) => {
    const accountId = (socket as any).accountId;
    const username = (socket as any).username;
    console.log(`\n[Socket] ✅ User connected: ${username} (ID: ${accountId}, Socket: ${socket.id})`);

setupRoomHandlers(socket, io);
    // Store socket user info in Redis
    try {
      await storeSocketUser(socket.id, accountId, username);
      console.log(`[Socket] 💾 Stored socket user in Redis: ${username} (${accountId})`);
    } catch (error) {
      console.error('[Socket] ❌ Failed to store socket user in Redis:', error);
    }

    // Update online users
    onlineUsersState.set(accountId, socket.id);
    userPresence.set(accountId, {
      status: 'online',
      since: Date.now(),
    });

    // Notify matchmaking system
    matchmaking.handleSocketConnected(socket);

    // ==========================================
    // MATCHMAKING & GAME EVENTS
    // ==========================================

    // [ĐÃ SỬA] Xử lý khi client tải xong màn hình game và báo sẵn sàng
    // Dán code này vào file: socketHandlers.ts (thay thế hàm cũ)

// [ĐÃ SỬA] Xử lý khi client tải xong màn hình game và báo sẵn sàng
// File: socketHandlers.ts

    const handlePlayerReady = async (roomId: string) => {
      const accountId = (socket as any).accountId;
      const username = (socket as any).username;

      if (!roomId) {
        console.warn(`[Socket] ⚠️ ${username} sent 'player:ready' without roomId`);
        return;
      }

      console.log(`[Socket] ✅ ${username} (${accountId}) is ready in room ${roomId}`);

      try {
        const readiness = await matchManager.setPlayerReady(roomId, socket.id, true);
        if (!readiness) {
          console.error(`[Socket] ❌ Match not found (roomId: ${roomId}) when setting ready.`);
          socket.emit('matchmaking:error', { error: 'Match not found after ready confirmation' });
          return;
        }

        const { match, statusChanged } = readiness;
        const readyCount = match.players.filter((p) => p.ready).length;

        if (!statusChanged) {
          console.log(`[Socket] ⏳ Waiting for all players in ${roomId} (ready ${readyCount}/${match.maxPlayers})`);
          return;
        }

        const generator = bagGenerator(match.seed);
        const initialPieces = nextPieces(generator, 14);

        const players = match.players.slice(0, 2);
        if (players.length < 2) {
          console.warn(`[Socket] ⚠️ Not enough players to start match ${roomId}`);
          return;
        }

        const payload = {
          countdown: 3,
          roomId: match.roomId ?? roomId,
          seed: match.seed,
          next: initialPieces,
          player1: {
            id: players[0].accountId ?? players[0].playerId,
            name: players[0].name ?? null,
            socketId: players[0].socketId,
          },
          player2: {
            id: players[1].accountId ?? players[1].playerId,
            name: players[1].name ?? null,
            socketId: players[1].socketId,
          },
        };

        io.to(roomId).emit('game:start', payload);
        console.log(`[Socket] 🚀 Emitted 'game:start' for ${roomId}`);
      } catch (error) {
        console.error(`[Socket] ❌ Error processing 'player:ready' for ${username} in room ${roomId}:`, error);
        socket.emit('matchmaking:error', { error: 'Failed processing ready status' });
      }
    };

    socket.on('player:ready', handlePlayerReady);
    socket.on('game:im_ready', handlePlayerReady);

socket.on('matchmaking:join', async (data: { mode: 'casual' | 'ranked' }) => {
      console.log(`[Socket] 🔍 ${username} joining ${data?.mode || 'casual'} queue`);
      try {
        await matchmaking.handleJoinQueue(socket, data);
      } catch (error) {
        console.error('[Socket] ❌ Error joining queue:', error);
        socket.emit('matchmaking:error', { error: 'Failed to join queue' });
      }
    });

    socket.on('matchmaking:cancel', () => {
      console.log(`[Socket] 🚫 ${username} cancelled matchmaking`);
      try {
        matchmaking.handleCancelQueue(socket);
      } catch (error) {
        console.error('[Socket] ❌ Error cancelling queue:', error);
      }
    });

    socket.on('matchmaking:confirm-accept', (data: { matchId: string }) => {
      console.log(`[Socket] ✅ ${username} accepted match ${data.matchId}`);
      try {
        matchmaking.handleConfirmAccept(socket, data.matchId);
      } catch (error) {
        console.error('[Socket] ❌ Error confirming match:', error);
        socket.emit('matchmaking:error', { error: 'Failed to confirm match' });
      }
    });

    socket.on('matchmaking:confirm-decline', (data: { matchId: string }) => {
      console.log(`[Socket] ❌ ${username} declined match ${data.matchId}`);
      try {
        matchmaking.handleConfirmDecline(socket, data.matchId);
      } catch (error) {
        console.error('[Socket] ❌ Error declining match:', error);
      }
    });

    // ====================================================================
    // [START] SỬA LỖI ĐỒNG BỘ BOARD
    // ====================================================================
    // Client 'Versus.tsx' gửi sự kiện 'game:state', không phải 'player:update'.
    // Client cũng lắng nghe 'game:state' để nhận board của đối thủ.
    socket.on('game:state', (roomId: string, payload: any) => {
      if (!roomId || !payload) {
        return;
      }
      // Gửi (relay) trạng thái này cho tất cả người chơi khác trong phòng
      // Thêm 'from: socket.id' để client bên kia biết đây là trạng thái của đối thủ
      socket.to(roomId).emit('game:state', { ...payload, from: socket.id });
    });
    socket.on('game:attack', (roomId: string, data: { lines: number }) => {
      if (!roomId || !data || typeof data.lines !== 'number' || data.lines <= 0) {
        console.warn(`[Socket] ⚠️ Received invalid 'game:attack' from ${socket.id}`);
        return;
      }

      console.log(`[Socket] 💣 Player ${socket.id} sent ${data.lines} garbage lines to room ${roomId}`);

      const payload = { lines: data.lines, from: socket.id };

      // Gửi sự kiện mới cho hook 'game:applyGarbage'
      socket.to(roomId).emit('game:applyGarbage', payload);

      // Giữ sự kiện legacy 'game:garbage' cho client cũ
      socket.to(roomId).emit('game:garbage', data.lines);
    });
    // ====================================================================
    // [END] SỬA LỖI ĐỒNG BỘ BOARD
    // ====================================================================


    // ====================================================================
    // [START] SỬA LỖI GAME OVER
    // ====================================================================
    // Client 'Versus.tsx' gửi 'game:topout', không phải 'player:topout'.
    // Client cũng lắng nghe 'game:over', không phải 'match:end'.
       socket.on('game:topout', async (roomId: string, reason: string) => {
      if (!roomId) {
        console.warn(`[Socket] ⚠️ ${socket.id} sent 'game:topout' without a roomId.`);
        return;
      }

      console.log(`[Socket] 🛑 Player ${socket.id} topped out in room ${roomId}. Reason: ${reason}`);

      try {
        const result = await matchManager.resolveTopout(roomId, socket.id);
        if (!result) {
          console.warn(`[Socket] ⚠️ Unable to resolve topout for room ${roomId}`);
          return;
        }

        io.to(roomId).emit('game:over', {
          winner: result.winnerId ?? null,
          loser: result.loserId,
          reason: reason || 'Topout',
        });
      } catch (error) {
        console.error(`[Socket] ❌ Error resolving topout in ${roomId}:`, error);
      }
    });

    socket.on('disconnect', async (reason) => {
      console.log(`\n[Socket] ⛔ User disconnected: ${username} (${accountId})`);
      console.log(`[Socket] Reason: ${reason}`);

      // Handle matchmaking disconnect
      try {
        matchmaking.handleDisconnect(socket);
      } catch (error) {
        console.error('[Socket] ❌ Error handling matchmaking disconnect:', error);
      }

      // Clean up Redis
      try {
        await removeSocketUser(socket.id);
        console.log(`[Socket] 🗑️ Removed socket user from Redis: ${username}`);
      } catch (error) {
        console.error('[Socket] ❌ Failed to remove socket user from Redis:', error);
      }

      // Update online status
      onlineUsersState.delete(accountId);
      userPresence.set(accountId, {
        status: 'offline',
        since: Date.now(),
      });

      console.log(`[Socket] Current online users: ${onlineUsersState.size}`);
    });

    // ==========================================
    // ERROR HANDLER
    // ==========================================
    
    socket.on('error', (error) => {
      console.error(`[Socket] ⚠️ Socket error for ${username}:`, error);
    });

    // Send connection confirmation
    socket.emit('user:authenticated', {
      accountId,
      username,
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    console.log(`[Socket] 📡 Connection setup complete for ${username}\n`);
  });

  // Global error handler
  io.engine.on('connection_error', (err: any) => {
    console.error('[Socket.IO] Connection error:', err);
  });

  console.log('[SocketHandlers] ✅ Socket handlers setup complete\n');
}

