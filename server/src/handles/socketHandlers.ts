import { Server, Socket } from 'socket.io';
import { redis, saveRoom, deleteRoom, addToRankedQueue, removeFromRankedQueue, popBestMatch, storeSocketUser, removeSocketUser } from '../stores/redisStore';
import { matchManager, MatchData, PlayerMatchState } from '../managers/matchManager';
import MatchmakingSystem from '../matchmaking';
import BO3MatchManager from '../managers/bo3MatchManager';
import { bagGenerator, nextPieces, TType } from '../game/pieceGenerator';
import { onlineUsers as onlineUsersState, userPresence } from '../core/state';

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
    socket.on('game:im_ready', async (roomId: string) => {
      if (!roomId) {
        console.warn(`[Socket] ⚠️ ${username} sent 'game:im_ready' with no roomId`);
        return;
      }

      console.log(`[Socket] 🙋 ${username} (${accountId}) is READY in room ${roomId}`);

      let match: MatchData | null = null;

      try {
        // Step 1: Set player as ready
        // (Lưu ý: Đảm bảo playerId của bạn trong matchManager là socket.id)
        match = await matchManager.setPlayerReady(roomId, socket.id, true);
        if (!match) {
          throw new Error(`Match not found (roomId: ${roomId})`);
        }

        // Step 2: Check if all players are ready and match is full
        const allPlayersReady = match.players.length >= match.maxPlayers &&
                                match.players.every(p => p.ready);

        if (allPlayersReady && match.status === 'waiting') {
          console.log(`[Socket] 🏁 All players ready in ${roomId}. Attempting to start match...`);

          // Step 3: Update match status to 'in_progress'
          const startedMatch = await matchManager.startMatch(roomId);
          if (!startedMatch) {
            throw new Error('Failed to start match in matchManager');
          }
          
          console.log(`[Socket] 🚀 Match ${roomId} started! Emitting 'game:start' to clients...`);

          // Step 4: EMIT 'game:start' to ALL players in the room
          const firstPieces = nextPieces(bagGenerator(startedMatch.seed), 7);
          
          for (const player of startedMatch.players) {
            const opponent = startedMatch.players.find(p => p.socketId !== player.socketId);
            
            io.to(player.socketId).emit('game:start', {
              roomId: startedMatch.roomId || startedMatch.matchId,
              opponent: opponent ? opponent.socketId : null,
              next: firstPieces,
            });
          }
        } else if (match.status !== 'waiting') {
           console.log(`[Socket] ⏳ Player ${username} is ready, but match ${roomId} is already ${match.status}.`);
        } else {
           console.log(`[Socket] ⏳ Player ${username} is ready. Waiting for other players in ${roomId}...`);
        }

      } catch (error) {
        console.error(`[Socket] ❌ Error processing 'game:im_ready' for ${username} in room ${roomId}:`, error);
        socket.emit('matchmaking:error', { error: 'Failed to set ready status or start match' });
      }
    });
    
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

    // Thêm event nhận trạng thái từ client và broadcast cho đối thủ
    socket.on('player:update', (data) => {
      if (!data?.roomId) return;
      // Broadcast cho đối thủ trong room (trừ chính player)
      socket.to(data.roomId).emit('opponent:update', {
        playerId: socket.id,
        board: data.board,
        hold: data.hold,
        next: data.next,
        garbage: data.garbage,
        score: data.score,
      });
    });

    // Khi một bên game over, broadcast kết thúc trận đấu cho cả room
    socket.on('player:topout', (data) => {
      if (!data?.roomId) return;
      io.in(data.roomId).emit('match:end', {
        winner: data.winner || null,
        loser: socket.id,
        reason: data.reason,
      });
    });

    // ==========================================
    // DISCONNECT HANDLER
    // ==========================================
    
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