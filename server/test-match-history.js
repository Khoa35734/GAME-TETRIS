// Test Match History - Insert Sample Data
// File: server/test-match-history.js

const { Pool } = require('pg');

async function testMatchHistory() {
  // Load .env if exists
  try {
    require('dotenv').config();
  } catch (e) {
    console.log('⚠️  dotenv not installed, using default values');
  }

  const pool = new Pool({
    user: process.env.PG_USER || 'devuser',
    host: process.env.PG_HOST || 'localhost',
    database: process.env.PG_DATABASE || process.env.PG_DB || 'tetris',
    password: process.env.PG_PASSWORD || '123456',
    port: Number(process.env.PG_PORT) || 5432,
  });

  console.log('🔗 Connecting to database:', {
    user: process.env.PG_USER || 'devuser',
    host: process.env.PG_HOST || 'localhost',
    database: process.env.PG_DATABASE || process.env.PG_DB || 'tetris',
    port: Number(process.env.PG_PORT) || 5432,
  });

  try {
    console.log('🔍 Checking if tables exist...');
    
    // Check if tables exist
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('matches', 'game_stats')
      ORDER BY table_name;
    `);
    
    console.log('📋 Tables found:', tablesCheck.rows.map(r => r.table_name));
    
    if (tablesCheck.rows.length !== 2) {
      console.error('❌ Tables not found! Please run migration first.');
      console.log('\n💡 Run this command:');
      console.log('psql -U postgres -d tetris -f src/migrations/004_create_matches_and_game_stats_tables.sql');
      process.exit(1);
    }

    // Check if users exist
    console.log('\n🔍 Checking if users exist...');
    const usersCheck = await pool.query(`
      SELECT user_id, user_name FROM users LIMIT 5;
    `);
    
    if (usersCheck.rows.length === 0) {
      console.error('❌ No users found! Please create users first.');
      process.exit(1);
    }
    
    console.log('👥 Users found:', usersCheck.rows.length);
    usersCheck.rows.forEach(u => console.log(`  - ${u.user_id}: ${u.user_name}`));

    // Get 2 users for test
    const player1Id = usersCheck.rows[0].user_id;
    const player2Id = usersCheck.rows[1]?.user_id || usersCheck.rows[0].user_id;

    console.log(`\n🎮 Testing with Player1 ID: ${player1Id}, Player2 ID: ${player2Id}`);

    // Insert test match
    console.log('\n💾 Inserting test match...');
    
    await pool.query('BEGIN');

    // Insert match
    const matchResult = await pool.query(`
      INSERT INTO matches (
        player1_id, player2_id, player1_wins, player2_wins, 
        winner_id, mode
      )
      VALUES ($1, $2, 2, 1, $1, 'casual')
      RETURNING match_id;
    `, [player1Id, player2Id]);

    const matchId = matchResult.rows[0].match_id;
    console.log(`✅ Match inserted with ID: ${matchId}`);

    // Insert game stats for game 1
    await pool.query(`
      INSERT INTO game_stats (
        match_id, game_number, player_id, is_winner,
        pieces, attack_lines, time_seconds, pps, apm
      )
      VALUES 
        ($1, 1, $2, true, 45, 18, 23.50, 1.91, 45.96),
        ($1, 1, $3, false, 40, 15, 23.50, 1.70, 38.30);
    `, [matchId, player1Id, player2Id]);
    console.log('✅ Game 1 stats inserted');

    // Insert game stats for game 2
    await pool.query(`
      INSERT INTO game_stats (
        match_id, game_number, player_id, is_winner,
        pieces, attack_lines, time_seconds, pps, apm
      )
      VALUES 
        ($1, 2, $2, false, 38, 12, 20.10, 1.89, 35.82),
        ($1, 2, $3, true, 42, 16, 20.10, 2.09, 47.76);
    `, [matchId, player1Id, player2Id]);
    console.log('✅ Game 2 stats inserted');

    // Insert game stats for game 3
    await pool.query(`
      INSERT INTO game_stats (
        match_id, game_number, player_id, is_winner,
        pieces, attack_lines, time_seconds, pps, apm
      )
      VALUES 
        ($1, 3, $2, true, 50, 22, 28.30, 1.77, 46.64),
        ($1, 3, $3, false, 45, 18, 28.30, 1.59, 38.16);
    `, [matchId, player1Id, player2Id]);
    console.log('✅ Game 3 stats inserted');

    await pool.query('COMMIT');

    // Verify data
    console.log('\n📊 Verifying inserted data...');
    
    const matchData = await pool.query(`
      SELECT 
        m.*,
        p1.user_name as player1_name,
        p2.user_name as player2_name,
        w.user_name as winner_name
      FROM matches m
      JOIN users p1 ON m.player1_id = p1.user_id
      JOIN users p2 ON m.player2_id = p2.user_id
      LEFT JOIN users w ON m.winner_id = w.user_id
      WHERE m.match_id = $1;
    `, [matchId]);

    console.log('\n🏆 Match Details:');
    console.log(matchData.rows[0]);

    const statsData = await pool.query(`
      SELECT 
        gs.*,
        u.user_name
      FROM game_stats gs
      JOIN users u ON gs.player_id = u.user_id
      WHERE gs.match_id = $1
      ORDER BY gs.game_number, gs.player_id;
    `, [matchId]);

    console.log('\n📈 Game Stats:');
    statsData.rows.forEach(row => {
      console.log(`Game ${row.game_number} - ${row.user_name}: ` +
        `${row.is_winner ? '✅ WIN' : '❌ LOSE'} | ` +
        `Pieces: ${row.pieces} | Attack: ${row.attack_lines} | ` +
        `Time: ${row.time_seconds}s | PPS: ${row.pps} | APM: ${row.apm}`);
    });

    console.log('\n✅ Test completed successfully!');
    console.log(`\n💡 You can now query the data with:`);
    console.log(`   SELECT * FROM matches WHERE match_id = ${matchId};`);
    console.log(`   SELECT * FROM game_stats WHERE match_id = ${matchId};`);

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testMatchHistory();
