import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sequelize } from '../postgres';
import { QueryTypes } from 'sequelize';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || '123456'; // ⚠️ Nên đưa vào .env thật nhé!
const SALT_ROUNDS = 10;

// ===== Đăng ký =====
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ 
      success: false,
      message: 'Thiếu thông tin bắt buộc (username, email, password).' 
    });
  }

  try {
    // Kiểm tra email đã tồn tại chưa
    const existingUsers = await sequelize.query(
      'SELECT user_id FROM users WHERE email = :email',
      { 
        replacements: { email }, 
        type: QueryTypes.SELECT 
      }
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Email đã được đăng ký.' 
      });
    }

    // Kiểm tra username đã tồn tại chưa
    const existingUsername = await sequelize.query(
      'SELECT user_id FROM users WHERE user_name = :username',
      { 
        replacements: { username }, 
        type: QueryTypes.SELECT 
      }
    );

    if (existingUsername.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Username đã được sử dụng.' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Get max user_id and increment (workaround for sequence permission issue)
    const maxIdResult = await sequelize.query(
      'SELECT COALESCE(MAX(user_id), 0) + 1 as next_id FROM users',
      { type: QueryTypes.SELECT }
    );
    const nextId = (maxIdResult[0] as any).next_id;
    
    // Tạo người dùng mới - INSERT với explicit ID
    const result: any = await sequelize.query(
      `INSERT INTO users (user_id, user_name, email, password, created_at, updated_at, is_active, is_banned, is_verified, role)
       VALUES (:userId, :username, :email, :password, NOW(), NOW(), true, false, false, 'player')
       RETURNING user_id, user_name, email, created_at`,
      { 
        replacements: { userId: nextId, username, email, password: hashedPassword }, 
        type: QueryTypes.INSERT 
      }
    );

    const newUser = result[0][0];

    if (!newUser) {
      throw new Error('Failed to create user');
    }

    // Tạo JWT token
    const token = jwt.sign(
      { 
        accountId: newUser.user_id, 
        email: newUser.email,
        username: newUser.user_name,
        role: 'player'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công!',
      token,
      user: {
        accountId: newUser.user_id,
        username: newUser.user_name,
        email: newUser.email,
        role: 'player'
      }
    });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    // Log chi tiết lỗi để debug
    if (err instanceof Error) {
      console.error('[Auth] Error message:', err.message);
      console.error('[Auth] Error stack:', err.stack);
    }
    res.status(500).json({ 
      success: false,
      message: 'Lỗi server khi đăng ký.',
      error: process.env.NODE_ENV === 'development' ? (err instanceof Error ? err.message : String(err)) : undefined
    });
  }
});

// ===== Đăng nhập =====
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      message: 'Thiếu thông tin đăng nhập (email, password).' 
    });
  }

  try {
    const users = await sequelize.query(
      'SELECT user_id, user_name, email, password, role FROM users WHERE email = :email',
      { 
        replacements: { email }, 
        type: QueryTypes.SELECT 
      }
    );

    const user = users[0] as any;

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Email không tồn tại.' 
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ 
        success: false,
        message: 'Sai mật khẩu.' 
      });
    }

    // Update last_login
    await sequelize.query(
      'UPDATE users SET last_login = NOW() WHERE user_id = :userId',
      {
        replacements: { userId: user.user_id },
        type: QueryTypes.UPDATE
      }
    );

    // Tạo JWT token
    const token = jwt.sign(
      { 
        accountId: user.user_id, 
        email: user.email,
        username: user.user_name,
        role: user.role || 'player'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      user: {
        accountId: user.user_id,
        username: user.user_name,
        email: user.email,
        role: user.role || 'player'
      }
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi server khi đăng nhập.' 
    });
  }
});

// ===== Verify token (optional - for checking if user is logged in) =====
router.get('/verify', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false,
      message: 'Token không hợp lệ.' 
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Fetch user from database to ensure they still exist
    const users = await sequelize.query(
      'SELECT user_id, user_name, email FROM users WHERE user_id = :accountId',
      { 
        replacements: { accountId: decoded.accountId }, 
        type: QueryTypes.SELECT 
      }
    );

    const user = users[0] as any;

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Người dùng không tồn tại.' 
      });
    }

    res.json({
      success: true,
      user: {
        accountId: user.user_id,
        username: user.user_name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('[Auth] Verify error:', err);
    res.status(401).json({ 
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn.' 
    });
  }
});

export default router;

