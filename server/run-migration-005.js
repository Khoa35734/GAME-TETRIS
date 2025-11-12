// Run migration 005
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'tetris',
  user: 'postgres',
  password: 'root',
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    const migrationPath = path.join(__dirname, 'src', 'migrations', '005_add_detailed_stats_to_game_stats.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n🔄 Running migration 005...\n');
    await client.query(sql);
    
    console.log('\n✅ Migration 005 completed successfully!');
    
    // Verify new columns
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'game_stats'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== Updated game_stats Schema ===');
    result.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} (default: ${col.column_default || 'none'})`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
