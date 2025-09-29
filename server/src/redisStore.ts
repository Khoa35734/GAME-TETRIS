import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = createClient({ url: REDIS_URL });

redis.on('error', (err: any) => console.error('[redis] error', err));

export async function initRedis() {
  if (!redis.isOpen) await redis.connect();
  console.log('[redis] connected');
}

// Keys
const ROOM_HASH_PREFIX = 'room:'; // room:{id}
const RANKED_QUEUE_KEY = 'ranked:queue'; // sorted set elo score

// Room hash fields we store
// id, host, started (0/1), seed, players (JSON)
export async function saveRoom(room: any) {
  const key = ROOM_HASH_PREFIX + room.id;
  await redis.hSet(key, {
    id: room.id,
    host: room.host,
    started: room.started ? '1' : '0',
    seed: String(room.seed ?? 0),
    players: JSON.stringify([...room.players.values()].map((p: any) => ({ id: p.id, ready: p.ready, alive: p.alive, combo: p.combo, b2b: p.b2b })) ),
    updatedAt: Date.now().toString()
  });
  // Optional TTL to auto-expire inactive rooms (e.g., 1 hour)
  await redis.expire(key, 3600);
}

export async function loadRoom(id: string) {
  const key = ROOM_HASH_PREFIX + id;
  const data = await redis.hGetAll(key);
  if (!data || !data.id) return null;
  try {
    const playersArr = JSON.parse(data.players || '[]');
    return {
      id: data.id,
      host: data.host,
      started: data.started === '1',
      seed: Number(data.seed) || Date.now(),
      playersArr,
      updatedAt: Number(data.updatedAt)
    };
  } catch {
    return null;
  }
}

export async function deleteRoom(id: string) {
  await redis.del(ROOM_HASH_PREFIX + id);
}

// Ranked queue operations
export async function addToRankedQueue(playerId: string, elo: number) {
  await redis.zAdd(RANKED_QUEUE_KEY, [{ score: elo, value: playerId }]);
}

export async function removeFromRankedQueue(playerId: string) {
  await redis.zRem(RANKED_QUEUE_KEY, playerId);
}

export async function popBestMatch(targetElo: number, range = 100, exclude?: string) {
  // Fetch up to 20 candidates around targetElo
  const candidates = await redis.zRangeByScore(RANKED_QUEUE_KEY, targetElo - range, targetElo + range, { LIMIT: { offset: 0, count: 20 } });
  if (!candidates.length) return null;
  // Filter out the excluded id (usually the requester)
  const filtered: string[] = exclude ? candidates.filter((c: string) => c !== exclude) : candidates;
  if (!filtered.length) return null;
  // Pick the closest by absolute elo diff
  let bestId: string | null = null;
  let bestDiff = Number.MAX_SAFE_INTEGER;
  for (const pid of filtered) {
    const score = await redis.zScore(RANKED_QUEUE_KEY, pid);
    if (score === null) continue;
    const diff = Math.abs(score - targetElo);
    if (diff < bestDiff) { bestDiff = diff; bestId = pid; }
  }
  if (!bestId) return null;
  const opponentScore = await redis.zScore(RANKED_QUEUE_KEY, bestId); // capture before removal
  await redis.zRem(RANKED_QUEUE_KEY, bestId);
  return { playerId: bestId, elo: opponentScore ?? targetElo };
}

export async function rankedQueueSize() {
  return await redis.zCard(RANKED_QUEUE_KEY);
}
