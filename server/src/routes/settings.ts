import express, { Request, Response } from 'express';
import UserSettings from '../models/UserSettings';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || '123456'; // ⚠️ Phải giống auth.ts!

// Middleware to verify JWT token
interface AuthRequest extends Request {
  userId?: number;
}

const authenticateToken = (req: AuthRequest, res: Response, next: Function) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token không được cung cấp' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token không hợp lệ' });
    }
    req.userId = decoded.accountId || decoded.user_id;
    next();
  });
};

// Default key bindings
const DEFAULT_KEY_BINDINGS = {
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  softDrop: 'ArrowDown',
  hardDrop: 'Space',
  rotateClockwise: 'ArrowUp',
  rotateCounterClockwise: 'z',
  rotate180: 'a',
  hold: 'c',
  restart: 'r',
};

// GET /api/settings - Get user settings
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let settings = await UserSettings.findOne({ where: { user_id: userId } });

    // If no settings exist, create default settings
    if (!settings) {
      settings = await UserSettings.create({
        user_id: userId,
        das_delay_ms: 133,
        arr_ms: 10,
        soft_drop_rate: 50,
        show_next_pieces: 5,
        sound_enabled: true,
        music_enabled: true,
        sound_volume: 0.70,
        music_volume: 0.50,
        key_bindings: DEFAULT_KEY_BINDINGS,
        theme_preference: 'default',
        language_pref: 'vi',
      });
    }

    return res.json({
      success: true,
      settings: {
        das_delay_ms: settings.das_delay_ms,
        arr_ms: settings.arr_ms,
        soft_drop_rate: settings.soft_drop_rate,
        show_next_pieces: settings.show_next_pieces,
        sound_enabled: settings.sound_enabled,
        music_enabled: settings.music_enabled,
        sound_volume: settings.sound_volume,
        music_volume: settings.music_volume,
        key_bindings: settings.key_bindings || DEFAULT_KEY_BINDINGS,
        theme_preference: settings.theme_preference,
        language_pref: settings.language_pref,
      },
    });
  } catch (error) {
    console.error('[settings] GET error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// PUT /api/settings - Update user settings
router.put('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      das_delay_ms,
      arr_ms,
      soft_drop_rate,
      show_next_pieces,
      sound_enabled,
      music_enabled,
      sound_volume,
      music_volume,
      key_bindings,
      theme_preference,
      language_pref,
    } = req.body;

    // Validate key_bindings if provided
    if (key_bindings) {
      const requiredKeys = [
        'moveLeft',
        'moveRight',
        'softDrop',
        'hardDrop',
        'rotateClockwise',
        'rotateCounterClockwise',
        'rotate180',
        'hold',
        'restart',
      ];
      
      for (const key of requiredKeys) {
        if (!key_bindings[key]) {
          return res.status(400).json({
            success: false,
            message: `Key binding thiếu: ${key}`,
          });
        }
      }
    }

    // Validate volumes
    if (sound_volume !== undefined && (sound_volume < 0 || sound_volume > 1)) {
      return res.status(400).json({ success: false, message: 'sound_volume phải từ 0 đến 1' });
    }
    if (music_volume !== undefined && (music_volume < 0 || music_volume > 1)) {
      return res.status(400).json({ success: false, message: 'music_volume phải từ 0 đến 1' });
    }

    // Update or create settings
    const [settings, created] = await UserSettings.upsert({
      user_id: userId,
      das_delay_ms,
      arr_ms,
      soft_drop_rate,
      show_next_pieces,
      sound_enabled,
      music_enabled,
      sound_volume,
      music_volume,
      key_bindings: key_bindings || DEFAULT_KEY_BINDINGS,
      theme_preference,
      language_pref,
    });

    return res.json({
      success: true,
      message: created ? 'Cài đặt đã được tạo' : 'Cài đặt đã được cập nhật',
      settings,
    });
  } catch (error) {
    console.error('[settings] PUT error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật cài đặt' });
  }
});

// PATCH /api/settings/keys - Update only key bindings
router.patch('/keys', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { key_bindings } = req.body;

    if (!key_bindings || typeof key_bindings !== 'object') {
      return res.status(400).json({ success: false, message: 'key_bindings không hợp lệ' });
    }

    // Validate required keys
    const requiredKeys = [
      'moveLeft',
      'moveRight',
      'softDrop',
      'hardDrop',
      'rotateClockwise',
      'rotateCounterClockwise',
      'rotate180',
      'hold',
      'restart',
    ];
    
    for (const key of requiredKeys) {
      if (!key_bindings[key]) {
        return res.status(400).json({
          success: false,
          message: `Key binding thiếu: ${key}`,
        });
      }
    }

    // Check for duplicate key assignments
    const keyValues = Object.values(key_bindings);
    const uniqueKeys = new Set(keyValues);
    if (keyValues.length !== uniqueKeys.size) {
      return res.status(400).json({
        success: false,
        message: 'Không thể gán cùng một phím cho nhiều hành động',
      });
    }

    let settings = await UserSettings.findOne({ where: { user_id: userId } });

    if (!settings) {
      // Create new settings with default values and custom key bindings
      settings = await UserSettings.create({
        user_id: userId,
        key_bindings,
      });
    } else {
      // Update only key_bindings
      settings.key_bindings = key_bindings;
      await settings.save();
    }

    return res.json({
      success: true,
      message: 'Key bindings đã được cập nhật',
      key_bindings: settings.key_bindings,
    });
  } catch (error) {
    console.error('[settings] PATCH /keys error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật key bindings' });
  }
});

// POST /api/settings/reset - Reset to default settings
router.post('/reset', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const settings = await UserSettings.upsert({
      user_id: userId,
      das_delay_ms: 133,
      arr_ms: 10,
      soft_drop_rate: 50,
      show_next_pieces: 5,
      sound_enabled: true,
      music_enabled: true,
      sound_volume: 0.70,
      music_volume: 0.50,
      key_bindings: DEFAULT_KEY_BINDINGS,
      theme_preference: 'default',
      language_pref: 'vi',
    });

    return res.json({
      success: true,
      message: 'Đã reset về cài đặt mặc định',
      settings: settings[0],
    });
  } catch (error) {
    console.error('[settings] POST /reset error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi reset cài đặt' });
  }
});

export default router;
