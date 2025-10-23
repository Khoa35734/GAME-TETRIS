import { MatchData, PlayerMatchState } from '../managers/matchManager';
import { playerPings } from '../core/state';

export function normalizeIp(ip: string | undefined | null): string {
  if (!ip) return '';
  let v = String(ip).trim();
  if (v.startsWith('::ffff:')) v = v.slice(7);
  if (v === '::1') v = '127.0.0.1';
  return v;
}

export function matchToRoomSnapshot(match: MatchData) {
  return {
    id: match.matchId,
    host: match.hostPlayerId,
    started: match.status === 'in_progress',
    maxPlayers: match.maxPlayers,
    players: match.players.map((p) => {
      const pingData = playerPings.get(p.socketId || p.playerId);
      return {
        id: p.playerId,
        ready: p.ready,
        alive: p.alive,
        name: p.accountId || null,
        combo: p.combo || 0,
        b2b: p.b2b || 0,
        pendingGarbage: p.pendingGarbage || 0,
        ping: pingData?.ping ?? null,
      };
    }),
  };
}

export function findPlayerInMatch(match: MatchData | null, socketId: string): PlayerMatchState | undefined {
  if (!match) return undefined;
  return match.players.find((p) => p.socketId === socketId);
}

export function roomSnapshot(roomId: string, rooms: Map<string, any>) {
  const r = rooms.get(roomId);
  if (!r) return null;
  return {
    id: r.id,
    host: r.host,
    started: r.started,
    maxPlayers: r.maxPlayers,
    players: [...r.players.values()].map((p: any) => {
      const pingData = playerPings.get(p.id);
      return {
        id: p.id,
        ready: p.ready,
        alive: p.alive,
        name: p.name ?? null,
        ping: pingData?.ping ?? null,
      };
    }),
  };
}