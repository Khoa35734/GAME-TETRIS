import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import SettingsPage from '../SettingsPage';
import FriendsManager from '../FriendsManager';
import ConnectionDebug from '../ConnectionDebug';
import ProfileModal from '../ProfileModal';

import { useAuth } from './hooks/useAuth';
import { useMusic } from './hooks/useMusic';
import { useUnreadMessages } from './hooks/useUnreadMessages';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

import GameModeCard from './components/GameModeCard';
import TopBar from './components/TopBar';
import AuthForm from './components/AuthForm';
import LeaderboardModal from './components/LeaderboardModal';
import HelpModal from './components/HelpModal';
import LegalNotice from './components/LegalNotice';

import type { User } from './types';
import './styles.css';

const HomeMenu: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const s = localStorage.getItem('tetris:user');
      return s ? (JSON.parse(s) as User) : null;
    } catch { return null; }
  });

  const {
    activeTab,
    setActiveTab,
    loading,
    loadingMessage,
    showGameModes,
    loginForm,
    setLoginForm,
    registerForm,
    setRegisterForm,
    error,
    setError,
    handleLogin,
    handleRegister,
    playAsGuest,
    logout,
    discardPendingSession,
    lastUserHint,
  } = useAuth({ setCurrentUser, navigate });

  const { isMusicPlaying, toggleMusic } = useMusic();
  const { unreadCount, fetchUnreadCount } = useUnreadMessages(currentUser);

  const [showSettings, setShowSettings] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useKeyboardShortcuts({
    currentUser,
    activeTab,
    loading,
    logout,
    toggleDebug: () => setShowDebug((v) => !v),
    showSettings,
    showFriends,
    showLeaderboard,
    showProfile,
    showHelp,
  });

  const playerStats = useMemo(() => {
    try {
      const saved = localStorage.getItem('tetris:playerStats');
      return saved ? JSON.parse(saved) : { level: 1, stars: 0 };
    } catch {
      return { level: 1, stars: 0 };
    }
  }, []);

  const isGuest = currentUser?.isGuest ?? false;
  const guestLockReason = isGuest ? 'Vui lòng đăng nhập tài khoản để vào chế độ này' : undefined;

  const startSinglePlayer = () => {
    if (currentUser) {
      alert(`🎮 Bắt đầu chế độ chơi đơn!\nNgười chơi: ${currentUser.username}\nChế độ: ${currentUser.isGuest ? 'Khách' : 'Đã đăng nhập'}`);
      navigate('/single/settings');
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: "url('/img/bg3.gif') center/cover, #000", color: '#ffffff', position: 'relative', overflow: 'hidden', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      {currentUser && (
        <TopBar
          currentUser={currentUser}
          playerStats={playerStats}
          isMusicPlaying={isMusicPlaying}
          toggleMusic={toggleMusic}
          onShowFriends={() => setShowFriends(true)}
          onShowLeaderboard={() => setShowLeaderboard(true)}
          onShowSettings={() => setShowSettings(true)}
          onLogout={logout}
          onShowProfile={() => setShowProfile(true)}
          navigate={navigate}
          unreadCount={unreadCount}
          fetchUnreadCount={fetchUnreadCount}
        />
      )}

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: !showGameModes ? 'center' : undefined, marginTop: currentUser ? 70 : 0 }}>
        {showGameModes && (
          <div style={{ textAlign: 'center', marginBottom: '40px', animation: 'pulse 2s infinite' }}>
            <img
              src="/img/logo.png"
              alt="TETR.IO Logo"
              style={{ width: '800px', height: 'auto', filter: 'drop-shadow(0 0 10px #4ecdc4) drop-shadow(0 0 20px #ff6b6b)', transition: 'transform 0.3s ease, filter 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.filter = 'drop-shadow(0 0 15px #4ecdc4) drop-shadow(0 0 30px #ff6b6b)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'drop-shadow(0 0 10px #4ecdc4) drop-shadow(0 0 20px #ff6b6b)'; }}
            />
          </div>
        )}

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: !showGameModes ? 'calc(100vh - 40px)' : undefined }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '15px', padding: '40px', maxWidth: '600px', width: '100%', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)', animation: 'slideUp 1s ease-out 0.3s both' }}>
            {!showGameModes ? (
              <>
                <AuthForm
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  loading={loading}
                  loadingMessage={loadingMessage}
                  error={error}
                  setError={setError}
                  loginForm={loginForm}
                  setLoginForm={setLoginForm}
                  registerForm={registerForm}
                  setRegisterForm={setRegisterForm}
                  handleLogin={handleLogin}
                  handleRegister={handleRegister}
                  playAsGuest={playAsGuest}
                  quickLoginUser={null}
                  onQuickLogin={undefined as any}
                  onDismissQuickLogin={discardPendingSession}
                  lastUserHint={lastUserHint}
                />
                <LegalNotice />
              </>
            ) : (
              <div>
                <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '30px', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', fontFamily: "'SVN-Determination Sans', 'Press Start 2P', cursive", color: '#eb2614ff', textShadow: '0 0 15px #c91e0fff, 0 0 30px #ff6b6b', animation: 'pulse 2s infinite' }}>
                  Chọn chế độ chơi
                </h1>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <GameModeCard icon="🎯" title="Chơi đơn" description="Thử thách bản thân với chế độ Marathon, Sprint hoặc Ultra" onClick={startSinglePlayer} />
                  <GameModeCard icon="⚔️" title="Đối kháng" description="Chơi 1v1 với người chơi khác trực tuyến" locked={isGuest} lockedReason={guestLockReason} onClick={() => navigate('/online/casual')} />
                  <GameModeCard icon="👥" title="Phòng tùy chỉnh" description="Tạo hoặc tham gia phòng chơi với bạn bè" locked={isGuest} lockedReason={guestLockReason} onClick={() => { if (currentUser?.isGuest) return; navigate('/online'); }} />
                  <GameModeCard icon="🏆" title="Xếp hạng" description="Thi đấu và leo rank trong hệ thống xếp hạng" locked={isGuest} lockedReason={guestLockReason} onClick={() => navigate('/online/ranked')} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowHelp(true)}
        title="Hướng dẫn chơi"
        style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1100, background: 'rgba(78, 205, 196, 0.18)', border: '1px solid rgba(78, 205, 196, 0.4)', color: '#4ecdc4', padding: '12px 16px', borderRadius: 12, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700, boxShadow: '0 10px 20px rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(78, 205, 196, 0.28)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(78, 205, 196, 0.18)'; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        ❓ Hướng dẫn
      </button>

      {showSettings && (
        <div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(10px)', zIndex: 2000, overflowY: 'auto' }}>
          <SettingsPage onBack={() => setShowSettings(false)} />
        </div>
      )}

      {showFriends && <FriendsManager onBack={() => setShowFriends(false)} />}

      <LeaderboardModal isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} currentUser={currentUser} />

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />

      {showDebug && <ConnectionDebug onClose={() => setShowDebug(false)} />}
      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  );
};

export default HomeMenu;
