import { sequelize } from '../postgres';
import fs from 'fs';
import path from 'path';

async function initDatabase() {
  try {
    console.log('[DB Init] Connecting to database...');
    await sequelize.authenticate();
    console.log('[DB Init] Connected successfully');

    // Read and execute migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '001_create_account_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('[DB Init] Running account table migration...');
    await sequelize.query(migrationSQL);
    console.log('[DB Init] ✅ Account table created/verified');

    // Verify table exists
    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'account'"
    );
    
    if (tables.length > 0) {
      console.log('[DB Init] ✅ Verified: account table exists');
      
      // Show column structure
      const [columns] = await sequelize.query(
        "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'account' ORDER BY ordinal_position"
      );
      console.log('[DB Init] Account table structure:', columns);
    } else {
      console.log('[DB Init] ⚠️ Warning: account table not found');
    }

    console.log('[DB Init] ✅ Database initialization complete');
    process.exit(0);
  } catch (error) {
    console.error('[DB Init] ❌ Error:', error);
    process.exit(1);
  }
}

initDatabase();
