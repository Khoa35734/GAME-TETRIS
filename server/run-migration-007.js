const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: Number(process.env.PG_PORT) || 5432,
  database: process.env.PG_DATABASE || process.env.PG_DB || 'tetris',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'root',
});

async function runMigration007() {
  const client = await pool.connect();
  try {
    console.log('🚀 Running Migration 007: Add ELO rating and match mode...\n');

    const sql = require('fs').readFileSync(
      require('path').join(__dirname, 'src/migrations/007_add_elo_and_mode.sql'),
      'utf-8'
    );

    await client.query(sql);

    console.log('✅ Migration 007 completed successfully!');
    console.log('   - Added elo_rating column to users (default 1000)');
    console.log('   - Added win_streak column to users (default 0)');
    console.log('   - Added mode column to matches (default casual)');
    console.log('   - Created index on elo_rating for leaderboard');
  } catch (error) {
    console.error('❌ Migration 007 failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration007();
