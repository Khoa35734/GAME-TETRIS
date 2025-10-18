import { Socket, Server } from 'socket.io';
import {
  rooms,
  accountToSocket,
  ipToSockets,
  matchGenerators,
  playerPings,
  onlineUsers,
} from '../core/state';
import matchManager from '../managers/matchManager';
import { findPlayerInMatch } from '../libs/helpers';
import redis from '../stores/redisStore';

export function setupDisconnectHandler(socket: Socket, io: Server) {
  socket.on('disconnect', async () => {
    console.log(`[Disconnect] Socket ${socket.id} disconnected`);

    // 1. Cleanup Redis matches
    const allMatchIds = await matchManager.getAllMatchIds();
    for (const matchId of allMatchIds) {
      const match = await matchManager.getMatch(matchId);
      if (!match) continue;

      const player = findPlayerInMatch(match, socket.id);
      if (player) {
        console.log(`[Disconnect] Marking player ${player.accountId} as disconnected in match ${matchId}`);

        const updatedPlayers = match.players.map((p) =>
          p.socketId === socket.id ? { ...p, disconnected: true } : p
        );

        await matchManager.updateMatch(matchId, { players: updatedPlayers });

        // Nếu cả 2 đều disconnect → cleanup
        if (updatedPlayers.every((p) => p.disconnected)) {
          console.log(`[Disconnect] Both players disconnected, cleaning up match ${matchId}`);
          await matchManager.deleteMatch(matchId);
          matchGenerators.delete(`${matchId}-${player.accountId}`);
        } else {
          // Đối thủ còn lại thắng
          const opponent = match.players.find((p) => p.socketId !== socket.id);
          if (opponent && !opponent.disconnected) {
            io.to(opponent.socketId).emit('game:opponentDisconnected');
          }
        }
      }
    }

    // 2. Cleanup legacy rooms
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex((p) => p.socketId === socket.id);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        console.log(`[Disconnect] Player ${player.username} left room ${roomId}`);

        room.players.splice(playerIndex, 1);

        if (room.players.length === 0) {
          rooms.delete(roomId);
          console.log(`[Disconnect] Room ${roomId} deleted (empty)`);
        } else {
          // Mark room as dead, trigger game over sau 5s
          room.status = 'dead';
          const remaining = room.players[0];
          io.to(remaining.socketId).emit('game:opponentDisconnected');

          setTimeout(async () => {
            const currentRoom = rooms.get(roomId);
            if (currentRoom && currentRoom.status === 'dead') {
              io.to(remaining.socketId).emit('game:forceEnd', { reason: 'opponent_disconnect' });
              rooms.delete(roomId);
            }
          }, 5000);
        }
      }
    }

    // 3. Cleanup account mapping
    for (const [accountId, sid] of accountToSocket.entries()) {
      if (sid === socket.id) {
        accountToSocket.delete(accountId);
        console.log(`[Disconnect] Removed account mapping for ${accountId}`);
      }
    }

    // 4. Cleanup online presence
    let disconnectedAccountId: string | null = null;
    for (const [accountId, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(accountId);
        disconnectedAccountId = accountId;
        console.log(`[Disconnect] User ${accountId} is now offline`);
        break;
      }
    }

    if (disconnectedAccountId) {
      io.emit('user:offline', { accountId: disconnectedAccountId });
    }

    // 5. Cleanup IP tracking
    for (const [ip, sockets] of ipToSockets.entries()) {
      const idx = sockets.indexOf(socket.id);
      if (idx !== -1) {
        sockets.splice(idx, 1);
        if (sockets.length === 0) {
          ipToSockets.delete(ip);
        }
      }
    }

    // 6. Cleanup Redis user auth
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