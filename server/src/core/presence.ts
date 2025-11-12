import { onlineUsers, userPresence } from './state';

export function isUserOnline(userId: number): boolean {
  return onlineUsers.has(userId);
}

export function getUserPresence(userId: number) {
  return (
    userPresence.get(userId) ||
    {
      status: onlineUsers.has(userId) ? 'online' : 'offline',
      mode: undefined,       // ✅ THÊM NÈ
      since: Date.now(),
    }
  );
}