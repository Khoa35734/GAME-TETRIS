// Socket.IO middleware – validates the access token during handshake.

import type { Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import type { AuthUser } from '../types/auth';

const extractToken = (socket: Socket): string | null => {
  const auth = socket.handshake.auth as Record<string, unknown>;
  if (auth && typeof auth.token === 'string') {
    return auth.token;
  }

  const header = socket.handshake.headers.authorization;
  if (typeof header === 'string') {
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() === 'bearer' && token) {
      return token;
    }
  }

  return null;
};

export const socketAuth = async (socket: Socket, next: (err?: Error) => void) => {
  const token = extractToken(socket);

  if (!token) {
    return next(new Error('Authentication token missing'));
  }

  try {
    const claims = verifyAccessToken(token);
    const authUser: AuthUser = {
      accountId: claims.accountId,
      username: claims.username,
      role: claims.role,
      tokenId: claims.tokenId,
    };

    socket.data.auth = authUser;
    (socket as any).accountId = authUser.accountId;
    (socket as any).username = authUser.username;

    return next();
  } catch (error) {
    console.error('[Socket] Handshake authentication failed:', error);
    return next(new Error('Invalid or expired token'));
  }
};

export default socketAuth;
