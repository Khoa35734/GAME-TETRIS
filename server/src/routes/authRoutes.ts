// Auth routes – issues JWT access/refresh tokens and manages refresh rotation.

import { Router } from 'express';
import bcrypt from 'bcrypt';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../stores/postgres';
import {
  blacklistRefreshToken,
  deleteRefreshToken,
  isRefreshTokenBlacklisted,
  isRefreshTokenValid,
  saveRefreshToken,
} from '../stores/redisStore';
import verifyJWT from '../middleware/verifyJWT';
import {
  createAccessToken,
  createRefreshToken,
  getRefreshTokenTtl,
  verifyRefreshToken,
} from '../utils/jwt';

const router = Router();

const REFRESH_COOKIE_NAME = 'tetris_refresh_token';
const isProduction = process.env.NODE_ENV === 'production';
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

const cookieOptions = (maxAgeSeconds: number) => {
  const sameSite: 'lax' | 'none' = isProduction ? 'none' : 'lax';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    maxAge: maxAgeSeconds * 1000,
    path: '/',
  };
};

const clearRefreshCookie = (res: any) => {
  const sameSite: 'lax' | 'none' = isProduction ? 'none' : 'lax';
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    path: '/',
  });
};

const findUserByEmail = async (email: string) => {
  const users = await sequelize.query(
    'SELECT user_id, user_name, email, password, role FROM users WHERE email = :email',
    {
      replacements: { email },
      type: QueryTypes.SELECT,
    },
  );
  return (users[0] as any) ?? null;
};

const mapUserPayload = (record: any) => ({
  accountId: Number(record.user_id),
  username: record.user_name as string,
  email: record.email as string,
  role: (record.role as string) ?? 'player',
});

const emailExists = async (email: string) => {
  const rows = await sequelize.query('SELECT 1 FROM users WHERE email = :email LIMIT 1', {
    replacements: { email },
    type: QueryTypes.SELECT,
  });
  return rows.length > 0;
};

const usernameExists = async (username: string) => {
  const rows = await sequelize.query('SELECT 1 FROM users WHERE user_name = :username LIMIT 1', {
    replacements: { username },
    type: QueryTypes.SELECT,
  });
  return rows.length > 0;
};

const nextUserId = async () => {
  const result = await sequelize.query(
    'SELECT COALESCE(GREATEST(MAX(user_id), 10000000), 10000000) + 1 as next_id FROM users',
    { type: QueryTypes.SELECT },
  );
  return Number((result[0] as any).next_id);
};

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body ?? {};

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ success: false, message: 'Thiếu thông tin bắt buộc (username, email, password).' });
  }

  try {
    if (await emailExists(email)) {
      return res.status(400).json({ success: false, message: 'Email đã được đăng ký.' });
    }

    if (await usernameExists(username)) {
      return res.status(400).json({ success: false, message: 'Username đã được sử dụng.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = await nextUserId();

    const result = (await sequelize.query(
      `INSERT INTO users (user_id, user_name, email, password, created_at, updated_at, is_active, is_banned, is_verified, role)
       VALUES (:userId, :username, :email, :password, NOW(), NOW(), true, false, false, 'player')
       RETURNING user_id, user_name, email, role`,
      {
        replacements: { userId, username, email, password: hashedPassword },
        type: QueryTypes.INSERT,
      },
    )) as unknown as any[];

    const newUser = result[0]?.[0];

    if (!newUser) {
      return res.status(500).json({ success: false, message: 'Không thể tạo tài khoản.' });
    }

    const payload = mapUserPayload(newUser);

    const access = createAccessToken({
      accountId: payload.accountId,
      username: payload.username,
      role: payload.role,
    });

    const refresh = createRefreshToken({
      accountId: payload.accountId,
      username: payload.username,
      role: payload.role,
    });

    await saveRefreshToken(refresh.tokenId, payload.accountId, refresh.expiresIn);
    res.cookie(REFRESH_COOKIE_NAME, refresh.token, cookieOptions(refresh.expiresIn));

    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công!',
      accessToken: access.token,
      expiresIn: access.expiresIn,
      user: payload,
    });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi đăng ký.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin đăng nhập (email, password).' });
  }

  try {
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Email không tồn tại.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Sai mật khẩu.' });
    }

    const payload = mapUserPayload(user);
    const access = createAccessToken({
      accountId: payload.accountId,
      username: payload.username,
      role: payload.role,
    });

    const refresh = createRefreshToken({
      accountId: payload.accountId,
      username: payload.username,
      role: payload.role,
    });

    await saveRefreshToken(refresh.tokenId, payload.accountId, refresh.expiresIn);

    res.cookie(REFRESH_COOKIE_NAME, refresh.token, cookieOptions(refresh.expiresIn));

    return res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      accessToken: access.token,
      expiresIn: access.expiresIn,
      user: payload,
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi đăng nhập.' });
  }
});

router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token không tồn tại.' });
  }

  try {
    const claims = verifyRefreshToken(refreshToken);

    if (claims.type !== 'refresh') {
      return res.status(401).json({ success: false, message: 'Token không hợp lệ.' });
    }

    if (await isRefreshTokenBlacklisted(claims.tokenId)) {
      return res.status(401).json({ success: false, message: 'Refresh token đã bị thu hồi.' });
    }

    const isValid = await isRefreshTokenValid(claims.tokenId, claims.accountId);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Refresh token không còn hợp lệ.' });
    }

    await deleteRefreshToken(claims.tokenId);

    const payload = {
      accountId: claims.accountId,
      username: claims.username,
      role: claims.role,
    };

    const access = createAccessToken(payload);
    const refresh = createRefreshToken(payload);

    await saveRefreshToken(refresh.tokenId, payload.accountId, refresh.expiresIn);

    res.cookie(REFRESH_COOKIE_NAME, refresh.token, cookieOptions(refresh.expiresIn));

    return res.json({
      success: true,
      accessToken: access.token,
      expiresIn: access.expiresIn,
      user: payload,
    });
  } catch (error) {
    console.error('[Auth] Refresh error:', error);
    clearRefreshCookie(res);
    return res.status(401).json({ success: false, message: 'Refresh token không hợp lệ.' });
  }
});

router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!refreshToken) {
    clearRefreshCookie(res);
    return res.json({ success: true, message: 'Đã đăng xuất.' });
  }

  try {
    const claims = verifyRefreshToken(refreshToken);
    const expSeconds = claims.exp ?? 0;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const remainingSeconds =
      expSeconds > 0 ? Math.max(0, expSeconds - nowSeconds) : getRefreshTokenTtl();

    await deleteRefreshToken(claims.tokenId);
    await blacklistRefreshToken(claims.tokenId, remainingSeconds || getRefreshTokenTtl());
  } catch (error) {
    console.warn('[Auth] Failed to revoke refresh token:', error);
  }

  clearRefreshCookie(res);
  return res.json({ success: true, message: 'Đã đăng xuất.' });
});

router.get('/me', verifyJWT, async (req, res) => {
  if (!req.auth) {
    return res.status(401).json({ success: false, message: 'Chưa đăng nhập.' });
  }

  try {
    const [user] = await sequelize.query(
      'SELECT email FROM users WHERE user_id = :userId LIMIT 1',
      {
        replacements: { userId: req.auth.accountId },
        type: QueryTypes.SELECT,
      },
    );

    return res.json({
      success: true,
      user: {
        accountId: req.auth.accountId,
        username: req.auth.username,
        role: req.auth.role,
        email: (user as any)?.email ?? null,
      },
    });
  } catch (error) {
    console.error('[Auth] Failed to fetch profile info:', error);
    return res.status(500).json({ success: false, message: 'Không thể lấy thông tin người dùng.' });
  }
});

export default router;
