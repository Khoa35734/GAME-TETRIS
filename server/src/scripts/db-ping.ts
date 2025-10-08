import 'dotenv/config';
import { initPostgres, sequelize } from '../postgres';

// Optional opt-out: set DB_SKIP_CHECK=1 to skip the DB check during build
const skip = (() => {
  const v = (process.env.DB_SKIP_CHECK || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
})();

(async () => {
  if (skip) {
    console.log('[build] DB check skipped via DB_SKIP_CHECK');
    process.exit(0);
  }
  try {
    await initPostgres();
    console.log('[build] DB check OK');
    process.exit(0);
  } catch (e) {
    console.error('[build] DB check FAILED');
    console.error(e);
    process.exit(1);
  } finally {
    try { await sequelize.close(); } catch {}
  }
})();
