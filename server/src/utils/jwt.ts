// JWT helper utilities for issuing and validating access/refresh tokens.
// Supports HS256 (default) and RS256 (via env JWT_ALGORITHM=RS256).

import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { randomUUID } from 'crypto';

export type JwtAlgorithm = 'HS256' | 'RS256';

export interface JwtUserClaims {
  accountId: number;
  username: string;
  role: string;
  tokenId: string;
  type: 'access' | 'refresh';
}

export interface TokenResult {
  token: string;
  expiresIn: number;
  tokenId: string;
}

const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.JWT_ACCESS_TTL ?? 60 * 15); // 15 minutes default
const REFRESH_TOKEN_TTL_SECONDS = Number(process.env.JWT_REFRESH_TTL ?? 60 * 60 * 24 * 7); // 7 days default

const algorithm: JwtAlgorithm =
  process.env.JWT_ALGORITHM === 'RS256' ? 'RS256' : 'HS256';

const formatKey = (value?: string) => value?.replace(/\\n/g, '\n') ?? '';

const accessSigningKey =
  algorithm === 'RS256'
    ? formatKey(process.env.JWT_PRIVATE_KEY)
    : formatKey(process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'dev-access-secret');

const accessVerificationKey =
  algorithm === 'RS256'
    ? formatKey(process.env.JWT_PUBLIC_KEY ?? process.env.JWT_PRIVATE_KEY)
    : accessSigningKey;

const refreshSigningKey =
  algorithm === 'RS256'
    ? formatKey(process.env.JWT_REFRESH_PRIVATE_KEY ?? process.env.JWT_PRIVATE_KEY)
    : formatKey(process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'dev-refresh-secret');

const refreshVerificationKey =
  algorithm === 'RS256'
    ? formatKey(process.env.JWT_REFRESH_PUBLIC_KEY ?? process.env.JWT_PUBLIC_KEY ?? process.env.JWT_REFRESH_PRIVATE_KEY)
    : refreshSigningKey;

const baseSignOptions: SignOptions = {
  algorithm,
  issuer: process.env.JWT_ISSUER ?? 'tetris-auth',
};

const ensureKey = (key: string, purpose: string) => {
  if (!key) {
    throw new Error(`[JWT] Missing key material for ${purpose}. Check your environment configuration.`);
  }
};

export const getAccessTokenTtl = () => ACCESS_TOKEN_TTL_SECONDS;
export const getRefreshTokenTtl = () => REFRESH_TOKEN_TTL_SECONDS;
export const getJwtAlgorithm = () => algorithm;

export const createAccessToken = (claims: {
  accountId: number;
  username: string;
  role: string;
}): TokenResult => {
  ensureKey(accessSigningKey, 'access token signing');
  const tokenId = randomUUID();
  const payload: JwtUserClaims = {
    accountId: claims.accountId,
    username: claims.username,
    role: claims.role,
    tokenId,
    type: 'access',
  };

  const token = jwt.sign(payload, accessSigningKey, {
    ...baseSignOptions,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    subject: String(claims.accountId),
  });

  return { token, expiresIn: ACCESS_TOKEN_TTL_SECONDS, tokenId };
};

export const createRefreshToken = (claims: {
  accountId: number;
  username: string;
  role: string;
}): TokenResult => {
  ensureKey(refreshSigningKey, 'refresh token signing');
  const tokenId = randomUUID();
  const payload: JwtUserClaims = {
    accountId: claims.accountId,
    username: claims.username,
    role: claims.role,
    tokenId,
    type: 'refresh',
  };

  const token = jwt.sign(payload, refreshSigningKey, {
    ...baseSignOptions,
    expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    subject: String(claims.accountId),
  });

  return { token, expiresIn: REFRESH_TOKEN_TTL_SECONDS, tokenId };
};

export const verifyAccessToken = (token: string): JwtUserClaims & JwtPayload => {
  ensureKey(accessVerificationKey, 'access token verification');
  const decoded = jwt.verify(token, accessVerificationKey, {
    algorithms: [algorithm],
    issuer: baseSignOptions.issuer,
  });

  return decoded as JwtUserClaims & JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtUserClaims & JwtPayload => {
  ensureKey(refreshVerificationKey, 'refresh token verification');
  const decoded = jwt.verify(token, refreshVerificationKey, {
    algorithms: [algorithm],
    issuer: baseSignOptions.issuer,
  });

  return decoded as JwtUserClaims & JwtPayload;
};
