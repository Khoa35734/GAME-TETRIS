require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DB || 'tetris',
  user: process.env.PG_USER || 'devuser',
  password: process.env.PG_PASSWORD || '123456',
});

async function clearTestData() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Clearing test data...\n');

    // Delete test data (keep tables)
    await client.query('DELETE FROM game_stats WHERE match_id = 1');
    console.log('✅ Deleted game_stats for match_id = 1');

    await client.query('DELETE FROM matches WHERE match_id = 1');
    console.log('✅ Deleted match with match_id = 1');

    // Show remaining data
    const matchesResult = await client.query('SELECT COUNT(*) FROM matches');
    const gameStatsResult = await client.query('SELECT COUNT(*) FROM game_stats');

    console.log(`\n📊 Remaining data:`);
    console.log(`   - matches: ${matchesResult.rows[0].count} rows`);
    console.log(`   - game_stats: ${gameStatsResult.rows[0].count} rows`);

    console.log('\n✅ Test data cleared! Ready for real game testing.');

  } catch (error) {
    console.error('❌ Error clearing test data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

clearTestData();
