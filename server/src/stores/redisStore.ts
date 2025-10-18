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
const SOCKET_USER_PREFIX = 'socket:user:'; // socket:user:{socketId} -> accountId
const USER_SOCKET_PREFIX = 'user:socket:'; // user:socket:{accountId} -> socketId
const USER_DATA_PREFIX = 'user:data:'; // user:data:{accountId} -> {username, ...}

// Room hash fields we store
// id, host, started (0/1), seed, players (JSON)
export async function saveRoom(room: any) {
  const key = ROOM_HASH_PREFIX + room.id;
  await redis.hSet(key, {
    id: room.id,
    host: room.host,
    started: room.started ? '1' : '0',
    seed: String(room.seed ?? 0),
    maxPlayers: String(room.maxPlayers ?? 2),
  players: JSON.stringify([...room.players.values()].map((p: any) => ({ id: p.id, ready: p.ready, alive: p.alive, combo: p.combo, b2b: p.b2b, name: p.name })) ),
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
      maxPlayers: Number(data.maxPlayers) || 2,
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
export async function addToRankedQueue(playerId: string | number, elo: number) {
  // Convert playerId to string to ensure Redis compatibility
  const playerIdStr = String(playerId);
  await redis.zAdd(RANKED_QUEUE_KEY, [{ score: elo, value: playerIdStr }]);
}

export async function removeFromRankedQueue(playerId: string | number) {
  // Convert playerId to string to ensure Redis compatibility
  const playerIdStr = String(playerId);
  await redis.zRem(RANKED_QUEUE_KEY, playerIdStr);
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

// =====================================================
// User Authentication with Redis
// =====================================================

/**
 * Store socket -> user mapping in Redis
 * When a socket authenticates, save accountId and username
 */
export async function storeSocketUser(socketId: string, accountId: number, username: string) {
  const pipeline = redis.multi();
  
  // socket:user:{socketId} -> accountId
  pipeline.set(`${SOCKET_USER_PREFIX}${socketId}`, String(accountId), { EX: 3600 }); // 1 hour TTL
  
  // user:socket:{accountId} -> socketId (for reverse lookup)
  pipeline.set(`${USER_SOCKET_PREFIX}${accountId}`, socketId, { EX: 3600 });
  
  // user:data:{accountId} -> {username, lastActive}
  pipeline.hSet(`${USER_DATA_PREFIX}${accountId}`, {
    username,
    lastActive: Date.now().toString(),
  });
  pipeline.expire(`${USER_DATA_PREFIX}${accountId}`, 86400); // 24 hours
  
  await pipeline.exec();
  console.log(`[Redis] Stored user auth: socket=${socketId}, accountId=${accountId}, username=${username}`);
}

/**
 * Get accountId from socketId
 */
export async function getSocketUser(socketId: string): Promise<number | null> {
  const accountIdStr = await redis.get(`${SOCKET_USER_PREFIX}${socketId}`);
  return accountIdStr ? Number(accountIdStr) : null;
}

/**
 * Get user data (username, etc.) from accountId
 */
export async function getUserData(accountId: number): Promise<{ username: string; lastActive: string } | null> {
  const data = await redis.hGetAll(`${USER_DATA_PREFIX}${accountId}`);
  if (!data || !data.username) return null;
  return {
    username: data.username,
    lastActive: data.lastActive,
  };
}

/**
 * Get socketId from accountId (reverse lookup)
 */
export async function getUserSocket(accountId: number): Promise<string | null> {
  return await redis.get(`${USER_SOCKET_PREFIX}${accountId}`);
}

/**
 * Remove socket authentication from Redis (on disconnect)
 */
export async function removeSocketUser(socketId: string) {
  const accountId = await getSocketUser(socketId);
  if (!accountId) return;
  
  const pipeline = redis.multi();
  pipeline.del(`${SOCKET_USER_PREFIX}${socketId}`);
  pipeline.del(`${USER_SOCKET_PREFIX}${accountId}`);
  // Keep user:data for 24h even after disconnect
  
  await pipeline.exec();
  console.log(`[Redis] Removed socket auth: socket=${socketId}, accountId=${accountId}`);
}

/**
 * Get full user info from socketId (for matchmaking)
 */
export async function getSocketUserInfo(socketId: string): Promise<{ accountId: number; username: string } | null> {
  const accountId = await getSocketUser(socketId);
  if (!accountId) return null;
  
  const userData = await getUserData(accountId);
  if (!userData) return null;
  
  return {
    accountId,
    username: userData.username,
  };
}
