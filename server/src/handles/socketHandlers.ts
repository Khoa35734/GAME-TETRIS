import { Server, Socket } from 'socket.io';
import { redis, saveRoom, deleteRoom, addToRankedQueue, removeFromRankedQueue, popBestMatch, storeSocketUser, removeSocketUser } from '../stores/redisStore';
import { matchManager, MatchData, PlayerMatchState } from '../managers/matchManager';
import MatchmakingSystem from '../matchmaking';
import BO3MatchManager from '../managers/bo3MatchManager';
import { bagGenerator, nextPieces, TType } from '../game/pieceGenerator';

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

export function setupSocketHandlers(io: Server) {
  const rooms = new Map<string, Room>();
  const accountToSocket = new Map<string, string>();
  const ipToSockets = new Map<string, Set<string>>();
  const matchGenerators = new Map<string, Generator<TType, any, any>>();
  const playerPings = new Map<string, { ping: number; lastUpdate: number }>();
  const onlineUsers = new Map<number, string>();

  io.on('connection', (socket: Socket) => {
    const rawIp = (socket.handshake.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || socket.handshake.address;
    const ip = normalizeIp(typeof rawIp === 'string' ? rawIp : '');
    if (ip) {
      const set = ipToSockets.get(ip) ?? new Set<string>();
      set.add(socket.id);
      ipToSockets.set(ip, set);
    }

    // Minimal handlers moved here. For brevity, please keep business logic in matchManager/redisStore.
    socket.on('ping', (timestamp?: number) => socket.emit('pong', timestamp));

    socket.on('client:ping', (ping: number) => {
      playerPings.set(socket.id, { ping, lastUpdate: Date.now() });
    });

    socket.on('user:authenticate', async (userId: any) => {
      const accountId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      if (accountId && typeof accountId === 'number' && !isNaN(accountId)) {
        onlineUsers.set(accountId, socket.id);
        const username = `User${accountId}`;
        await storeSocketUser(socket.id, accountId, username);
        (socket as any).accountId = accountId;
        (socket as any).username = username;
        socket.emit('user:authenticated', { accountId, username });
        io.emit('user:online', accountId);
      }
    });

    // Example room:create, room:join retained (others can be migrated similarly as needed)
    socket.on('room:create', async (roomId: string, optsOrCb?: any, cbMaybe?: any) => {
      let options: { maxPlayers?: number; name?: string } | undefined;
      let cb: ((result: { ok: boolean; error?: string; roomId?: string }) => void) | undefined;
      if (typeof optsOrCb === 'function') cb = optsOrCb; else { options = optsOrCb; if (typeof cbMaybe === 'function') cb = cbMaybe; }
      try {
        const existing = await matchManager.getMatch(roomId);
        if (existing) return cb?.({ ok: false, error: 'exists' });
        const maxPlayers = Math.max(2, Math.min(Number(options?.maxPlayers) || 2, 6));
        const displayName = typeof options?.name === 'string' ? options.name : undefined;
        const match = await matchManager.createMatch({ matchId: roomId, hostPlayerId: socket.id, hostSocketId: socket.id, mode: 'custom', maxPlayers, roomId, hostAccountId: displayName });
        await socket.join(roomId);
        cb?.({ ok: true, roomId });
        io.to(roomId).emit('room:update', matchToRoomSnapshot(match));
      } catch {
        cb?.({ ok: false, error: 'unknown' });
      }
    });

    socket.on('disconnect', async () => {
      for (const [userId, sockId] of onlineUsers.entries()) {
        if (sockId === socket.id) {
          onlineUsers.delete(userId);
          io.emit('user:offline', userId);
          break;
        }
      }
      await removeSocketUser(socket.id);
      playerPings.delete(socket.id);
      if (ip) {
        const set = ipToSockets.get(ip);
        if (set) { set.delete(socket.id); if (set.size === 0) ipToSockets.delete(ip); }
      }
    });
  });

  return { rooms, accountToSocket, ipToSockets, matchGenerators, playerPings, onlineUsers };
}
