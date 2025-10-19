import { useEffect } from 'react';

export function useKeyboardShortcuts(params: {
  currentUser: any;
  activeTab: 'login' | 'register';
  loading: boolean;
  logout: () => void;
  toggleDebug: () => void;
}) {
  const { currentUser, activeTab, loading, logout, toggleDebug } = params;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !currentUser && !loading && activeTab === 'login') {
        const form = document.getElementById('loginForm') as HTMLFormElement | null;
        if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
      }
      if (e.key === 'Escape' && currentUser) {
        logout();
      }
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        toggleDebug();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentUser, activeTab, loading, logout, toggleDebug]);
}

