import { Sequelize } from 'sequelize';

/**
 * PostgreSQL connection (Sequelize)
 *
 * Configuration (any of the following):
 * - DATABASE_URL: full connection string, e.g. postgres://user:pass@host:5432/db
 * - Or individual vars: PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DB
 * - Optional: PG_SSL=true to enable SSL (rejectUnauthorized=false by default)
 */

const useSSL = (() => {
  const v = process.env.PG_SSL || '';
  return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
})();

const dialectOptions: any = useSSL
  ? { ssl: { require: true, rejectUnauthorized: false } }
  : undefined;

let sequelize: Sequelize;

const DATABASE_URL = process.env.DATABASE_URL;

if (DATABASE_URL) {
  sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions,
  });
} else {
  const host = process.env.PG_HOST || 'localhost';
  const port = Number(process.env.PG_PORT || 5432);
  const database = process.env.PG_DB || 'Tetris';
  const username = process.env.PG_USER || 'devuser';
  const password = process.env.PG_PASSWORD || '123456';

  sequelize = new Sequelize(database, username, password, {
    host,
    port,
    dialect: 'postgres',
    logging: false,
    dialectOptions,
  });
}

export async function initPostgres(): Promise<void> {
  try {
    await sequelize.authenticate();
    // Optional lightweight health probe
    await sequelize.query('SELECT 1');
    console.log('[postgres] Connected');
  } catch (err) {
    console.error('[postgres] Connection failed', err);
    throw err;
  }
}

export { sequelize };
