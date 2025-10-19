import React from 'react';
import type { User } from '../types';

interface Props {
  currentUser: User;
  playerStats: { level: number; stars: number };
  isMusicPlaying: boolean;
  toggleMusic: () => void;
  onShowFriends: () => void;
  onShowLeaderboard: () => void;
  onShowSettings: () => void;
  onLogout: () => void;
  onShowProfile: () => void;
  navigate: (path: string) => void;
  unreadCount: number;
  fetchUnreadCount: () => void | Promise<void>;
}

const TopBar: React.FC<Props> = ({
  currentUser,
  playerStats,
  isMusicPlaying,
  toggleMusic,
  onShowFriends,
  onShowLeaderboard,
  onShowSettings,
  onLogout,
  onShowProfile,
  navigate,
  unreadCount,
  fetchUnreadCount,
}) => {
  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 70,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', zIndex: 1000,
        borderBottom: '2px solid rgba(78, 205, 196, 0.3)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div
          onClick={onShowProfile}
          style={{
            width: 50, height: 50,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 'bold', color: '#fff',
            border: '2px solid #4ecdc4',
            boxShadow: '0 0 15px rgba(78, 205, 196, 0.5)',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 0 25px rgba(78, 205, 196, 0.8)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(78, 205, 196, 0.5)';
          }}
        >
          {currentUser.username.charAt(0).toUpperCase()}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            {currentUser.username}
            {currentUser.isGuest && (
              <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#ffc107', background: 'rgba(255, 193, 7, 0.2)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255, 193, 7, 0.5)' }}>
                Khách
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#888', fontWeight: 500 }}>ID: #{currentUser.accountId}</div>
          {!currentUser.isGuest && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(78, 205, 196, 0.15)', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(78, 205, 196, 0.3)' }}>
                <span style={{ fontSize: '0.9rem' }}>🎮</span>
                <span style={{ color: '#4ecdc4', fontWeight: 600, fontSize: '0.9rem' }}>Level {playerStats.level}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 193, 7, 0.15)', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(255, 193, 7, 0.3)' }}>
                <span style={{ fontSize: '0.9rem' }}>⭐</span>
                <span style={{ color: '#ffc107', fontWeight: 600, fontSize: '0.9rem' }}>{playerStats.stars}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={toggleMusic}
          style={{
            background: isMusicPlaying ? 'rgba(78, 205, 196, 0.15)' : 'rgba(255, 107, 107, 0.15)',
            border: isMusicPlaying ? '1px solid rgba(78, 205, 196, 0.4)' : '1px solid rgba(255, 107, 107, 0.4)',
            color: isMusicPlaying ? '#4ecdc4' : '#ff6b6b',
            padding: '10px 16px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: 600, transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            if (isMusicPlaying) {
              e.currentTarget.style.background = 'rgba(78, 205, 196, 0.25)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(78, 205, 196, 0.4)';
            } else {
              e.currentTarget.style.background = 'rgba(255, 107, 107, 0.25)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.4)';
            }
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            if (isMusicPlaying) e.currentTarget.style.background = 'rgba(78, 205, 196, 0.15)';
            else e.currentTarget.style.background = 'rgba(255, 107, 107, 0.15)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {isMusicPlaying ? '🎵 Nhạc' : '🔇 Nhạc'}
        </button>

        <button
          onClick={onShowFriends}
          style={{ background: 'rgba(156, 39, 176, 0.15)', border: '1px solid rgba(156, 39, 176, 0.4)', color: '#ba68c8', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: 600, transition: 'all 0.3s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(156, 39, 176, 0.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(156, 39, 176, 0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(156, 39, 176, 0.15)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          👥 Bạn bè
        </button>

        <button
          onClick={() => { navigate('/inbox'); setTimeout(() => fetchUnreadCount(), 1000); }}
          style={{ background: 'rgba(33, 150, 243, 0.15)', border: '1px solid rgba(33, 150, 243, 0.4)', color: '#42a5f5', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: 600, transition: 'all 0.3s ease', position: 'relative' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(33, 150, 243, 0.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(33, 150, 243, 0.15)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          📬 Hộp thư
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'linear-gradient(135deg, #f93a5a, #f7778c)', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', border: '2px solid #1a1a2e', boxShadow: '0 2px 8px rgba(249, 58, 90, 0.6)', animation: 'pulse 2s infinite' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={onShowLeaderboard}
          style={{ background: 'rgba(255, 193, 7, 0.15)', border: '1px solid rgba(255, 193, 7, 0.4)', color: '#ffc107', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: 600, transition: 'all 0.3s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 193, 7, 0.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 193, 7, 0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 193, 7, 0.15)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          🏆 Bảng xếp hạng
        </button>

        <button
          onClick={onShowSettings}
          style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.3)', color: '#fff', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: 600, transition: 'all 0.3s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(78, 205, 196, 0.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          ⚙️ Cài đặt
        </button>

        <button
          onClick={onLogout}
          style={{ background: 'rgba(244, 67, 54, 0.2)', border: '1px solid rgba(244, 67, 54, 0.5)', color: '#ff6b6b', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, transition: 'all 0.3s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(244, 67, 54, 0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(244, 67, 54, 0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(244, 67, 54, 0.2)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
};

export default React.memo(TopBar);

