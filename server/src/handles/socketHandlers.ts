import { Server, Socket } from 'socket.io';
import { redis, saveRoom, deleteRoom, addToRankedQueue, removeFromRankedQueue, popBestMatch, storeSocketUser, removeSocketUser } from '../stores/redisStore';
import { matchManager, MatchData, PlayerMatchState } from '../managers/matchManager';
import MatchmakingSystem from '../matchmaking';
import BO3MatchManager from '../managers/bo3MatchManager';
import { bagGenerator, nextPieces, TType } from '../game/pieceGenerator';
import { onlineUsers as onlineUsersState, userPresence } from '../core/state';
import { setupRoomHandlers } from './roomHandlers';
import { getFriendIds } from '../services/friendService';
import { getUserPresence } from '../core/presence';
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
    const accountId = Number((socket as any).accountId);
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
try {
  const friendIds = await getFriendIds(accountId);

  for (const friendId of friendIds) {
    // Nếu bạn bè đó đang online → gửi event đến họ
      const fid = Number(friendId); // ép kiểu
  const friendSocketId = onlineUsersState.get(fid);
    if (friendSocketId) {
      console.log(`[Presence] Notify ${friendId} about ${username} (${accountId}) -> ${!!friendSocketId}`);

      io.to(friendSocketId).emit('presence:update', {
        userId: accountId,   
        status: 'online',
        mode: undefined,
        since: Date.now(),
     });
    }
  }
} catch (err) {
  console.error(`[Socket] ❌ Failed to notify friends of ${username} going online`, err);
}
    console.log(`[Socket] 📡 Broadcasted presence: ${username} is online`);
    // Notify matchmaking system
    matchmaking.handleSocketConnected(socket);
try {
  const friendIds = await getFriendIds(accountId); 
  console.log(`[Socket] 🔄 Sending status of ${friendIds.length} friends to ${username}`);

  for (const friendId of friendIds) {
    const friendPresence = await getUserPresence(Number(friendId));  // ✅ MUST await

    if (friendPresence && friendPresence.status !== 'offline') {
      socket.emit('presence:update', { 
        userId: friendId,
        status: friendPresence.status, 
        mode: friendPresence.mode, 
        since: friendPresence.since 
      });
    }
  }
} catch (error) {
  console.error('[Socket] ❌ Failed to send initial friend presence:', error);
}
    // ==========================================
    // MATCHMAKING & GAME EVENTS
    // ==========================================

    // [ĐÃ SỬA] Xử lý khi client tải xong màn hình game và báo sẵn sàng
    // Dán code này vào file: socketHandlers.ts (thay thế hàm cũ)

// [ĐÃ SỬA] Xử lý khi client tải xong màn hình game và báo sẵn sàng
// File: socketHandlers.ts

    const handlePlayerReady = async (roomIdOrData: string | { roomId: string }) => {
      const accountId = (socket as any).accountId;
      const username = (socket as any).username;

      // Handle both string and object formats
      const roomId = typeof roomIdOrData === 'string' ? roomIdOrData : roomIdOrData?.roomId;

      if (!roomId) {
        console.warn(`[Socket] ⚠️ ${username} sent 'player:ready' without roomId`);
        return;
      }

      console.log(`[Socket] ✅ ${username} (${accountId}) is ready in room ${roomId}`);

      try {
        // Get match first to find the correct player
        const match = await matchManager.getMatch(roomId);
        if (!match) {
          console.error(`[Socket] ❌ Match not found (roomId: ${roomId})`);
          socket.emit('matchmaking:error', { error: 'Match not found' });
          return;
        }

        // Find player by socketId
        const player = match.players.find((p) => p.socketId === socket.id);
        if (!player) {
          console.error(`[Socket] ❌ Player ${socket.id} not found in match ${roomId}`);
          return;
        }

        console.log(`[Socket] 🔍 Found player: ${player.playerId} (${player.name}) in match ${roomId}`);

        const readiness = await matchManager.setPlayerReady(roomId, player.playerId, true);
        if (!readiness) {
          console.error(`[Socket] ❌ Failed to set player ready`);
          return;
        }

        const { match: updatedMatch, statusChanged } = readiness;
        const readyCount = updatedMatch.players.filter((p) => p.ready).length;

        console.log(`[Socket] 📊 Ready status: ${readyCount}/${updatedMatch.maxPlayers} players ready, statusChanged: ${statusChanged}`);

        if (!statusChanged) {
          console.log(`[Socket] ⏳ Waiting for all players in ${roomId} (ready ${readyCount}/${updatedMatch.maxPlayers})`);
          return;
        }

        const generator = bagGenerator(updatedMatch.seed);
        const initialPieces = nextPieces(generator, 14);

        const players = updatedMatch.players.slice(0, 2);
        if (players.length < 2) {
          console.warn(`[Socket] ⚠️ Not enough players to start match ${roomId}`);
          return;
        }

        const toAccountId = (player: PlayerMatchState): number => {
          if (!player.accountId) return 0;
          const parsed = Number(player.accountId);
          return Number.isFinite(parsed) ? parsed : 0;
        };

        const toUsername = (player: PlayerMatchState, fallback: string): string => {
          if (player.name && player.name.length > 0) {
            return player.name;
          }
          if (player.accountId) {
            return `User_${player.accountId}`;
          }
          return fallback;
        };

        const bo3Mode: 'casual' | 'ranked' = updatedMatch.mode === 'ranked' ? 'ranked' : 'casual';
        const bo3MatchId = updatedMatch.matchId || roomId;

        // Initialize BO3 match for all game modes (ranked, casual, custom)
        const bo3Match = matchmaking.bo3MatchManager.createMatch(
          bo3MatchId,
          roomId,
          {
            socketId: players[0].socketId,
            accountId: toAccountId(players[0]),
            username: toUsername(players[0], 'Player1'),
          },
          {
            socketId: players[1].socketId,
            accountId: toAccountId(players[1]),
            username: toUsername(players[1], 'Player2'),
          },
          bo3Mode,
        );

        console.log(`[Socket] 🎮 Created BO3 match for ${roomId}:`, {
          player1: { socket: players[0].socketId, name: players[0].name },
          player2: { socket: players[1].socketId, name: players[1].name },
          mode: updatedMatch.mode
        });

        const payload = {
          countdown: 3,
          roomId: updatedMatch.roomId ?? roomId,
          matchId: updatedMatch.matchId,
          mode: updatedMatch.mode,
          seed: updatedMatch.seed,
          next: initialPieces,
          player1: {
            id: String(players[0].accountId ?? players[0].playerId),
            name: players[0].name ?? null,
            socketId: players[0].socketId,
          },
          player2: {
            id: String(players[1].accountId ?? players[1].playerId),
            name: players[1].name ?? null,
            socketId: players[1].socketId,
          },
        };

        console.log(`[Socket] 🚀 Emitting 'game:start' for ${roomId}`, {
          players: players.map(p => ({ id: p.playerId, name: p.name, socketId: p.socketId })),
          mode: payload.mode
        });

        io.to(roomId).emit('game:start', payload);
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
    // 📊 LIVE STATS RELAY (PPS/APM/Time)
    // ====================================================================
    // Client A emits: socket.emit('stats:update', roomId, { piecesPlaced, attacksSent, elapsedMs })
    // Server relays to other clients in room: socket.to(roomId).emit('stats:update', { from, ...stats })
    socket.on('stats:update', (roomId: string, stats: { piecesPlaced: number; attacksSent: number; elapsedMs: number }) => {
      if (!roomId || !stats) return;
      socket.to(roomId).emit('stats:update', { from: socket.id, ...stats });
    });


    // ====================================================================
    // [START] SỬA LỖI GAME OVER
    // ====================================================================
    // Client 'Versus.tsx' gửi 'game:topout', không phải 'player:topout'.
    // Client cũng lắng nghe 'game:over', không phải 'match:end'.
     // File: src/handles/socketHandlers.ts

    socket.on('game:topout', async (roomId: string, reason: string) => {
      if (!roomId) {
        console.warn(`[Socket] ⚠️ ${socket.id} sent 'game:topout' without a roomId.`);
        return;
      }

      console.log(`[Socket] 🛑 Player ${socket.id} topped out in room ${roomId}. Reason: ${reason}`);

      try {
        // [SỬA LỖI BO3] - Bước 1: Kiểm tra xem đây có phải là trận BO3 không
        const bo3Match = matchmaking.bo3MatchManager.getMatch(roomId); // Tên hàm đúng là 'getMatch'

        if (bo3Match) {
          // [SỬA LỖI BO3] - Bước 2: Nếu ĐÚNG, để BO3 manager xử lý
          console.log(`[Socket] 🏆 Resolving topout via BO3MatchManager for room ${roomId}`);
          // Gọi hàm 'handleGameTopout' MỚI mà chúng ta vừa thêm
          await matchmaking.bo3MatchManager.handleGameTopout(roomId, socket.id, reason);
        } else {
          // [SỬA LỖI BO3] - Bước 3: Nếu KHÔNG, dùng logic BO1 cũ (ví dụ: trận casual)
          console.log(`[Socket] 🏁 Resolving topout via generic matchManager (BO1) for room ${roomId}`);
          const result = await matchManager.resolveTopout(roomId, socket.id);
          if (!result) {
            console.warn(`[Socket] ⚠️ Unable to resolve topout for room ${roomId}`);
            return;
          }

          // Gửi 'game:over' (sự kiện BO1)
          io.to(roomId).emit('game:over', {
            winner: result.winnerId ?? null,
            loser: result.loserId,
            reason: reason || 'Topout',
          });
        }
      } catch (error) {
        console.error(`[Socket] ❌ Error resolving topout in ${roomId}:`, error);
      }
    });
    
    // ====================================================================
    // 🚪 FORFEIT HANDLER - Player voluntarily exits match (0-2 loss)
    // ====================================================================
    socket.on('match:forfeit', async (data: { roomId: string }) => {
      const { roomId } = data;
      if (!roomId) {
        console.warn(`[Socket] ⚠️ ${socket.id} sent 'match:forfeit' without roomId`);
        return;
      }
      
      console.log(`[Socket] 🏳️ Player ${socket.id} forfeited match in room ${roomId}`);
      
      try {
        const bo3Match = matchmaking.bo3MatchManager.getMatch(roomId);
        
        if (bo3Match) {
          // BO3 match: forfeit gives opponent 2-0 win
          const forfeiter = bo3Match.player1.socketId === socket.id ? 'player1' : 'player2';
          const winner = forfeiter === 'player1' ? 'player2' : 'player1';
          
          console.log(`[Socket] 🏆 BO3 forfeit: ${winner} wins 2-0`);
          
          // Emit match end with 2-0 score (to room and directly to both sockets for robustness)
          const payload = {
            winner,
            score: winner === 'player1' 
              ? { player1Wins: 2, player2Wins: 0 }
              : { player1Wins: 0, player2Wins: 2 },
            finalScore: winner === 'player1' ? '2-0' : '0-2',
            reason: 'forfeit',
            bestOf: bo3Match.bestOf,
            winsRequired: bo3Match.winsRequired,
          } as const;

          io.to(roomId).emit('bo3:match-end', payload);
          // Emit directly to individual sockets in case room membership is inconsistent
          io.to(bo3Match.player1.socketId).emit('bo3:match-end', payload);
          io.to(bo3Match.player2.socketId).emit('bo3:match-end', payload);
          
          // Clean up match
          setTimeout(() => {
            matchmaking.bo3MatchManager['activeMatches'].delete(roomId);
            console.log(`[Socket] 🗑️ Cleaned up forfeited match ${roomId}`);
          }, 5000);
        } else {
          // BO1/casual match
          const result = await matchManager.resolveTopout(roomId, socket.id);
          if (result) {
            io.to(roomId).emit('game:over', {
              winner: result.winnerId,
              loser: result.loserId,
              reason: 'forfeit',
            });
          }
        }
      } catch (error) {
        console.error(`[Socket] ❌ Error handling forfeit in ${roomId}:`, error);
      }
    });
    
    socket.on('disconnect', async (reason) => {
      console.log(`\n[Socket] ⛔ User disconnected: ${username} (${accountId})`);
      console.log(`[Socket] Reason: ${reason}`);

      // Handle BO3 match disconnect (forfeit if in active match)
      try {
        const activeMatch = matchmaking.bo3MatchManager.findMatchBySocketId(socket.id);
        if (activeMatch) {
          console.log(`[Socket] 🏳️ Player ${username} disconnected from BO3 match ${activeMatch.roomId}`);
          
          // Determine which player disconnected
          const disconnectedPlayer = activeMatch.player1.socketId === socket.id ? 'player1' : 'player2';
          
          // Auto-forfeit with disconnect reason
          await matchmaking.bo3MatchManager.handlePlayerDisconnect(
            activeMatch.roomId,
            disconnectedPlayer,
            'disconnect'
          );
        }
      } catch (error) {
        console.error('[Socket] ❌ Error handling BO3 disconnect:', error);
      }

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
   try {
  const friendIds = await getFriendIds(accountId);
  for (const friendId of friendIds) {
     const fid = Number(friendId);
  const friendSocketId = onlineUsersState.get(fid);
    if (friendSocketId) {
      console.log(`[Presence] Notify ${friendId} about ${username} (${accountId}) -> ${!!friendSocketId}`);

      io.to(friendSocketId).emit('presence:update', { // Tạm thời broadcast cho tất cả
        userId: accountId,
        status: 'offline',
        mode: undefined,
        since: Date.now(),
     });
    }
  }
} catch (err) {
  console.error(`[Socket] ❌ Failed to notify friends of ${username} going offline`, err);
}
    console.log(`[Socket] 📡 Broadcasted presence: ${username} is offline`);
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

