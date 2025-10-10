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
      'SELECT account_id FROM account WHERE email = :email',
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
      'SELECT account_id FROM account WHERE username = :username',
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
    
    // Tạo người dùng mới - INSERT và lấy về user vừa tạo
    const result: any = await sequelize.query(
      `INSERT INTO account (username, email, password, created_at)
       VALUES (:username, :email, :password, NOW())
       RETURNING account_id, username, email, created_at`,
      { 
        replacements: { username, email, password: hashedPassword }, 
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
        accountId: newUser.account_id, 
        email: newUser.email,
        username: newUser.username
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công!',
      token,
      user: {
        accountId: newUser.account_id,
        username: newUser.username,
        email: newUser.email
      }
    });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi server khi đăng ký.' 
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
      'SELECT account_id, username, email, password FROM account WHERE email = :email',
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

    // Tạo JWT token
    const token = jwt.sign(
      { 
        accountId: user.account_id, 
        email: user.email,
        username: user.username
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      user: {
        accountId: user.account_id,
        username: user.username,
        email: user.email
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
      'SELECT account_id, username, email FROM account WHERE account_id = :accountId',
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
        accountId: user.account_id,
        username: user.username,
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

