import { Express } from 'express';
import authRouter from '../routes/auth';
import settingsRouter from '../routes/settings';
import friendsRouter from '../routes/friends';
import matchesRouter from '../routes/matches';
import feedbacksRouter from '../routes/feedbacks';
import reportsRouter from '../routes/reports';
import broadcastsRouter from '../routes/broadcasts';
import adminRoutes from '../routes/admin';

export function mountApiRoutes(app: Express) {
  app.use('/api/auth', authRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/friends', friendsRouter);
  app.use('/api/matches', matchesRouter);
  app.use('/api/feedbacks', feedbacksRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/broadcast', broadcastsRouter);
  app.use('/api/admin', adminRoutes);
}
