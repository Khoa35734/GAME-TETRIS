import { Socket, Server } from 'socket.io';
import matchmakingSystem from '../managers/matchmakingSystem';
import { accountToSocket } from '../core/state';

export function setupRankedHandlers(socket: Socket, io: Server) {
  // Vào hàng đợi ranked
  socket.on('ranked:enter', async (data: { accountId: string; username: string; elo: number }) => {
    const { accountId, username, elo } = data;
    console.log(`[Ranked] ${username} (${accountId}) entering queue with ELO ${elo}`);
    
    accountToSocket.set(accountId, socket.id);
    await matchmakingSystem.addPlayer(accountId, elo, username);
    
    socket.emit('ranked:queued');
  });

  // Rời hàng đợi ranked
  socket.on('ranked:leave', async (data: { accountId: string }) => {
    const { accountId } = data;
    console.log(`[Ranked] ${accountId} leaving queue`);
    
    await matchmakingSystem.removePlayer(accountId);
    socket.emit('ranked:left');
  });

  // Xác nhận match (client callback)
  socket.on('ranked:match', async (matchId: string, callback?: (ack: any) => void) => {
    console.log(`[Ranked] Player ${socket.id} confirmed match ${matchId}`);
    
    if (callback) {
      callback({ success: true, matchId });
    }
  });
}