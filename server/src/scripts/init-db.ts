import { sequelize } from '../../stores/postgres';
import fs from 'fs';
import path from 'path';

async function initDatabase() {
  try {
    console.log('[DB Init] Connecting to database...');
    await sequelize.authenticate();
    console.log('[DB Init] Connected successfully');

    // Read and execute migration files in order
    const migrations = [
      '001_create_account_table.sql',
      '002_rename_account_to_users.sql'
    ];

    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
      
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
        console.log(`[DB Init] Running migration: ${migrationFile}...`);
        await sequelize.query(migrationSQL);
        console.log(`[DB Init] ✅ Migration ${migrationFile} completed`);
      } else {
        console.log(`[DB Init] ⚠️ Migration file not found: ${migrationFile}`);
      }
    }

    // Verify users table exists
    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'"
    );
    
    if (tables.length > 0) {
      console.log('[DB Init] ✅ Verified: users table exists');
      
      // Show column structure
      const [columns] = await sequelize.query(
        "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
      );
      console.log('[DB Init] Users table structure:', columns);
    } else {
      console.log('[DB Init] ⚠️ Warning: users table not found');
    }

    console.log('[DB Init] ✅ Database initialization complete');
    process.exit(0);
  } catch (error) {
    console.error('[DB Init] ❌ Error:', error);
    process.exit(1);
  }
}

initDatabase();
