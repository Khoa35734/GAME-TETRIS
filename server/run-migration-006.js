// Run migration 006
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

    const migrationPath = path.join(__dirname, 'src', 'migrations', '006_add_disconnect_reason.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n🔄 Running migration 006...\n');
    await client.query(sql);
    
    console.log('\n✅ Migration 006 completed successfully!');
    
    // Verify new column
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'matches' AND column_name = 'end_reason'
    `);
    
    console.log('\n=== New column added ===');
    console.log(result.rows[0]);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
