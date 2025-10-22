// Express middleware – verifies the Bearer access token on protected routes.

import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import type { AuthUser } from '../types/auth';

const parseAuthorizationHeader = (header?: string | null): string | null => {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token;
};

export const verifyJWT = (req: Request, res: Response, next: NextFunction) => {
  const token = parseAuthorizationHeader(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authorization token missing' });
  }

  try {
    const claims = verifyAccessToken(token);
    const authUser: AuthUser = {
      accountId: claims.accountId,
      username: claims.username,
      role: claims.role,
      tokenId: claims.tokenId,
    };

    req.auth = authUser;
    req.authTokenId = claims.tokenId;
    return next();
  } catch (error) {
    console.error('[Auth] Access token verification failed:', error);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export default verifyJWT;
