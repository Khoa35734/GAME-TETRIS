import { Server, Socket } from 'socket.io';
import { matchManager } from '../managers/matchManager';
import { matchToRoomSnapshot, findPlayerInMatch } from '../game/helper';
import { RoomAck } from '../core/types';
import { playersReadyForGame, onlineUsers } from '../core/state';
import { bagGenerator, nextPieces, TType } from '../game/pieceGenerator';
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

      // Gửi snapshot ngay trong callback 'create'
      // Lỗi 'data' does not exist đã được sửa trong 'types.ts'
      const snapshot = matchToRoomSnapshot(match);
      cb?.({ ok: true, roomId, data: snapshot });
      
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

     // Code MỚI ĐÃ SỬA
if (!existingPlayer) {
  await matchManager.addPlayer(roomId, {
    playerId: socket.id,
    socketId: socket.id,
    // 'accountId' nên lấy từ socket (sau khi auth)
    accountId: (socket as any).accountId?.toString() || (socket as any).username,
    // 'name' chính là 'displayName' mà client gửi lên
    name: displayName 
  });
  console.log(`[room:join] ✅ ${socket.id} (Name: ${displayName}) joined match ${roomId}`);
}

      await socket.join(roomId);

      // SỬA LỖI (Bỏ Race Condition)
      // 1. Lấy trạng thái MỚI NHẤT của phòng
      const updatedMatch = await matchManager.getMatch(roomId);
      if (updatedMatch) {
        const snapshot = matchToRoomSnapshot(updatedMatch);

        // 2. Gửi snapshot cho người vừa join qua callback
        // Lỗi 'data' does not exist đã được sửa trong 'types.ts'
        cb?.({ ok: true, roomId, data: snapshot });
        
        // 3. Gửi snapshot cho TẤT CẢ NGƯỜI KHÁC trong phòng (trừ người gửi)
        socket.to(roomId).emit('room:update', snapshot);
      } else {
        // Fallback (Sửa lỗi chuỗi tùy chỉnh)
        cb?.({ ok: false, error: 'unknown' });
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
      cb?.({ ok: true, data: snapshot });
      
    } catch (err) {
      console.error('[room:sync] Error:', err);
      // Sửa lỗi chuỗi tùy chỉnh
      cb?.({ ok: false, error: 'unknown' });
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

      // SỬA LỖI (Logic chuyển host)
      // 1. Gọi `removePlayer`. Hàm này đã tự động xử lý việc
      // chuyển host nếu cần.
      const updatedMatch = await matchManager.removePlayer(roomId, player.playerId);
      socket.leave(roomId);
      console.log(
        `[room:leave] ✅ Player ${socket.id.slice(0, 8)} left match ${roomId.slice(0, 8)}`
      );
      
      // 2. `removePlayer` trả về `null` nếu phòng bị xóa (không còn ai)
      if (updatedMatch) {
        // Nếu phòng vẫn còn, gửi cập nhật cho những người còn lại
        const snapshot = matchToRoomSnapshot(updatedMatch);
        io.to(roomId).emit('room:update', snapshot);
      } else {
        // Phòng đã bị xóa
        console.log(`[room:leave] 🗑️ Empty match ${roomId.slice(0, 8)} deleted`);
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
        
        // Sửa logic kiểm tra bạn bè
        const friendInRoom = match.players.some((p) => {
          // Giả sử `p.accountId` lưu trữ `friendId` dạng string
          return p.accountId === friendId.toString();
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
    // Sửa logic chat để dùng 'matchManager'
    matchManager.getMatch(roomId).then(match => {
      if (!match) {
        cb?.({ ok: false, error: 'not-found' });
        return;
      }
      
      const player = findPlayerInMatch(match, socket.id);
      if (!player) {
        cb?.({ ok: false, error: 'unknown' }); // Không có trong phòng
        return;
      }
      
      const payload = {
        from: socket.id,
        message,
        ts: Date.now(),
      };
      io.to(roomId).emit('room:chat', payload);
      cb?.({ ok: true, roomId });
      
    }).catch(() => {
       // Sửa lỗi chuỗi tùy chỉnh
       cb?.({ ok: false, error: 'unknown' });
    });
  });

  // SỬA LỖI (Logic Bắt đầu trận)
 // Dán code này vào file: roomHandlers.ts (thay thế hàm cũ)

// Dán code này vào file: roomHandlers.ts (thay thế hàm cũ)

socket.on('room:startGame', async (roomId: string, cb?: (result: RoomAck) => void) => {
  try {
    const match = await matchManager.getMatch(roomId);
    if (!match) {
      cb?.({ ok: false, error: 'not-found' });
      return;
    }

    if (match.hostPlayerId !== socket.id) {
      cb?.({ ok: false, error: 'not-host' });
      return;
    }

    if (match.status !== 'waiting') {
      cb?.({ ok: false, error: 'already-started' });
      return;
    }

    if (match.players.length < 2) {
      cb?.({ ok: false, error: 'not-enough-players' });
      return;
    }

    const nonHostPlayers = match.players.filter((p) => p.playerId !== match.hostPlayerId);
    const allGuestsReady = nonHostPlayers.length > 0 && nonHostPlayers.every((p) => p.ready);
    if (!allGuestsReady) {
      cb?.({ ok: false, error: 'players-not-ready' });
      return;
    }

    console.log(`[room:startGame] 🚀 Match ${roomId} passed lobby checks. Waiting for in-game readiness...`);

    io.to(roomId).emit('game:starting');
    cb?.({ ok: true });
  } catch (err) {
    console.error('[room:startGame] Error:', err);
    cb?.({ ok: false, error: 'unknown' });
  }
});
}