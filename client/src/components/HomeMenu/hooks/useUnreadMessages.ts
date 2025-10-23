import { useCallback, useEffect, useState } from 'react';
import type { User } from '../types';

export function useUnreadMessages(currentUser: User | null) {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!currentUser?.accountId) return;
    try {
      const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/messages/stats/${currentUser.accountId}`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(parseInt(data.unread) || 0);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, [currentUser?.accountId]);

  useEffect(() => {
    if (currentUser?.accountId) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.accountId, fetchUnreadCount]);

  return { unreadCount, fetchUnreadCount };
}

