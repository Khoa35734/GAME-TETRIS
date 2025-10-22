import type { AuthUser } from './auth';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
      authTokenId?: string;
    }
  }
}

export {};
