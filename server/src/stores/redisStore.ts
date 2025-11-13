import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const redis = createClient({ url: REDIS_URL });

redis.on('error', (err: any) => console.error('[redis] error', err));

export async function initRedis() {
  if (!redis.isOpen) await redis.connect();
  console.log('[redis] connected');
}

// =====================================================
// 🔹 Common Key Prefixes
// =====================================================
const ROOM_HASH_PREFIX = 'room:';               // room:{id}
const RANKED_QUEUE_KEY = 'ranked:queue';        // Sorted Set ELO Queue
const SOCKET_USER_PREFIX = 'socket:user:';      // socket:user:{socketId} -> accountId
const USER_SOCKET_PREFIX = 'user:socket:';      // user:socket:{accountId} -> socketId
const USER_DATA_PREFIX = 'user:data:';          // user:data:{accountId} -> {username, lastActive}
const REFRESH_TOKEN_KEY_PREFIX = 'refresh:token:';  // refresh:token:{tokenId} -> accountId
const BLACKLIST_KEY_PREFIX = 'blacklist:token:';    // blacklist:token:{tokenId} -> 1

// =====================================================
// 🔸 Room Operations
// =====================================================
export async function saveRoom(room: any) {
  const key = ROOM_HASH_PREFIX + room.id;
  const playersData = [...room.players.values()].map((p: any) => ({
    id: p.id,
    ready: p.ready,
    alive: p.alive,
    combo: p.combo,
    b2b: p.b2b,
    name: p.name,
  }));

  await redis.hSet(key, {
    id: room.id,
    host: room.host,
    started: room.started ? '1' : '0',
    seed: String(room.seed ?? 0),
    maxPlayers: String(room.maxPlayers ?? 2),
    players: JSON.stringify(playersData),
    updatedAt: Date.now().toString(),
  });

  // TTL 1 giờ
  await redis.expire(key, 3600);
}

export async function loadRoom(id: string) {
  const data = await redis.hGetAll(ROOM_HASH_PREFIX + id);
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
      updatedAt: Number(data.updatedAt),
    };
  } catch {
    return null;
  }
}

export async function deleteRoom(id: string) {
  await redis.del(ROOM_HASH_PREFIX + id);
}

// =====================================================
// 🔸 Ranked Queue Operations
// =====================================================
export async function addToRankedQueue(playerId: string | number, elo: number) {
  const playerIdStr = String(playerId);
  await redis.zAdd(RANKED_QUEUE_KEY, [{ score: elo, value: playerIdStr }]);
}

export async function removeFromRankedQueue(playerId: string | number) {
  const playerIdStr = String(playerId);
  await redis.zRem(RANKED_QUEUE_KEY, playerIdStr);
}

export async function popBestMatch(targetElo: number, range = 100, exclude?: string) {
  const candidates = await redis.zRangeByScore(
    RANKED_QUEUE_KEY,
    targetElo - range,
    targetElo + range,
    { LIMIT: { offset: 0, count: 20 } }
  );

  if (!candidates.length) return null;

  const filtered = exclude ? candidates.filter((c) => c !== exclude) : candidates;
  if (!filtered.length) return null;

  let bestId: string | null = null;
  let bestDiff = Number.MAX_SAFE_INTEGER;

  for (const pid of filtered) {
    const score = await redis.zScore(RANKED_QUEUE_KEY, pid);
    if (score === null) continue;
    const diff = Math.abs(score - targetElo);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestId = pid;
    }
  }

  if (!bestId) return null;
  const opponentScore = await redis.zScore(RANKED_QUEUE_KEY, bestId);
  await redis.zRem(RANKED_QUEUE_KEY, bestId);

  return { playerId: bestId, elo: opponentScore ?? targetElo };
}

export async function rankedQueueSize() {
  return await redis.zCard(RANKED_QUEUE_KEY);
}

// =====================================================
// 🔸 Socket ↔ User Mapping
// =====================================================
export async function storeSocketUser(socketId: string, accountId: number, username: string) {
  const pipeline = redis.multi();

  pipeline.set(`${SOCKET_USER_PREFIX}${socketId}`, String(accountId), { EX: 3600 });
  pipeline.set(`${USER_SOCKET_PREFIX}${accountId}`, socketId, { EX: 3600 });

  pipeline.hSet(`${USER_DATA_PREFIX}${accountId}`, {
    username,
    lastActive: Date.now().toString(),
  });
  pipeline.expire(`${USER_DATA_PREFIX}${accountId}`, 86400);

  await pipeline.exec();
  console.log(`[Redis] Stored user auth: socket=${socketId}, accountId=${accountId}, username=${username}`);
}

export async function getSocketUser(socketId: string): Promise<number | null> {
  const accountIdStr = await redis.get(`${SOCKET_USER_PREFIX}${socketId}`);
  return accountIdStr ? Number(accountIdStr) : null;
}

export async function getUserSocket(accountId: number): Promise<string | null> {
  return await redis.get(`${USER_SOCKET_PREFIX}${accountId}`);
}

export async function getUserData(accountId: number): Promise<{ username: string; lastActive: string } | null> {
  const data = await redis.hGetAll(`${USER_DATA_PREFIX}${accountId}`);
  if (!data || !data.username) return null;
  return { username: data.username, lastActive: data.lastActive };
}

export async function removeSocketUser(socketId: string) {
  const accountId = await getSocketUser(socketId);
  if (!accountId) return;

  const pipeline = redis.multi();
  pipeline.del(`${SOCKET_USER_PREFIX}${socketId}`);
  pipeline.del(`${USER_SOCKET_PREFIX}${accountId}`);
  await pipeline.exec();

  console.log(`[Redis] Removed socket auth: socket=${socketId}, accountId=${accountId}`);
}

export async function getSocketUserInfo(
  socketId: string
): Promise<{ accountId: number; username: string } | null> {
  const accountId = await getSocketUser(socketId);
  if (!accountId) return null;

  const userData = await getUserData(accountId);
  if (!userData) return null;

  return { accountId, username: userData.username };
}

// =====================================================
// 🔸 JWT Refresh Token Management
// =====================================================
/**
 * Lưu refresh token vào Redis
 */
export async function saveRefreshToken(
  tokenId: string,
  accountId: number,
  ttlSeconds = 7 * 24 * 3600
) {
  await redis.set(`${REFRESH_TOKEN_KEY_PREFIX}${tokenId}`, String(accountId), { EX: ttlSeconds });
}

/**
 * Xóa refresh token khi logout hoặc rotate
 */
export async function deleteRefreshToken(tokenId: string) {
  await redis.del(`${REFRESH_TOKEN_KEY_PREFIX}${tokenId}`);
}

/**
 * Kiểm tra refresh token hợp lệ hay không
 */
export async function isRefreshTokenValid(
  tokenId: string,
  accountId: number
): Promise<boolean> {
  const stored = await redis.get(`${REFRESH_TOKEN_KEY_PREFIX}${tokenId}`);
  return stored === String(accountId);
}

/**
 * Thêm refresh token vào danh sách đen (khi logout)
 */
export async function blacklistRefreshToken(
  tokenId: string,
  ttlSeconds = 7 * 24 * 3600
) {
  await redis.set(`${BLACKLIST_KEY_PREFIX}${tokenId}`, '1', { EX: ttlSeconds });
}

/**
 * Kiểm tra refresh token có bị blacklist không
 */
export async function isRefreshTokenBlacklisted(tokenId: string): Promise<boolean> {
  const exists = await redis.exists(`${BLACKLIST_KEY_PREFIX}${tokenId}`);
  return exists === 1;
}
