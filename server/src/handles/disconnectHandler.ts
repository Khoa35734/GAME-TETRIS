import { Socket, Server } from 'socket.io';
import {
  rooms,
  accountToSocket,
  ipToSockets,
  matchGenerators,
  playerPings,
  onlineUsers,
} from '../core/state';
import {
  matchManager,
  type PlayerMatchState,
} from '../managers/matchManager';
import { findPlayerInMatch } from '../game/helper';
import { redis } from '../stores/redisStore';
import type { PlayerState } from '../core/types';

export function setupDisconnectHandler(socket: Socket, io: Server) {
  socket.on('disconnect', async () => {
    console.log(`[Disconnect] Socket ${socket.id} disconnected`);

    // 1. Cleanup Redis-backed matches
    const activeMatchIds = await matchManager.getActiveMatches();
    for (const matchId of activeMatchIds) {
      const match = await matchManager.getMatch(matchId);
      if (!match) continue;

      const player = findPlayerInMatch(match, socket.id);
      if (!player) continue;

      console.log(
        `[Disconnect] Marking player ${player.playerId} as disconnected in match ${matchId}`,
      );

      await matchManager.markDisconnected(matchId, player.playerId);

      const refreshed = await matchManager.getMatch(matchId);
      if (!refreshed) continue;

      const activePlayers = refreshed.players.filter((p: PlayerMatchState) => p.alive);

      if (activePlayers.length === 0) {
        console.log(`[Disconnect] Both players disconnected, cleaning up match ${matchId}`);
        await matchManager.deleteMatch(matchId);
        const generatorKey = `${matchId}-${player.accountId ?? player.playerId}`;
        matchGenerators.delete(generatorKey);
      } else {
        const opponent = activePlayers.find(
          (p) => p.playerId !== player.playerId && Boolean(p.socketId),
        );
        if (opponent?.socketId) {
          io.to(opponent.socketId).emit('game:opponentDisconnected');
        }
      }
    }

    // 2. Cleanup legacy in-memory rooms (fallback path)
    for (const [roomId, room] of rooms.entries()) {
      if (!room.players.has(socket.id)) continue;

      const player = room.players.get(socket.id) as PlayerState | undefined;
      if (!player) continue;

      console.log(`[Disconnect] Player ${player.name ?? socket.id} left room ${roomId}`);

      room.players.delete(socket.id);

      if (room.players.size === 0) {
        rooms.delete(roomId);
        console.log(`[Disconnect] Room ${roomId} deleted (empty)`);
        continue;
      }

      const remainingPlayer = Array.from(room.players.values())[0];
      if (!remainingPlayer) continue;

      io.to(remainingPlayer.id).emit('game:opponentDisconnected');

      setTimeout(() => {
        const currentRoom = rooms.get(roomId);
        if (!currentRoom) return;
        const stillPresent = currentRoom.players.has(remainingPlayer.id);
        if (stillPresent && currentRoom.players.size === 1) {
          io.to(remainingPlayer.id).emit('game:forceEnd', { reason: 'opponent_disconnect' });
          rooms.delete(roomId);
        }
      }, 5000);
    }

    // 3. Cleanup account mapping
    for (const [accountId, sid] of accountToSocket.entries()) {
      if (sid === socket.id) {
        accountToSocket.delete(accountId);
        console.log(`[Disconnect] Removed account mapping for ${accountId}`);
      }
    }

    // 4. Cleanup online presence
    let disconnectedAccountId: number | null = null;
    for (const [accountId, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(accountId);
        disconnectedAccountId = accountId;
        console.log(`[Disconnect] User ${accountId} is now offline`);
        break;
      }
    }

    if (disconnectedAccountId !== null) {
      io.emit('user:offline', { accountId: disconnectedAccountId });
    }

    // 5. Cleanup IP tracking
    for (const [ip, sockets] of ipToSockets.entries()) {
      if (sockets.delete(socket.id) && sockets.size === 0) {
        ipToSockets.delete(ip);
      }
    }

    // 6. Cleanup Redis user auth mapping
    try {
      const userKey = await redis.get(`socket:${socket.id}:user`);
      if (userKey) {
        await redis.del(`socket:${socket.id}:user`);
      }
    } catch (err) {
      console.error('[Disconnect] Error cleaning up Redis:', err);
    }

    // 7. Cleanup ping tracking
    playerPings.delete(socket.id);
  });
}

