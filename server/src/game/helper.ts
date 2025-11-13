// Sửa trong file: game/helper.ts

import { MatchData, PlayerMatchState } from '../managers/matchManager';

// Kiểu dữ liệu mà RoomLobby.tsx mong đợi
type ClientPlayerState = {
  id: string;       
  name?: string;
  ready: boolean;
  alive: boolean;
  accountId?: string;
  ping?: number | null; // RoomLobby.tsx cũng dùng ping
};

// Kiểu dữ liệu snapshot mà RoomLobby.tsx mong đợi
type RoomSnapshot = {
  matchId: string;
  roomId?: string;
  host: string;   // RoomLobby.tsx tìm trường tên 'host'
  status: string;
  mode: string;
  maxPlayers: number;
  players: ClientPlayerState[];
};

/**
 * Ánh xạ (map) dữ liệu MatchData (server) sang RoomSnapshot (client).
 */
export const matchToRoomSnapshot = (match: MatchData): RoomSnapshot | null => {
  if (!match) return null;

  // ===== 🌟 PHẦN SỬA LỖI QUAN TRỌNG =====
  
  // 1. Ánh xạ TẤT CẢ players (KHÔNG LỌC)
  //    -> Việc này sửa lỗi "0/2"
  const clientPlayers = match.players.map((player: PlayerMatchState) => ({
    
    // 2. Ánh xạ 'playerId' (server) -> 'id' (client)
    //    -> Việc này sửa lỗi hiển thị danh sách
    id: player.playerId, 
    
    // 3. Giữ các trường khác mà RoomLobby.tsx cần
    name: player.name,
    ready: player.ready,
    alive: (player as any).alive ?? true, // Thêm 'alive'
    accountId: player.accountId,
    ping: (player as any).ping ?? null, // Thêm 'ping'
  }));

  return {
    matchId: match.matchId,
    roomId: match.roomId,
    
    // 4. Ánh xạ 'hostPlayerId' (server) -> 'host' (client)
    //    -> Việc này sửa lỗi nhận diện Host
    host: match.hostPlayerId, 
    
    status: match.status,
    mode: match.mode,
    maxPlayers: match.maxPlayers,
    
    // 5. Trả về danh sách đầy đủ
    players: clientPlayers,
  };
};

// Hàm này cũng nên được export
export const findPlayerInMatch = (match: MatchData, playerId: string) => {
    if (!match) return null;
    // Tìm bằng 'playerId' (được dùng trong server)
    return match.players.find(p => p.playerId === playerId || p.accountId === playerId);
};