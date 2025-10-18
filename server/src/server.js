import express from 'express';
import cors from 'cors';
import { sequelize } from './postgres.js';
import routes from './routes/index.js'; // THÊM DÒNG NÀY

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes - THÊM DÒNG NÀY
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Khởi động server
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server chạy trên port ${PORT}`);
      console.log(`📊 Admin API: http://localhost:${PORT}/api`);
      console.log(`📋 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Lỗi khởi động server:', error);
    process.exit(1);
  }
}

startServer();