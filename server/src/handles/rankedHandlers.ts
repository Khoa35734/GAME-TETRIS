import { Socket, Server } from 'socket.io';
import { addToRankedQueue, removeFromRankedQueue } from '../stores/redisStore';
import { accountToSocket } from '../core/state';

export function setupRankedHandlers(socket: Socket, io: Server) {
  socket.on(
    'ranked:enter',
    async (data: { accountId: string; username: string; elo: number }) => {
      const { accountId, username, elo } = data;
      const normalizedAccountId = String(accountId);

      console.log(
        `[Ranked] ${username} (${normalizedAccountId}) entering queue with ELO ${elo}`,
      );

      accountToSocket.set(normalizedAccountId, socket.id);
      await addToRankedQueue(normalizedAccountId, elo);

      socket.emit('ranked:queued');
    },
  );

  socket.on('ranked:leave', async (data: { accountId: string }) => {
    const { accountId } = data;
    const normalizedAccountId = String(accountId);

    console.log(`[Ranked] ${normalizedAccountId} leaving queue`);

    await removeFromRankedQueue(normalizedAccountId);
    accountToSocket.delete(normalizedAccountId);

    socket.emit('ranked:left');
  });

  socket.on('ranked:match', async (matchId: string, callback?: (ack: any) => void) => {
    console.log(`[Ranked] Player ${socket.id} confirmed match ${matchId}`);

    callback?.({ success: true, matchId });
  });
}

