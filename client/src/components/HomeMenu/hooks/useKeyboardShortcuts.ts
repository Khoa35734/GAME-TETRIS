import { useEffect } from 'react';

export function useKeyboardShortcuts(params: {
  currentUser: any;
  activeTab: 'login' | 'register';
  loading: boolean;
  logout: () => void;
  toggleDebug: () => void;
  showSettings?: boolean;
  showFriends?: boolean;
  showLeaderboard?: boolean;
  showProfile?: boolean;
  showHelp?: boolean;
}) {
  const { currentUser, activeTab, loading, logout, toggleDebug, showSettings, showFriends, showLeaderboard, showProfile, showHelp } = params;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !currentUser && !loading && activeTab === 'login') {
        const form = document.getElementById('loginForm') as HTMLFormElement | null;
        if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
      }
      // Only logout on Escape if no modal is open
      if (e.key === 'Escape' && currentUser) {
        const anyModalOpen = showSettings || showFriends || showLeaderboard || showProfile || showHelp;
        if (!anyModalOpen) {
          logout(); // ✅ Only logout when no modal is open
        }
      }
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        toggleDebug();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentUser, activeTab, loading, logout, toggleDebug, showSettings, showFriends, showLeaderboard, showProfile, showHelp]);
}

