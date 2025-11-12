const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tetris',
  user: 'devuser',
  password: '123456',
});

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'game_stats'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== game_stats Table Schema ===');
    result.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
