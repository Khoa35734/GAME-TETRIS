import { sequelize } from '../stores/postgres';
import fs from 'fs';
import path from 'path';

async function checkFeedbackTable() {
  try {
    console.log('[Feedback Check] Connecting to database...');
    await sequelize.authenticate();
    console.log('[Feedback Check] Connected successfully');

    // Verify feedback table exists
    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feedback'"
    );
    
    if (tables.length > 0) {
      console.log('[Feedback Check] ✅ Table "feedback" exists');
      
      // Show column structure
      const [columns] = await sequelize.query(
        "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'feedback' ORDER BY ordinal_position"
      );
      console.log('[Feedback Check] Table structure:');
      console.table(columns);

      // Show enum values for status
      const [enums] = await sequelize.query(
        "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'feedback_status')"
      );
      if (enums.length > 0) {
        console.log('[Feedback Check] Status enum values:', enums.map((e: any) => e.enumlabel).join(', '));
      }

      // Count existing records
      const [count] = await sequelize.query("SELECT COUNT(*) as count FROM feedback");
      console.log(`[Feedback Check] Total records: ${(count[0] as any).count}`);
    } else {
      console.log('[Feedback Check] ⚠️ Warning: feedback table not found');
    }

    console.log('[Feedback Check] ✅ Check complete');
    process.exit(0);
  } catch (error) {
    console.error('[Feedback Check] ❌ Error:', error);
    process.exit(1);
  }
}

checkFeedbackTable();
