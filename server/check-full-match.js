// Check if a full match has all the detailed stats
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tetris',
  user: 'postgres',
  password: 'root',
});

async function checkFullMatch() {
  try {
    // Get latest match
    const matchResult = await pool.query(`
      SELECT match_id FROM matches 
      ORDER BY match_timestamp DESC 
      LIMIT 1
    `);
    
    if (matchResult.rows.length === 0) {
      console.log('❌ No matches found in database');
      return;
    }
    
    const matchId = matchResult.rows[0].match_id;
    console.log(`\n=== Checking Match ID: ${matchId} ===\n`);
    
    const statsResult = await pool.query(`
      SELECT 
        game_number,
        player_id,
        is_winner,
        -- Old fields
        pieces,
        attack_lines,
        time_seconds,
        pps,
        apm,
        -- New fields
        lines_cleared,
        pieces_placed,
        attacks_sent,
        garbage_received,
        holds,
        inputs,
        elapsed_ms
      FROM game_stats
      WHERE match_id = $1
      ORDER BY game_number, player_id
    `, [matchId]);
    
    console.log(`Total game stats records: ${statsResult.rows.length}\n`);
    
    statsResult.rows.forEach((row, i) => {
      console.log(`--- Game ${row.game_number}, Player ${row.player_id} ---`);
      console.log(`Winner: ${row.is_winner}`);
      console.log(`Old format:`);
      console.log(`  pieces: ${row.pieces}, attack_lines: ${row.attack_lines}, time_seconds: ${row.time_seconds}`);
      console.log(`  pps: ${row.pps}, apm: ${row.apm}`);
      console.log(`New format:`);
      console.log(`  lines_cleared: ${row.lines_cleared}`);
      console.log(`  pieces_placed: ${row.pieces_placed}`);
      console.log(`  attacks_sent: ${row.attacks_sent}`);
      console.log(`  garbage_received: ${row.garbage_received}`);
      console.log(`  holds: ${row.holds}`);
      console.log(`  inputs: ${row.inputs}`);
      console.log(`  elapsed_ms: ${row.elapsed_ms}`);
      console.log('');
    });
    
    // Check if all new fields have data (not all zeros)
    const hasData = statsResult.rows.some(row => 
      row.pieces_placed > 0 || 
      row.holds > 0 || 
      row.inputs > 0 || 
      row.elapsed_ms > 0
    );
    
    if (hasData) {
      console.log('✅ Match has detailed stats data!');
    } else {
      console.log('⚠️  Match only has migrated data (old format)');
      console.log('   Play a new match to see full detailed stats');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkFullMatch();
