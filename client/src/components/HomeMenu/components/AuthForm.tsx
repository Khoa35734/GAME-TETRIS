import React, { useRef } from 'react';

interface QuickLoginUser {
  username?: string;
  email?: string;
}

interface Props {
  activeTab: 'login' | 'register';
  setActiveTab: (t: 'login' | 'register') => void;
  loading: boolean;
  loadingMessage: string;
  error: string;
  setError: (e: string) => void;
  loginForm: { email: string; password: string };
  setLoginForm: (s: { email: string; password: string }) => void;
  registerForm: { username: string; email: string; password: string; confirmPassword: string };
  setRegisterForm: (s: { username: string; email: string; password: string; confirmPassword: string }) => void;
  handleLogin: (e: React.FormEvent) => void;
  handleRegister: (e: React.FormEvent) => void;
  playAsGuest: () => void;
  quickLoginUser: QuickLoginUser | null;
  onQuickLogin?: () => void;
  onDismissQuickLogin?: () => void;
  lastUserHint?: QuickLoginUser | null;
}

const AuthForm: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  loading,
  loadingMessage,
  error,
  setError,
  loginForm,
  setLoginForm,
  registerForm,
  setRegisterForm,
  handleLogin,
  handleRegister,
  playAsGuest,
  quickLoginUser,
  onQuickLogin,
  onDismissQuickLogin,
  lastUserHint,
}) => {
  const loginEmailRef = useRef<HTMLInputElement>(null);
  const loginPasswordRef = useRef<HTMLInputElement>(null);
  const registerUsernameRef = useRef<HTMLInputElement>(null);
  const registerEmailRef = useRef<HTMLInputElement>(null);
  const registerPasswordRef = useRef<HTMLInputElement>(null);
  const registerConfirmPasswordRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center', fontFamily: "'Press Start 2P', cursive", color: '#e1462bff', textShadow: '0 0 10px #712315ff, 0 0 20px #ff6b6b', animation: 'pulse 2s infinite' }}>
        Welcome to D.TETRIS
      </h1>
      <p style={{ color: '#cccccc', lineHeight: '1.6', marginBottom: '30px', fontSize: '1rem' }}>
        Puzzle together in this modern yet familiar online stacker. Play against friends and foes all over the world, or claim a spot on the leaderboards - the stacker future is yours!
      </p>

      {quickLoginUser && (
        <div style={{
          background: 'rgba(78, 205, 196, 0.14)',
          border: '1px solid rgba(78, 205, 196, 0.35)',
          borderRadius: '12px',
          padding: '18px 20px',
          marginBottom: '26px',
          boxShadow: '0 12px 30px rgba(78,205,196,0.12)',
        }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#4ecdc4', marginBottom: '8px' }}>
            Ti?p t?c v?i {quickLoginUser.username || quickLoginUser.email}
          </div>
          <p style={{ margin: '0 0 16px 0', color: '#d7f7f4', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Phi�n tr??c c?a b?n v?n du?c gi? l?i. B?m "Ti?p t?c" d? truy c?p nhanh, ho?c ch?n dang nh?p t�i kho?n kh�c.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={loading}
              onClick={onQuickLogin}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: loading ? 'rgba(78,205,196,0.35)' : 'linear-gradient(135deg, #4ecdc4 0%, #3ab0a8 100%)',
                color: '#ffffff',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 20px rgba(78,205,196,0.28)',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              ?? Ti?p t?c
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onDismissQuickLogin}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                background: 'transparent',
                color: '#ffffff',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Dang nh?p t�i kho?n kh�c
            </button>
          </div>
        </div>
      )}

      {!quickLoginUser && lastUserHint?.email && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px dashed rgba(255, 255, 255, 0.18)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '24px',
          color: '#b5c4ff',
          fontSize: '0.85rem',
        }}>
          G?i y: B?n t?ng d?ng {lastUserHint.email}. Nh?p nhanh email n�y d? ??ng nh?p l?i.
        </div>
      )}

      <div style={{ display: 'flex', marginBottom: '30px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '4px' }}>
        <button
          style={{ flex: 1, padding: '12px 20px', background: activeTab === 'login' ? 'rgba(255, 255, 255, 0.1)' : 'transparent', border: 'none', color: activeTab === 'login' ? '#ffffff' : '#888888', cursor: 'pointer', borderRadius: '6px', transition: 'all 0.3s ease', fontSize: '0.95rem', fontWeight: 500, boxShadow: activeTab === 'login' ? '0 2px 8px rgba(0, 0, 0, 0.2)' : 'none' }}
          onClick={() => { setActiveTab('login'); setError(''); }}
        >
          Đăng nhập
        </button>
        <button
          style={{ flex: 1, padding: '12px 20px', background: activeTab === 'register' ? 'rgba(255, 255, 255, 0.1)' : 'transparent', border: 'none', color: activeTab === 'register' ? '#ffffff' : '#888888', cursor: 'pointer', borderRadius: '6px', transition: 'all 0.3s ease', fontSize: '0.95rem', fontWeight: 500, boxShadow: activeTab === 'register' ? '0 2px 8px rgba(0, 0, 0, 0.2)' : 'none' }}
          onClick={() => { setActiveTab('register'); setError(''); }}
        >
          Đăng ký
        </button>
      </div>

      {activeTab === 'login' && (
        <form id="loginForm" onSubmit={handleLogin}>
          {error && (
            <div style={{ background: 'rgba(244, 67, 54, 0.15)', border: '1px solid rgba(244, 67, 54, 0.4)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#ff6b6b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#cccccc', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Email</label>
            <input
              ref={loginEmailRef}
              type="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); loginPasswordRef.current?.focus(); } }}
              style={{ width: '100%', padding: '15px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '1rem', transition: 'all 0.3s ease' }}
              placeholder="Nhập email của bạn"
              onFocus={(e) => { e.target.style.borderColor = '#4ecdc4'; e.target.style.boxShadow = '0 0 0 2px rgba(78, 205, 196, 0.2)'; e.target.style.background = 'rgba(255, 255, 255, 0.08)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.05)'; }}
              disabled={loading}
              required
              autoFocus
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#cccccc', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Mật khẩu</label>
            <input
              ref={loginPasswordRef}
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              style={{ width: '100%', padding: '15px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '1rem', transition: 'all 0.3s ease' }}
              placeholder="Nhập mật khẩu"
              onFocus={(e) => { e.target.style.borderColor = '#4ecdc4'; e.target.style.boxShadow = '0 0 0 2px rgba(78, 205, 196, 0.2)'; e.target.style.background = 'rgba(255, 255, 255, 0.08)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.05)'; }}
              disabled={loading}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '15px 30px', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease', textTransform: 'uppercase', letterSpacing: '1px', background: loading ? 'rgba(100, 100, 100, 0.5)' : 'linear-gradient(45deg, #ff6b6b, #4ecdc4)', color: 'white', marginBottom: '15px', width: '100%', position: 'relative', overflow: 'hidden', opacity: loading ? 0.6 : 1 }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(255, 107, 107, 0.3)'; } }}
            onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; } }}
          >
            {loading ? `⏳ ${loadingMessage}` : '🚀 Đăng nhập'}
          </button>
        </form>
      )}

      {activeTab === 'register' && (
        <form onSubmit={handleRegister}>
          {error && (
            <div style={{ background: 'rgba(244, 67, 54, 0.15)', border: '1px solid rgba(244, 67, 54, 0.4)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#ff6b6b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#cccccc', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Tên đăng nhập</label>
            <input
              ref={registerUsernameRef}
              type="text"
              value={registerForm.username}
              onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); registerEmailRef.current?.focus(); } }}
              style={{ width: '100%', padding: '15px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '1rem', transition: 'all 0.3s ease' }}
              placeholder="Chọn tên đăng nhập"
              onFocus={(e) => { e.target.style.borderColor = '#4ecdc4'; e.target.style.boxShadow = '0 0 0 2px rgba(78, 205, 196, 0.2)'; e.target.style.background = 'rgba(255, 255, 255, 0.08)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.05)'; }}
              disabled={loading}
              required
              autoFocus
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#cccccc', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Email</label>
            <input
              ref={registerEmailRef}
              type="email"
              value={registerForm.email}
              onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); registerPasswordRef.current?.focus(); } }}
              style={{ width: '100%', padding: '15px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '1rem', transition: 'all 0.3s ease' }}
              placeholder="Nhập địa chỉ email"
              onFocus={(e) => { e.target.style.borderColor = '#4ecdc4'; e.target.style.boxShadow = '0 0 0 2px rgba(78, 205, 196, 0.2)'; e.target.style.background = 'rgba(255, 255, 255, 0.08)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.05)'; }}
              disabled={loading}
              required
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#cccccc', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Mật khẩu</label>
            <input
              ref={registerPasswordRef}
              type="password"
              value={registerForm.password}
              onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); registerConfirmPasswordRef.current?.focus(); } }}
              style={{ width: '100%', padding: '15px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '1rem', transition: 'all 0.3s ease' }}
              placeholder="Tạo mật khẩu mạnh (tối thiểu 6 ký tự)"
              onFocus={(e) => { e.target.style.borderColor = '#4ecdc4'; e.target.style.boxShadow = '0 0 0 2px rgba(78, 205, 196, 0.2)'; e.target.style.background = 'rgba(255, 255, 255, 0.08)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.05)'; }}
              disabled={loading}
              required
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#cccccc', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Xác nhận mật khẩu</label>
            <input
              ref={registerConfirmPasswordRef}
              type="password"
              value={registerForm.confirmPassword}
              onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
              style={{ width: '100%', padding: '15px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '1rem', transition: 'all 0.3s ease' }}
              placeholder="Nhập lại mật khẩu"
              onFocus={(e) => { e.target.style.borderColor = '#4ecdc4'; e.target.style.boxShadow = '0 0 0 2px rgba(78, 205, 196, 0.2)'; e.target.style.background = 'rgba(255, 255, 255, 0.08)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255, 255, 255, 0.05)'; }}
              disabled={loading}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '15px 30px', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease', textTransform: 'uppercase', letterSpacing: '1px', background: loading ? 'rgba(100, 100, 100, 0.5)' : 'linear-gradient(45deg, #ff6b6b, #4ecdc4)', color: 'white', marginBottom: '15px', width: '100%', position: 'relative', overflow: 'hidden', opacity: loading ? 0.6 : 1 }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(255, 107, 107, 0.3)'; } }}
            onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; } }}
          >
            {loading ? `⏳ ${loadingMessage}` : '✨ Đăng ký ngay'}
          </button>
        </form>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '24px 0', color: '#888' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>HOẶC</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
      </div>

      <button
        onClick={playAsGuest}
        disabled={loading}
        style={{ padding: '15px 30px', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease', textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', width: '100%', marginBottom: '20px', opacity: loading ? 0.5 : 1 }}
        onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
        onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; } }}
      >
        🎮 Chơi với tài khoản khách
      </button>

      <div style={{ background: 'rgba(255, 193, 7, 0.1)', border: '1px solid rgba(255, 193, 7, 0.3)', borderRadius: '8px', padding: '15px', fontSize: '0.9rem', color: '#ffc107', marginBottom: '20px' }}>
        <span style={{ marginRight: '8px' }}>ℹ️</span>
        <strong>Chế độ khách:</strong> Bạn sẽ chỉ có thể chơi đơn và không thể lưu tiến trình hoặc tham gia các chế độ nhiều người chơi.
      </div>
    </div>
  );
};

export default React.memo(AuthForm);
