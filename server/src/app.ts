import express from 'express';
import cors from 'cors';
import { mountApiRoutes } from './routes';
import { mountExtraEndpoints } from './routes/extraEndpoints';
import { mountTestPages } from './routes/testPages';
import { rankedQueueSize } from './stores/redisStore';

const app = express();

// ============================
// 🔧 CORS CONFIG (Dynamic Private Network Support)
// ============================

const corsOptions = {
  origin: function (origin: string | undefined, callback: any) {
    // Cho phép Postman, server-to-server, hoặc request nội bộ không có Origin
    if (!origin) return callback(null, true);

    // ✅ Cho phép tất cả IP thuộc mạng nội bộ theo RFC1918 + localhost
    // - 10.0.0.0 – 10.255.255.255
    // - 172.16.0.0 – 172.31.255.255
    // - 192.168.0.0 – 192.168.255.255
    // - localhost, 127.0.0.1
    // Đã SỬA: RegExp này xử lý đúng 10.x.x.x, 172.16-31.x.x, và 192.168.x.x
    const allowedPattern = /^http:\/\/(localhost|127\.0\.0\.1|10(\.\d+){3}|172\.(1[6-9]|2\d|3[0-1])(\.\d+){2}|192\.168(\.\d+){2})(:\d+)?$/;

    if (allowedPattern.test(origin)) {
      console.log('[CORS] ✅ Allowed origin:', origin);
      return callback(null, true);
    }

    console.warn('[CORS] ❌ Blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Cho phép cookie / JWT gửi kèm
};

app.use(cors(corsOptions));

// ============================
// 📦 Middleware khác
// ============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================
// 🧩 Mount các route API
// ============================
mountApiRoutes(app);
mountExtraEndpoints(app);
mountTestPages(app);

// ============================
// ❤️ Health Check Endpoint
// ============================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================
// 🧠 Matchmaking Stats (Redis)
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