import { Express } from 'express';

function normalizeIp(ip: string | undefined | null): string {
  if (!ip) return '';
  let v = String(ip).trim();
  if (v.startsWith('::ffff:')) v = v.slice(7);
  if (v === '::1') v = '127.0.0.1';
  return v;
}

export function mountUtilityEndpoints(app: Express, PORT: number) {
  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.get('/api/server-info', (_req, res) => {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }
    res.json({
      ok: true,
      serverIPs: addresses,
      port: PORT,
      apiBaseUrl: addresses.length > 0 ? `http://${addresses[0]}:${PORT}/api` : `http://localhost:${PORT}/api`,
    });
  });

  app.get('/whoami', (req, res) => {
    const raw = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const ip = normalizeIp(raw);
    res.json({ ip });
  });
}
