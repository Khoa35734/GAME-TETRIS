import { sequelize } from '../stores/postgres';
import { QueryTypes } from 'sequelize';

/**
 * Check and auto-unban users whose ban period has expired
 */
export async function checkExpiredBans() {
  try {
    console.log('[BanJob] Checking for expired bans...');

    // Find all active bans that have expired
    const expiredBans = await sequelize.query(
      `SELECT DISTINCT user_id 
       FROM ban_history 
       WHERE is_active = true 
       AND ban_end IS NOT NULL 
       AND ban_end < NOW()`,
      { type: QueryTypes.SELECT }
    ) as any[];

    if (expiredBans.length === 0) {
      console.log('[BanJob] No expired bans found.');
      return;
    }

    console.log(`[BanJob] Found ${expiredBans.length} users with expired bans.`);

    // Unban each user
    for (const ban of expiredBans) {
      const userId = ban.user_id;

      // Deactivate all expired bans for this user
      await sequelize.query(
        `UPDATE ban_history 
         SET is_active = false 
         WHERE user_id = :userId 
         AND is_active = true 
         AND ban_end IS NOT NULL 
         AND ban_end < NOW()`,
        {
          replacements: { userId },
          type: QueryTypes.UPDATE
        }
      );

      // Update user's banned status
      await sequelize.query(
        `UPDATE users 
         SET is_banned = false 
         WHERE user_id = :userId`,
        {
          replacements: { userId },
          type: QueryTypes.UPDATE
        }
      );

      console.log(`[BanJob] ✅ Auto-unbanned user ${userId}`);
    }

    console.log(`[BanJob] ✅ Successfully processed ${expiredBans.length} expired bans.`);
  } catch (error) {
    console.error('[BanJob] ❌ Error checking expired bans:', error);
  }
}

/**
 * Start the ban check job (runs every hour)
 */
export function startBanCheckJob() {
  // Run immediately on startup
  checkExpiredBans();

  // Run every hour
  const HOUR_IN_MS = 60 * 60 * 1000;
  setInterval(checkExpiredBans, HOUR_IN_MS);

  console.log('[BanJob] 🔄 Ban check job started (runs every hour)');
}
