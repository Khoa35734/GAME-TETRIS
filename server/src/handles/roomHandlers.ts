import { Server, Socket } from 'socket.io';
import { matchManager } from '../managers/matchManager';
import { matchToRoomSnapshot, findPlayerInMatch } from '../game/helper';
import { RoomAck } from '../core/types';
import { playersReadyForGame, onlineUsers } from '../core/state';

export function setupRoomHandlers(socket: Socket, io: Server) {
  // Create room
  socket.on('room:create', async (roomId: string, optsOrCb?: any, cbMaybe?: any) => {
    let options: { maxPlayers?: number; name?: string } | undefined;
    let cb: ((result: RoomAck) => void) | undefined;

    if (typeof optsOrCb === 'function') {
      cb = optsOrCb as (result: RoomAck) => void;
    } else {
      options = optsOrCb;
      if (typeof cbMaybe === 'function') cb = cbMaybe;
    }

    try {
      const existing = await matchManager.getMatch(roomId);
      if (existing) {
        cb?.({ ok: false, error: 'exists' });
        return;
      }

      const maxPlayers = Math.max(2, Math.min(Number(options?.maxPlayers) || 2, 6));
      const displayName = typeof options?.name === 'string' ? options.name : undefined;

      const match = await matchManager.createMatch({
        matchId: roomId,
        hostPlayerId: socket.id,
        hostSocketId: socket.id,
        mode: 'custom',
        maxPlayers: maxPlayers,
        roomId: roomId,
hostAccountId: (socket as any).username || displayName || (socket as any).accountId.toString(),      });

      await socket.join(roomId);

      console.log(
        `[room:create] ✅ ${socket.id} created match ${roomId} (max ${maxPlayers} players) in Redis`
      );

      cb?.({ ok: true, roomId });

      const snapshot = matchToRoomSnapshot(match);
      io.to(roomId).emit('room:update', snapshot);
    } catch (err) {
      console.error('[room:create] Error:', err);
      cb?.({ ok: false, error: 'unknown' });
    }
  });

  // Join room
  socket.on('room:join', async (roomId: string, optsOrCb?: any, cbMaybe?: any) => {
    let options: { name?: string } | undefined;
    let cb: ((result: RoomAck) => void) | undefined;

    if (typeof optsOrCb === 'function') {
      cb = optsOrCb as (result: RoomAck) => void;
    } else {
      options = optsOrCb;
      if (typeof cbMaybe === 'function') cb = cbMaybe;
    }

    try {
      const match = await matchManager.getMatch(roomId);

      if (!match) {
        cb?.({ ok: false, error: 'not-found' });
        return;
      }

      if (match.status === 'in_progress') {
        cb?.({ ok: false, error: 'started' });
        return;
      }

      if (match.players.length >= match.maxPlayers) {
        const existingPlayer = match.players.find((p) => p.socketId === socket.id);
        if (!existingPlayer) {
          cb?.({ ok: false, error: 'full' });
          return;
        }
      }

      const displayName = typeof options?.name === 'string' ? options.name : undefined;
      const existingPlayer = match.players.find((p) => p.socketId === socket.id);

      if (!existingPlayer) {
        await matchManager.addPlayer(roomId, {
  playerId: socket.id,
  socketId: socket.id,
  accountId: (socket as any).username || displayName || (socket as any).accountId.toString(),
});
        console.log(`[room:join] ✅ ${socket.id} joined match ${roomId}`);
      } else {
        console.log(`[room:join] ✅ ${socket.id} reconnected to match ${roomId}`);
        socket.to(roomId).emit('player:reconnect', { playerId: socket.id });
      }

      await socket.join(roomId);
      cb?.({ ok: true, roomId });

      const updatedMatch = await matchManager.getMatch(roomId);
      if (updatedMatch) {
        const snapshot = matchToRoomSnapshot(updatedMatch);
        io.to(roomId).emit('room:update', snapshot);
      }
    } catch (err) {
      console.error('[room:join] Error:', err);
      cb?.({ ok: false, error: 'unknown' });
    }
  });

  // Sync room snapshot
  socket.on('room:sync', async (roomId: string, cb?: (result: any) => void) => {
    if (typeof roomId !== 'string' || !roomId.trim()) {
      cb?.({ ok: false, error: 'invalid-room' });
      return;
    }

    try {
      const match = await matchManager.getMatch(roomId.trim());
      if (!match) {
        cb?.({ ok: false, error: 'not-found' });
        return;
      }

      const snapshot = matchToRoomSnapshot(match);
      io.to(socket.id).emit('room:update', snapshot);
      cb?.({ ok: true, data: snapshot });
    } catch (err) {
      console.error('[room:sync] Error:', err);
      cb?.({ ok: false, error: 'server-error' });
    }
  });

  // Leave room
  socket.on('room:leave', async (roomId: string) => {
    try {
      const match = await matchManager.getMatch(roomId);
      if (!match) {
        console.warn(`[room:leave] Match not found: ${roomId}`);
        return;
      }

      const player = findPlayerInMatch(match, socket.id);
      if (!player) {
        console.warn(`[room:leave] Player ${socket.id} not found in match ${roomId}`);
        return;
      }

      await matchManager.removePlayer(roomId, player.playerId);
      socket.leave(roomId);
      console.log(
        `[room:leave] ✅ Player ${socket.id.slice(0, 8)} left match ${roomId.slice(0, 8)}`
      );

      const updatedMatch = await matchManager.getMatch(roomId);
      if (!updatedMatch || updatedMatch.players.length === 0) {
        await matchManager.deleteMatch(roomId);
        console.log(`[room:leave] 🗑️ Empty match ${roomId.slice(0, 8)} deleted`);
      } else {
        const snapshot = matchToRoomSnapshot(updatedMatch);
        io.to(roomId).emit('room:update', snapshot);
      }
    } catch (err) {
      console.error('[room:leave] Error:', err);
    }
  });

  // Toggle ready
  socket.on('room:ready', async (roomId: string, ready: boolean) => {
    try {
      const match = await matchManager.getMatch(roomId);

      if (!match) {
        console.error('[room:ready] Match not found:', roomId);
        return;
      }

      const player = findPlayerInMatch(match, socket.id);
      if (player) {
        await matchManager.setPlayerReady(roomId, player.playerId, ready);
        console.log(
          `[room:ready] ✅ Player ${socket.id.slice(0, 8)} ready=${ready} in match ${roomId.slice(
            0,
            8
          )}`
        );
      } else {
        console.warn(
          `[room:ready] ⚠️ Player ${socket.id.slice(0, 8)} not found in match ${roomId.slice(
            0,
            8
          )}`
        );
      }

      const updatedMatch = await matchManager.getMatch(roomId);
      if (updatedMatch) {
        const snapshot = matchToRoomSnapshot(updatedMatch);
        io.to(roomId).emit('room:update', snapshot);
      }
    } catch (err) {
      console.error('[room:ready] Error:', err);
    }
  });

  // Invite friend
  socket.on(
    'room:invite',
    async (
      data: {
        roomId: string;
        friendId: number;
        friendUsername: string;
        inviterName: string;
      },
      cb?: (result: any) => void
    ) => {
      try {
        const { roomId, friendId, friendUsername, inviterName } = data;

        if (!roomId || !friendId || !friendUsername) {
          console.error('[room:invite] ❌ Missing required fields');
          cb?.({ ok: false, error: 'Thiếu thông tin cần thiết' });
          return;
        }

        const match = await matchManager.getMatch(roomId);
        if (!match) {
          console.error('[room:invite] ❌ Match not found:', roomId);
          cb?.({ ok: false, error: 'Phòng không tồn tại' });
          return;
        }

        const inviter = findPlayerInMatch(match, socket.id);
        if (!inviter || inviter.playerId !== match.hostPlayerId) {
          console.error('[room:invite] ❌ Only host can invite');
          cb?.({ ok: false, error: 'Chỉ chủ phòng mới có thể mời bạn bè' });
          return;
        }

        if (match.players.length >= match.maxPlayers) {
          console.error('[room:invite] ❌ Room is full');
          cb?.({ ok: false, error: 'Phòng đã đầy' });
          return;
        }

        const friendSocketId = onlineUsers.get(friendId);
        if (!friendSocketId) {
          console.error('[room:invite] ❌ Friend is offline:', friendId);
          cb?.({ ok: false, error: `${friendUsername} hiện đang offline` });
          return;
        }

        const friendInRoom = match.players.some((p) => {
          const userIdStr = p.playerId.split('_')[0];
          return parseInt(userIdStr) === friendId;
        });
        if (friendInRoom) {
          console.error('[room:invite] ❌ Friend already in room');
          cb?.({ ok: false, error: `${friendUsername} đã ở trong phòng` });
          return;
        }

        io.to(friendSocketId).emit('room:invitation', {
          roomId,
          roomName: match.matchId,
          inviterName: inviterName || inviter.playerId,
          maxPlayers: match.maxPlayers,
          currentPlayers: match.players.length,
          timestamp: Date.now(),
        });

        console.log(
          `[room:invite] ✅ Invitation sent from ${inviterName || inviter.playerId} to ${friendUsername} (${friendId}) for room ${roomId.slice(
            0,
            8
          )}`
        );

        cb?.({
          ok: true,
          message: `Đã gửi lời mời đến ${friendUsername}`,
        });
      } catch (err) {
        console.error('[room:invite] Error:', err);
        cb?.({ ok: false, error: 'Lỗi khi gửi lời mời' });
      }
    }
  );

  // Room chat
  socket.on('room:chat', (roomId: string, message: any, cb?: (ack: RoomAck) => void) => {
    const { rooms } = require('../core/state');
    const r = rooms.get(roomId);
    if (!r) {
      cb?.({ ok: false, error: 'not-found' });
      return;
    }
    if (!r.players.has(socket.id)) {
      cb?.({ ok: false, error: 'unknown' });
      return;
    }
    const payload = {
      from: socket.id,
      message,
      ts: Date.now(),
    };
    io.to(roomId).emit('room:chat', payload);
    cb?.({ ok: true, roomId });
  });
}
