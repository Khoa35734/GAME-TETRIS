const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: Number(process.env.PG_PORT) || 5432,
  database: process.env.PG_DATABASE || process.env.PG_DB || 'tetris',
  user: process.env.PG_USER || 'devuser',
  password: process.env.PG_PASSWORD || '123456',
});

async function checkMatchMode() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking recent match modes...\n');

    // Check last 10 matches
    const result = await client.query(`
      SELECT 
        match_id,
        player1_wins,
        player2_wins,
        mode,
        match_timestamp,
        end_reason
      FROM matches 
      ORDER BY match_timestamp DESC 
      LIMIT 10
    `);

    console.log('📊 Last 10 matches:');
    console.table(result.rows);

    // Check if mode column exists and has correct values
    const modeCheck = await client.query(`
      SELECT 
        mode,
        COUNT(*) as count
      FROM matches
      GROUP BY mode
      ORDER BY count DESC
    `);

    console.log('\n📊 Match mode distribution:');
    console.table(modeCheck.rows);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkMatchMode();
