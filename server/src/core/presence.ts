import { onlineUsers, userPresence } from './state';

export function isUserOnline(userId: number): boolean {
  return onlineUsers.has(userId);
}

export function getUserPresence(userId: number | string) {
  const id = Number(userId); // 🔥 ép kiểu 1 lần duy nhất

  return (
    userPresence.get(id) ||
    {
      status: onlineUsers.has(id) ? 'online' : 'offline',
      mode: undefined,
      since: Date.now(),
    }
  );
}
