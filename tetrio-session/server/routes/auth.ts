import { Router } from 'express';

type SessionUser = {
  id: string;
  username: string;
};

const FAKE_USERS: Record<string, { id: string; password: string }> = {
  tetrio: { id: 'u-001', password: 'stack-blocks' },
  alex: { id: 'u-002', password: '123456' },
  guest: { id: 'u-003', password: 'guest-pass' },
};

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body ?? {};

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }

  const record = FAKE_USERS[username.toLowerCase()];

  if (!record || record.password !== password) {
    return res.status(401).json({ success: false, message: 'Wrong username or password' });
  }

  (req.session as any).user = { id: record.id, username } as SessionUser;

  return res.json({ success: true, username });
});

router.get('/session', (req, res) => {
  const session = req.session as any;
  const user = session?.user as SessionUser | undefined;

  if (!user) {
    return res.json({ loggedIn: false });
  }

  return res.json({ loggedIn: true, username: user.username });
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.json({ success: true });
});

export default router;
