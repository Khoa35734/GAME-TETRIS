import express from 'express';
import cors from 'cors';
import { mountApiRoutes } from './routes';
import { mountExtraEndpoints } from './routes/extraEndpoints';
import { mountTestPages } from './routes/testPages';
import { rankedQueueSize } from './stores/redisStore';

const app = express();

// ============================
// 🔧 CORS CONFIGURATION
// ============================

// Danh sách các origin được phép kết nối tới API
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://10.142.21.19:5173',
  'http://192.168.1.29:5173', // ⚡ thêm IP LAN của bạn
];

// Cấu hình middleware CORS chi tiết
app.use(cors({
  origin: function (origin, callback) {
    // Cho phép Postman, server-to-server (không có origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('[CORS] Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // ⚠️ Cho phép gửi cookie (refresh token)
}));

// ============================
// Middleware khác
// ============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================
// Mount các route API
// ============================
mountApiRoutes(app);
mountExtraEndpoints(app);
mountTestPages(app);

// ============================
// Health Check Endpoint
// ============================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================
// Matchmaking Stats (Redis)
// ============================
app.get('/api/matchmaking/stats', async (req, res) => {
  try {
    const queueSize = await rankedQueueSize();
    res.json({ queueSize });
  } catch (error) {
    console.error('Error getting matchmaking stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default app;
