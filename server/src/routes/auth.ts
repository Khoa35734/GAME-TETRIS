import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sequelize } from '../postgres'; // 🔹 Dùng sequelize thay vì pool
import { QueryTypes } from 'sequelize'; // ⚠️ Thêm dòng này

const router = express.Router();
const JWT_SECRET = '123456'; // ⚠️ Nên đưa vào .env thật nhé!

// ===== Đăng ký =====
router.post('/register', async (req, res) => {
  const { user_name, email, password } = req.body;
  if (!user_name || !email || !password) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc.' });
  }

  try {
    // Kiểm tra email đã tồn tại chưa
    const [existing]: any = await sequelize.query(
      'SELECT * FROM users WHERE email = :email',
  { replacements: { email }, type: QueryTypes.SELECT }
    );

    if (existing) {
      return res.status(400).json({ message: 'Email đã được đăng ký.' });
    }

    // Tạo người dùng mới
    const hash = await bcrypt.hash(password, 10);
    const [newUser]: any = await sequelize.query(
      `INSERT INTO users (user_name, email, password)
       VALUES (:user_name, :email, :password)
       RETURNING user_id, user_name, email`,
  { replacements: { user_name, email, password: hash }, type: QueryTypes.INSERT }
    );

    res.status(201).json({
      message: 'Đăng ký thành công!',
      user: newUser?.[0] ?? null
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ===== Đăng nhập =====
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Thiếu thông tin đăng nhập.' });
  }

  try {
    const [user]: any = await sequelize.query(
      'SELECT * FROM users WHERE email = :email',
  { replacements: { email }, type: QueryTypes.SELECT }
    );

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Sai mật khẩu.' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: {
        user_id: user.user_id,
        user_name: user.user_name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

export default router;

