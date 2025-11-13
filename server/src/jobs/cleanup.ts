import { matchManager } from '../managers/matchManager';

export function startCleanupJob() {
  console.log('[Cleanup] Starting periodic stale match cleanup job');

  setInterval(async () => {
    try {
      const cleaned = await matchManager.cleanupStaleMatches();
      if (cleaned > 0) {
        console.log(`[Cleanup] Removed ${cleaned} stale matches`);
      }
    } catch (error) {
      console.error('[Cleanup] Error during cleanup:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes
}