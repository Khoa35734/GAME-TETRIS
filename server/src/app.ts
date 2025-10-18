import express from 'express';
import cors from 'cors';
import { mountApiRoutes } from './routes';
import { mountExtraEndpoints } from './routes/extraEndpoints';
import { mountTestPages } from './routes/testPages';
import { rankedQueueSize } from './stores/redisStore';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
mountApiRoutes(app);
mountExtraEndpoints(app);
mountTestPages(app);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Matchmaking stats
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