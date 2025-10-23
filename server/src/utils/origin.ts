// Shared helpers for building CORS origin allow-lists.

export const resolveAllowedOrigins = (): Set<string> => {
  const rawEnv = process.env.CLIENT_URL ?? '';
  const explicitOrigins = rawEnv
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...explicitOrigins,
  ]);
};

export const isLanHttpOrigin = (origin: string): boolean => {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }

    const octets = url.hostname.split('.');
    if (octets.length !== 4) {
      return false;
    }

    return octets.every((octet) => {
      const value = Number(octet);
      return Number.isInteger(value) && value >= 0 && value <= 255;
    });
  } catch {
    return false;
  }
};
