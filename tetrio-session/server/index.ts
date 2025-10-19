import express from 'express';
import cookieSession from 'cookie-session';
import authRouter from './routes/auth';

const app = express();

app.use(express.json());

app.use(
  cookieSession({
    name: 'dtetris.sid',
    sameSite: 'lax',
    secure: false,
    httpOnly: true,
    keys: [process.env.SESSION_SECRET || 'development-secret'],
    maxAge: 1000 * 60 * 60, // 1 hour
  })
);

app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use('/auth', authRouter);

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`[tetrio-session] listening on http://localhost:${PORT}`);
});
