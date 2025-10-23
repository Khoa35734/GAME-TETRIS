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

    // ================================================================
    // 🌟 SỬA LỖI QUAN TRỌNG:
    // Trận đấu đã được bắt đầu (status: 'in_progress') bởi 'room:startGame'.
    // Chúng ta chỉ cần check 'allPlayersReady' để gửi data.
    // ================================================================
    if (allPlayersReady && match.status === 'in_progress') {
      console.log(`[Socket] 🏁 All players ready in ${roomId}. Emitting 'game:start' to clients...`);

      // Step 3: EMIT 'game:start' to ALL players in the room
      const firstPieces = nextPieces(bagGenerator(match.seed), 7);

      if (match.players.length < 2) {
         console.warn(`[Socket] ⚠️ Match ${roomId} has less than 2 players, aborting start.`);
         return;
      }

      const p1 = match.players[0];
      const p2 = match.players[1];

      for (const player of match.players) {
        // Gửi thông tin chi tiết về cả 2 người chơi
        // (File Versus.tsx của bạn đã sẵn sàng nhận payload này)
        io.to(player.socketId).emit('game:start', {
          roomId: match.roomId || match.matchId,
          player1: { id: p1.accountId || p1.playerId, name: p1.name },
          player2: { id: p2.accountId || p2.playerId, name: p2.name },
          next: firstPieces,
        });
      }
    } else if (match.status !== 'in_progress') {
       console.log(`[Socket] ⏳ Player ${username} is ready, but match ${roomId} is still ${match.status}.`);
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

      // Gửi sự kiện 'game:garbage' (legacy) cho đối thủ
      // Client 'Versus.tsx' có handler 'onGarbage' sẽ gọi 'applyGarbageRows'
      // Đây là cách fix đơn giản nhất.
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
   socket.on('game:topout', (roomId: string, reason: string) => {
      
      if (!roomId) {
        console.warn(`[Socket] ⚠️ ${socket.id} sent 'game:topout' without a roomId.`);
        return;
      }

      console.log(`[Socket] 🏁 Player ${socket.id} topped out in room ${roomId}. Reason: ${reason}`);

      // --- [LOGIC TÌM NGƯỜI THẮNG] ---
      // Server phải tự xác định người thắng.
      // Logic này giả định phòng 1v1.
      const room = io.sockets.adapter.rooms.get(roomId);
      let winnerId: string | null = null;

      if (room) {
        const allPlayers = Array.from(room); // Lấy tất cả socket ID trong phòng
        // Người thắng là người *không phải* socket.id vừa gửi 'game:topout'
        winnerId = allPlayers.find(id => id !== socket.id) || null;
      }
      
      if (winnerId) {
         console.log(`[Socket] 🏆 Winner determined: ${winnerId}`);
      } else {
         console.log(`[Socket] ⚠️ Could not determine winner for room ${roomId}`);
         // Vẫn có thể xảy ra nếu người thắng cũng vừa disconnect
      }
      // --- [HẾT LOGIC TÌM NGƯỜI THẮNG] ---

      // Phát 'game:over' cho TẤT CẢ mọi người trong phòng
      io.in(roomId).emit('game:over', {
        winner: winnerId,         // Gửi ID người thắng vừa tìm được
        loser: socket.id,         // Người gửi là người thua
        reason: reason || 'Topout'  // Gửi lý do (nếu có)
      });

      // (Nâng cao): Tại đây, bạn cũng nên gọi matchManager để cập nhật
      // trạng thái trận đấu trong Redis/DB, ví dụ:
      // matchManager.endMatch(roomId, winnerId, socket.id);
    });
    // ====================================================================
    // [END] SỬA LỖI GAME OVER
    // ====================================================================


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