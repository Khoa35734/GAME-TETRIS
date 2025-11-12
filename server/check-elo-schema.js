const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: Number(process.env.PG_PORT) || 5432,
  database: process.env.PG_DATABASE || process.env.PG_DB || 'tetris',
  user: process.env.PG_USER || 'devuser',
  password: process.env.PG_PASSWORD || '123456',
});

async function checkEloColumns() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking ELO columns...\n');

    // Check users table columns
    const usersColumns = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name IN ('elo_rating', 'win_streak')
      ORDER BY column_name
    `);

    console.log('📊 Users table ELO columns:');
    console.table(usersColumns.rows);

    // Check matches table mode column
    const matchesColumns = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'matches' 
        AND column_name = 'mode'
    `);

    console.log('\n📊 Matches table mode column:');
    console.table(matchesColumns.rows);

    // Check sample user data
    const sampleUsers = await client.query(`
      SELECT user_id, user_name, elo_rating, win_streak 
      FROM users 
      LIMIT 5
    `);

    console.log('\n👥 Sample users with ELO:');
    console.table(sampleUsers.rows);

    // Check recent matches
    const recentMatches = await client.query(`
      SELECT match_id, mode, player1_wins, player2_wins, match_timestamp 
      FROM matches 
      ORDER BY match_timestamp DESC 
      LIMIT 5
    `);

    console.log('\n🎮 Recent matches:');
    console.table(recentMatches.rows);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkEloColumns();
