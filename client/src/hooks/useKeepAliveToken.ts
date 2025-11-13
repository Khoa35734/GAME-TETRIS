// React hook – keeps the access token alive while the player stays online.

import { useEffect } from 'react';
import { authService } from '../services/authService';
import { tokenStore } from '../services/tokenStore';

const REFRESH_THRESHOLD_MS = 60 * 1000; // Refresh 1 minute before expiry
const FALLBACK_INTERVAL_MS = 5 * 60 * 1000; // Retry every 5 minutes if no expiry info

export const useKeepAliveToken = () => {
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const schedule = () => {
      if (cancelled) return;

      const expiresAt = tokenStore.getExpiresAt();
      if (!expiresAt) {
        timer = window.setTimeout(async () => {
          if (!cancelled) {
            await authService.refreshAccessToken();
            schedule();
          }
        }, FALLBACK_INTERVAL_MS);
        return;
      }

      const delay = Math.max(1_000, expiresAt - Date.now() - REFRESH_THRESHOLD_MS);
      timer = window.setTimeout(async () => {
        if (cancelled) return;
        const result = await authService.refreshAccessToken();
        if (!result.success) {
          tokenStore.clear();
          return;
        }
        schedule();
      }, delay);
    };

    const listener = () => {
      if (timer) {
        window.clearTimeout(timer);
      }
      if (tokenStore.getAccessToken()) {
        schedule();
      }
    };

    tokenStore.subscribe(listener);

    if (!tokenStore.getAccessToken()) {
      authService.refreshAccessToken().finally(schedule);
    } else {
      schedule();
    }

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
      tokenStore.unsubscribe(listener);
    };
  }, []);
};

export default useKeepAliveToken;
