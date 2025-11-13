// Simple test - check if match history data exists
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tetris',
  user: 'postgres',
  password: 'root',
});

async function checkMatchData() {
  try {
    // Get latest match with player names
    const matchResult = await pool.query(`
      SELECT 
        m.match_id,
        m.player1_id,
        m.player2_id,
        u1.user_name as player1_name,
        u2.user_name as player2_name,
        m.winner_id,
        m.player1_wins,
        m.player2_wins
      FROM matches m
      JOIN users u1 ON m.player1_id = u1.user_id
      JOIN users u2 ON m.player2_id = u2.user_id
      ORDER BY m.match_timestamp DESC
      LIMIT 1
    `);
    
    if (matchResult.rows.length === 0) {
      console.log('No matches found');
      return;
    }
    
    const match = matchResult.rows[0];
    console.log('\n=== Match Info ===');
    console.log(`Match ID: ${match.match_id}`);
    console.log(`Player 1: ${match.player1_name} (ID: ${match.player1_id})`);
    console.log(`Player 2: ${match.player2_name} (ID: ${match.player2_id})`);
    console.log(`Winner ID: ${match.winner_id}`);
    console.log(`Score: ${match.player1_wins}-${match.player2_wins}\n`);
    
    // Get game stats with time
    const statsResult = await pool.query(`
      SELECT 
        game_number,
        player_id,
        is_winner,
        time_seconds,
        elapsed_ms
      FROM game_stats
      WHERE match_id = $1
      ORDER BY game_number, player_id
    `, [match.match_id]);
    
    console.log('=== Game Stats Time Info ===');
    statsResult.rows.forEach(row => {
      const playerName = row.player_id === match.player1_id ? match.player1_name : match.player2_name;
      console.log(`Game ${row.game_number}, ${playerName}: time_seconds=${row.time_seconds}, elapsed_ms=${row.elapsed_ms}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMatchData();
