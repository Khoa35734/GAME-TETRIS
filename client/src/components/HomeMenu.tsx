import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authService, type AuthResponse } from "../services/authService";
import SettingsPage from './SettingsPage';
import FriendsManager from './FriendsManager';
import ConnectionDebug from './ConnectionDebug'; // Debug tool
import ProfileModal from './ProfileModal'; // Profile modal
import socket from '../socket'; // Import socket để gửi authentication

interface User {
  username: string;
  email?: string;
  isGuest: boolean;
  accountId: number; // Thêm accountId để định danh duy nhất
}

interface GameModeProps {
  icon: string;
  title: string;
  description: string;
  locked?: boolean;
  lockedReason?: string;
  onClick?: () => void;
}

const HomeMenu: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const s = localStorage.getItem('tetris:user');
      return s ? (JSON.parse(s) as User) : null;
    } catch { return null; }
  });
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [showGameModes, setShowGameModes] = useState<boolean>(() => !!localStorage.getItem('tetris:user'));
  const [showSettings, setShowSettings] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showDebug, setShowDebug] = useState(false); // Debug panel
  const [showProfile, setShowProfile] = useState(false); // Profile modal
  const [leaderboardSort, setLeaderboardSort] = useState<'level' | 'stars'>('level');

  // Background music
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  // Player stats (mặc định)
  const [playerStats] = useState(() => {
    try {
      const saved = localStorage.getItem('tetris:playerStats');
      return saved ? JSON.parse(saved) : { level: 1, stars: 0 };
    } catch {
      return { level: 1, stars: 0 };
    }
  });

  // Guest restrictions
  const isGuest = currentUser?.isGuest ?? false;
  const guestLockReason = isGuest ? "Vui lòng đăng nhập tài khoản để vào chế độ này" : undefined;

  // Mock leaderboard data (sau này sẽ lấy từ server)
  const [leaderboardData] = useState([
    { username: 'ProGamer123', level: 22, stars: 1500, rank: 1 },
    { username: 'TetrisMaster', level: 20, stars: 1350, rank: 2 },
    { username: 'BlockBuster', level: 19, stars: 1200, rank: 3 },
    { username: 'SpeedRunner', level: 18, stars: 1100, rank: 4 },
    { username: 'ComboKing', level: 17, stars: 980, rank: 5 },
    { username: 'PuzzlePro', level: 16, stars: 850, rank: 6 },
    { username: 'LineClearer', level: 15, stars: 720, rank: 7 },
    { username: 'TetrisAce', level: 14, stars: 650, rank: 8 },
    { username: 'BlockMaster', level: 13, stars: 580, rank: 9 },
    { username: 'GridWarrior', level: 12, stars: 500, rank: 10 },
  ]);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState<string>("");

  // Refs for form inputs (for Tab navigation)
  const loginEmailRef = useRef<HTMLInputElement>(null);
  const loginPasswordRef = useRef<HTMLInputElement>(null);
  const registerUsernameRef = useRef<HTMLInputElement>(null);
  const registerEmailRef = useRef<HTMLInputElement>(null);
  const registerPasswordRef = useRef<HTMLInputElement>(null);
  const registerConfirmPasswordRef = useRef<HTMLInputElement>(null);

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!loginForm.email || !loginForm.password) {
      setError("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    setLoading(true);
    setLoadingMessage("Đang đăng nhập...");

    try {
      const result: AuthResponse = await authService.login(loginForm.email, loginForm.password);
      
      if (result.success && result.user) {
        const user: User = {
          username: result.user.username,
          email: result.user.email,
          isGuest: false,
          accountId: result.user.accountId,
        };
        setCurrentUser(user);
        setShowGameModes(true);
        setLoginForm({ email: "", password: "" });

        // [THÊM MỚI] Gửi authentication đến server để track online status
        console.log('🔐 [Login] Authenticating socket with accountId:', result.user.accountId);
        socket.emit('user:authenticate', result.user.accountId);
      } else {
        setError(result.message || "Đăng nhập thất bại!");
      }
    } catch (err) {
      setError("Lỗi kết nối! Vui lòng kiểm tra server đang chạy.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  // Handle register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const { username, email, password, confirmPassword } = registerForm;

    if (!username || !email || !password || !confirmPassword) {
      setError("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự!");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Email không hợp lệ!");
      return;
    }

    setLoading(true);
    setLoadingMessage("Đang tạo tài khoản...");

    try {
      const result: AuthResponse = await authService.register(username, email, password);
      
      if (result.success && result.user) {
        const user: User = {
          username: result.user.username,
          email: result.user.email,
          isGuest: false,
          accountId: result.user.accountId,
        };
        setCurrentUser(user);
        setShowGameModes(true);
        setRegisterForm({ username: "", email: "", password: "", confirmPassword: "" });

        // [THÊM MỚI] Gửi authentication đến server để track online status
        console.log('🔐 [Register] Authenticating socket with accountId:', result.user.accountId);
        socket.emit('user:authenticate', result.user.accountId);
      } else {
        setError(result.message || "Đăng ký thất bại!");
      }
    } catch (err) {
      setError("Lỗi kết nối! Vui lòng kiểm tra server đang chạy.");
      console.error("Register error:", err);
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  // Play as guest
  const playAsGuest = () => {
    const guestId = "Guest_" + Math.random().toString(36).substr(2, 9);
    // Guest cũng cần accountId (số âm để phân biệt với tk thật)
    const accountId = -Math.floor(Math.random() * 90000) - 10000; // -10000 đến -99999
    
    const user: User = {
      username: guestId,
      isGuest: true,
      accountId: accountId,
    };
    setCurrentUser(user);
    setShowGameModes(true);
    try { localStorage.setItem('tetris:user', JSON.stringify(user)); } catch {}
  };

  // Logout
  const logout = () => {
    setCurrentUser(null);
    setShowGameModes(false);
    setLoginForm({ email: "", password: "" });
    setRegisterForm({ username: "", email: "", password: "", confirmPassword: "" });
    setActiveTab("login");
    try { localStorage.removeItem('tetris:user'); } catch {}
  };

  // Start single player
  const startSinglePlayer = () => {
    if (currentUser) {
      alert(
        `🎮 Bắt đầu chế độ chơi đơn!\nNgười chơi: ${currentUser.username}\nChế độ: ${
          currentUser.isGuest ? "Khách" : "Đã đăng nhập"
        }`
      );
      navigate("/single/settings");
    }
  };

  // Legal functions (using console.log instead of alert for better accessibility)
  const showTerms = () => {
    console.log(
      "📋 Điều khoản sử dụng:\n\n- Tôn trọng người chơi khác\n- Không sử dụng cheat/hack\n- Tuân thủ quy tắc fair play\n- Không spam hoặc harassment"
    );
  };

  const showPrivacy = () => {
    console.log(
      "🔒 Chính sách bảo mật:\n\n- Thông tin cá nhân được bảo vệ\n- Không chia sẻ dữ liệu với bên thứ ba\n- Cookie chỉ dùng cho chức năng cần thiết\n- Quyền xóa tài khoản bất kỳ lúc nào"
    );
  };

  const showRules = () => {
    console.log(
      "📖 Quy tắc game:\n\n- Không toxic chat\n- Không disconnect cố ý\n- Tôn trọng đối thủ\n- Báo cáo hành vi tiêu cực\n- Chơi fair và vui vẻ"
    );
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !currentUser && !loading && activeTab === "login") {
        const form = document.getElementById("loginForm") as HTMLFormElement;
        if (form) form.dispatchEvent(new Event("submit", { bubbles: true }));
      }
      if (e.key === "Escape" && currentUser) {
        logout();
      }
      // Toggle debug panel with Ctrl+D
      if (e.ctrlKey && e.key === "d") {
        e.preventDefault();
        setShowDebug((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentUser, activeTab, loading]);

  // Background music effect
  useEffect(() => {
    // Initialize audio
    if (!bgMusicRef.current) {
      const audio = new Audio('/sound/bg.mp3');
      audio.loop = true;
      audio.volume = 0.3; // Set volume to 30%
      bgMusicRef.current = audio;
    }

    // Auto-play music on mount (with user interaction fallback)
    const playMusic = async () => {
      try {
        await bgMusicRef.current?.play();
        setIsMusicPlaying(true);
      } catch (error) {
        console.log('Autoplay prevented, waiting for user interaction');
        // Add click listener to start music on first user interaction
        const startMusic = async () => {
          try {
            await bgMusicRef.current?.play();
            setIsMusicPlaying(true);
            document.removeEventListener('click', startMusic);
          } catch (e) {
            console.error('Failed to play music:', e);
          }
        };
        document.addEventListener('click', startMusic, { once: true });
      }
    };

    playMusic();

    // Cleanup: pause music when component unmounts
    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current.currentTime = 0;
      }
    };
  }, []);

  // Toggle music function
  const toggleMusic = () => {
    if (bgMusicRef.current) {
      if (isMusicPlaying) {
        bgMusicRef.current.pause();
        setIsMusicPlaying(false);
      } else {
        bgMusicRef.current.play();
        setIsMusicPlaying(true);
      }
    }
  };

  // Game Mode Component
  const GameModeCard: React.FC<GameModeProps> = ({ icon, title, description, locked, lockedReason, onClick }) => (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "12px",
        padding: "25px",
        textAlign: "center",
        cursor: locked ? "not-allowed" : "pointer",
        transition: "all 0.3s ease",
        opacity: locked ? 0.5 : 1,
        position: "relative",
      }}
      onClick={!locked ? onClick : undefined}
      onMouseEnter={(e) => {
        if (!locked) {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
          e.currentTarget.style.transform = "translateY(-5px)";
          e.currentTarget.style.boxShadow = "0 15px 30px rgba(0, 0, 0, 0.2)";
        }
      }}
      onMouseLeave={(e) => {
        if (!locked) {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }
      }}
    >
      {locked && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            fontSize: "1.2rem",
          }}
        >
          🔒
        </div>
      )}
      <span
        style={{
          fontSize: "2rem",
          marginBottom: "15px",
          display: "block",
        }}
      >
        {icon}
      </span>
      <div
        style={{
          fontSize: "1.1rem",
          fontWeight: "bold",
          marginBottom: "8px",
          color: "#ffffff",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: "0.9rem",
          color: "#cccccc",
          lineHeight: "1.4",
        }}
      >
        {description}
      </div>
      {locked && lockedReason && (
        <div
          style={{
            marginTop: "12px",
            fontSize: "0.85rem",
            color: "#ff6b6b",
            fontWeight: 500,
          }}
        >
          {lockedReason}
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: `url('/img/bg3.gif') center/cover, #000`, // nền đen
        color: "#ffffff",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      {/* Animated Background (ẩn để tránh cảm giác không full nền đen) */}
      {/* Intentionally removed for clean black background */}

      {/* Top user bar - Player Info & Settings */}
      {currentUser && (
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
          {/* Left side - Player Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Avatar */}
            <div
              onClick={() => setShowProfile(true)}
              style={{
                width: 50, height: 50,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#fff',
                border: '2px solid #4ecdc4',
                boxShadow: '0 0 15px rgba(78, 205, 196, 0.5)',
                cursor: 'pointer',
                transition: 'all 0.2s'
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

            {/* Player Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {/* Username + Account ID */}
              <div style={{ 
                color: '#fff', 
                fontWeight: 700, 
                fontSize: '1.1rem',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                {currentUser.username}
                {currentUser.isGuest && (
                  <span style={{ 
                    marginLeft: '8px', 
                    fontSize: '0.75rem', 
                    color: '#ffc107',
                    background: 'rgba(255, 193, 7, 0.2)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 193, 7, 0.5)'
                  }}>
                    Khách
                  </span>
                )}
              </div>

              {/* Account ID - Hiển thị cho tất cả */}
              <div style={{ 
                fontSize: '0.85rem', 
                color: '#888',
                fontWeight: 500
              }}>
                ID: #{currentUser.accountId}
              </div>

              {/* Level & Stars - Chỉ hiện khi KHÔNG phải khách */}
              {!currentUser.isGuest && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Level */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    background: 'rgba(78, 205, 196, 0.15)',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(78, 205, 196, 0.3)'
                  }}>
                    <span style={{ fontSize: '0.9rem' }}>🎮</span>
                    <span style={{ 
                      color: '#4ecdc4', 
                      fontWeight: 600,
                      fontSize: '0.9rem'
                    }}>
                      Level {playerStats.level}
                    </span>
                  </div>

                  {/* Stars */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    background: 'rgba(255, 193, 7, 0.15)',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 193, 7, 0.3)'
                  }}>
                    <span style={{ fontSize: '0.9rem' }}>⭐</span>
                    <span style={{ 
                      color: '#ffc107', 
                      fontWeight: 600,
                      fontSize: '0.9rem'
                    }}>
                      {playerStats.stars}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Music, Leaderboard, Settings & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Music Toggle Button */}
            <button
              onClick={toggleMusic}
              style={{
                background: isMusicPlaying 
                  ? 'rgba(78, 205, 196, 0.15)' 
                  : 'rgba(255, 107, 107, 0.15)',
                border: isMusicPlaying
                  ? '1px solid rgba(78, 205, 196, 0.4)'
                  : '1px solid rgba(255, 107, 107, 0.4)',
                color: isMusicPlaying ? '#4ecdc4' : '#ff6b6b',
                padding: '10px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                transition: 'all 0.3s ease'
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
                if (isMusicPlaying) {
                  e.currentTarget.style.background = 'rgba(78, 205, 196, 0.15)';
                } else {
                  e.currentTarget.style.background = 'rgba(255, 107, 107, 0.15)';
                }
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {isMusicPlaying ? '🎵 Nhạc' : '🔇 Nhạc'}
            </button>

            {/* Friends Button */}
            <button
              onClick={() => setShowFriends(true)}
              style={{
                background: 'rgba(156, 39, 176, 0.15)',
                border: '1px solid rgba(156, 39, 176, 0.4)',
                color: '#ba68c8',
                padding: '10px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(156, 39, 176, 0.25)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(156, 39, 176, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(156, 39, 176, 0.15)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              👥 Bạn bè
            </button>

            {/* Leaderboard Button */}
            <button
              onClick={() => setShowLeaderboard(true)}
              style={{
                background: 'rgba(255, 193, 7, 0.15)',
                border: '1px solid rgba(255, 193, 7, 0.4)',
                color: '#ffc107',
                padding: '10px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 193, 7, 0.25)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 193, 7, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 193, 7, 0.15)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              🏆 Bảng xếp hạng
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#fff',
                padding: '10px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(78, 205, 196, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              ⚙️ Cài đặt
            </button>

            {/* Logout Button */}
            <button
              onClick={logout}
              style={{
                background: 'rgba(244, 67, 54, 0.2)',
                border: '1px solid rgba(244, 67, 54, 0.5)',
                color: '#ff6b6b',
                padding: '10px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 600,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(244, 67, 54, 0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(244, 67, 54, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(244, 67, 54, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "20px",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: !showGameModes ? "center" : undefined,
          // tránh đè lên thanh người dùng
          marginTop: currentUser ? 70 : 0,
        }}
      >
        {/* Logo (ẩn khi ở màn đăng nhập để canh giữa tuyệt đối) */}
        {showGameModes && (
          <div
            style={{
              textAlign: "center",
              marginBottom: "40px",
              animation: "pulse 2s infinite",
            }}
          >
            <img
              src="/img/logo.png" // Replace with the actual path to your logo file
              alt="TETR.IO Logo"
              style={{
                width: "800px",
                height: "auto",
                filter: "drop-shadow(0 0 10px #4ecdc4) drop-shadow(0 0 20px #ff6b6b)",
                transition: "transform 0.3s ease, filter 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.1)";
                e.currentTarget.style.filter =
                  "drop-shadow(0 0 15px #4ecdc4) drop-shadow(0 0 30px #ff6b6b)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.filter =
                  "drop-shadow(0 0 10px #4ecdc4) drop-shadow(0 0 20px #ff6b6b)";
              }}
            />
          </div>
        )}



        {/* User status moved to top bar */}

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // đảm bảo khối đăng nhập luôn ở chính giữa viewport khi chưa vào game modes
            minHeight: !showGameModes ? "calc(100vh - 40px)" : undefined,
          }}
        >
          <div
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "15px",
              padding: "40px",
              maxWidth: "600px",
              width: "100%",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3)",
              animation: "slideUp 1s ease-out 0.3s both",
            }}
          >
            {!showGameModes ? (
              // Authentication Section
              <div>
                <h1
                  style={{
                    fontSize: "2rem",
                    fontWeight: "bold",
                    marginBottom: "20px",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    textAlign: "center",
                    fontFamily: "'Press Start 2P', cursive",
                    color: "#e1462bff",
                    textShadow: "0 0 10px #712315ff, 0 0 20px #ff6b6b",
                    animation: "pulse 2s infinite",
                  }}
                >
                  Welcome to D.TETRIS
                </h1>
                <p
                  style={{
                    color: "#cccccc",
                    lineHeight: "1.6",
                    marginBottom: "30px",
                    fontSize: "1rem",
                  }}
                >
                  Puzzle together in this modern yet familiar online stacker. Play against friends and
                  foes all over the world, or claim a spot on the leaderboards - the stacker future is
                  yours!
                </p>

                {/* Auth Tabs */}
                <div
                  style={{
                    display: "flex",
                    marginBottom: "30px",
                    background: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "8px",
                    padding: "4px",
                  }}
                >
                  <button
                    style={{
                      flex: 1,
                      padding: "12px 20px",
                      background: activeTab === "login" ? "rgba(255, 255, 255, 0.1)" : "transparent",
                      border: "none",
                      color: activeTab === "login" ? "#ffffff" : "#888888",
                      cursor: "pointer",
                      borderRadius: "6px",
                      transition: "all 0.3s ease",
                      fontSize: "0.95rem",
                      fontWeight: 500,
                      boxShadow: activeTab === "login" ? "0 2px 8px rgba(0, 0, 0, 0.2)" : "none",
                    }}
                    onClick={() => {
                      setActiveTab("login");
                      setError("");
                    }}
                  >
                    Đăng nhập
                  </button>
                  <button
                    style={{
                      flex: 1,
                      padding: "12px 20px",
                      background:
                        activeTab === "register" ? "rgba(255, 255, 255, 0.1)" : "transparent",
                      border: "none",
                      color: activeTab === "register" ? "#ffffff" : "#888888",
                      cursor: "pointer",
                      borderRadius: "6px",
                      transition: "all 0.3s ease",
                      fontSize: "0.95rem",
                      fontWeight: 500,
                      boxShadow: activeTab === "register" ? "0 2px 8px rgba(0, 0, 0, 0.2)" : "none",
                    }}
                    onClick={() => {
                      setActiveTab("register");
                      setError("");
                    }}
                  >
                    Đăng ký
                  </button>
                </div>

                {/* Login Form */}
                {activeTab === "login" && (
                  <form id="loginForm" onSubmit={handleLogin}>
                    {/* Error Display */}
                    {error && (
                      <div
                        style={{
                          background: "rgba(244, 67, 54, 0.15)",
                          border: "1px solid rgba(244, 67, 54, 0.4)",
                          borderRadius: "8px",
                          padding: "12px 16px",
                          marginBottom: "20px",
                          color: "#ff6b6b",
                          fontSize: "0.9rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}
                      >
                        <span>⚠️</span>
                        <span>{error}</span>
                      </div>
                    )}

                    <div style={{ marginBottom: "20px" }}>
                      <label
                        style={{
                          display: "block",
                          color: "#cccccc",
                          marginBottom: "8px",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                        }}
                      >
                        Email
                      </label>
                      <input
                        ref={loginEmailRef}
                        type="email"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            loginPasswordRef.current?.focus();
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "15px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "8px",
                          color: "#ffffff",
                          fontSize: "1rem",
                          transition: "all 0.3s ease",
                        }}
                        placeholder="Nhập email của bạn"
                        onFocus={(e) => {
                          e.target.style.borderColor = "#4ecdc4";
                          e.target.style.boxShadow = "0 0 0 2px rgba(78, 205, 196, 0.2)";
                          e.target.style.background = "rgba(255, 255, 255, 0.08)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                          e.target.style.boxShadow = "none";
                          e.target.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                        disabled={loading}
                        required
                        autoFocus
                      />
                    </div>
                    <div style={{ marginBottom: "20px" }}>
                      <label
                        style={{
                          display: "block",
                          color: "#cccccc",
                          marginBottom: "8px",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                        }}
                      >
                        Mật khẩu
                      </label>
                      <input
                        ref={loginPasswordRef}
                        type="password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "15px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "8px",
                          color: "#ffffff",
                          fontSize: "1rem",
                          transition: "all 0.3s ease",
                        }}
                        placeholder="Nhập mật khẩu"
                        onFocus={(e) => {
                          e.target.style.borderColor = "#4ecdc4";
                          e.target.style.boxShadow = "0 0 0 2px rgba(78, 205, 196, 0.2)";
                          e.target.style.background = "rgba(255, 255, 255, 0.08)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                          e.target.style.boxShadow = "none";
                          e.target.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                        disabled={loading}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        padding: "15px 30px",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "1rem",
                        fontWeight: 600,
                        cursor: loading ? "not-allowed" : "pointer",
                        transition: "all 0.3s ease",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        background: loading ? "rgba(100, 100, 100, 0.5)" : "linear-gradient(45deg, #ff6b6b, #4ecdc4)",
                        color: "white",
                        marginBottom: "15px",
                        width: "100%",
                        position: "relative",
                        overflow: "hidden",
                        opacity: loading ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 10px 25px rgba(255, 107, 107, 0.3)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }
                      }}
                    >
                      {loading ? "⏳ " + loadingMessage : "🚀 Đăng nhập"}
                    </button>
                  </form>
                )}

                {/* Register Form */}
                {activeTab === "register" && (
                  <form onSubmit={handleRegister}>
                    {/* Error Display */}
                    {error && (
                      <div
                        style={{
                          background: "rgba(244, 67, 54, 0.15)",
                          border: "1px solid rgba(244, 67, 54, 0.4)",
                          borderRadius: "8px",
                          padding: "12px 16px",
                          marginBottom: "20px",
                          color: "#ff6b6b",
                          fontSize: "0.9rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}
                      >
                        <span>⚠️</span>
                        <span>{error}</span>
                      </div>
                    )}

                    <div style={{ marginBottom: "20px" }}>
                      <label
                        style={{
                          display: "block",
                          color: "#cccccc",
                          marginBottom: "8px",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                        }}
                      >
                        Tên đăng nhập
                      </label>
                      <input
                        ref={registerUsernameRef}
                        type="text"
                        value={registerForm.username}
                        onChange={(e) =>
                          setRegisterForm({ ...registerForm, username: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            registerEmailRef.current?.focus();
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "15px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "8px",
                          color: "#ffffff",
                          fontSize: "1rem",
                          transition: "all 0.3s ease",
                        }}
                        placeholder="Chọn tên đăng nhập"
                        onFocus={(e) => {
                          e.target.style.borderColor = "#4ecdc4";
                          e.target.style.boxShadow = "0 0 0 2px rgba(78, 205, 196, 0.2)";
                          e.target.style.background = "rgba(255, 255, 255, 0.08)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                          e.target.style.boxShadow = "none";
                          e.target.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                        disabled={loading}
                        required
                        autoFocus
                      />
                    </div>
                    <div style={{ marginBottom: "20px" }}>
                      <label
                        style={{
                          display: "block",
                          color: "#cccccc",
                          marginBottom: "8px",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                        }}
                      >
                        Email
                      </label>
                      <input
                        ref={registerEmailRef}
                        type="email"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            registerPasswordRef.current?.focus();
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "15px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "8px",
                          color: "#ffffff",
                          fontSize: "1rem",
                          transition: "all 0.3s ease",
                        }}
                        placeholder="Nhập địa chỉ email"
                        onFocus={(e) => {
                          e.target.style.borderColor = "#4ecdc4";
                          e.target.style.boxShadow = "0 0 0 2px rgba(78, 205, 196, 0.2)";
                          e.target.style.background = "rgba(255, 255, 255, 0.08)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                          e.target.style.boxShadow = "none";
                          e.target.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                        disabled={loading}
                        required
                      />
                    </div>
                    <div style={{ marginBottom: "20px" }}>
                      <label
                        style={{
                          display: "block",
                          color: "#cccccc",
                          marginBottom: "8px",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                        }}
                      >
                        Mật khẩu
                      </label>
                      <input
                        ref={registerPasswordRef}
                        type="password"
                        value={registerForm.password}
                        onChange={(e) =>
                          setRegisterForm({ ...registerForm, password: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            registerConfirmPasswordRef.current?.focus();
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "15px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "8px",
                          color: "#ffffff",
                          fontSize: "1rem",
                          transition: "all 0.3s ease",
                        }}
                        placeholder="Tạo mật khẩu mạnh (tối thiểu 6 ký tự)"
                        onFocus={(e) => {
                          e.target.style.borderColor = "#4ecdc4";
                          e.target.style.boxShadow = "0 0 0 2px rgba(78, 205, 196, 0.2)";
                          e.target.style.background = "rgba(255, 255, 255, 0.08)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                          e.target.style.boxShadow = "none";
                          e.target.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                        disabled={loading}
                        required
                      />
                    </div>
                    <div style={{ marginBottom: "20px" }}>
                      <label
                        style={{
                          display: "block",
                          color: "#cccccc",
                          marginBottom: "8px",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                        }}
                      >
                        Xác nhận mật khẩu
                      </label>
                      <input
                        ref={registerConfirmPasswordRef}
                        type="password"
                        value={registerForm.confirmPassword}
                        onChange={(e) =>
                          setRegisterForm({ ...registerForm, confirmPassword: e.target.value })
                        }
                        style={{
                          width: "100%",
                          padding: "15px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "8px",
                          color: "#ffffff",
                          fontSize: "1rem",
                          transition: "all 0.3s ease",
                        }}
                        placeholder="Nhập lại mật khẩu"
                        onFocus={(e) => {
                          e.target.style.borderColor = "#4ecdc4";
                          e.target.style.boxShadow = "0 0 0 2px rgba(78, 205, 196, 0.2)";
                          e.target.style.background = "rgba(255, 255, 255, 0.08)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                          e.target.style.boxShadow = "none";
                          e.target.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                        disabled={loading}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        padding: "15px 30px",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "1rem",
                        fontWeight: 600,
                        cursor: loading ? "not-allowed" : "pointer",
                        transition: "all 0.3s ease",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        background: loading ? "rgba(100, 100, 100, 0.5)" : "linear-gradient(45deg, #ff6b6b, #4ecdc4)",
                        color: "white",
                        marginBottom: "15px",
                        width: "100%",
                        position: "relative",
                        overflow: "hidden",
                        opacity: loading ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 10px 25px rgba(255, 107, 107, 0.3)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }
                      }}
                    >
                      {loading ? "⏳ " + loadingMessage : "✨ Đăng ký ngay"}
                    </button>
                  </form>
                )}

                {/* Divider */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  margin: '24px 0',
                  color: '#888'
                }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>HOẶC</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
                </div>

                {/* Guest Play Button */}
                <button
                  onClick={playAsGuest}
                  disabled={loading}
                  style={{
                    padding: "15px 30px",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "all 0.3s ease",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    width: "100%",
                    marginBottom: "20px",
                    opacity: loading ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }
                  }}
                >
                  🎮 Chơi với tài khoản khách
                </button>

                {/* Guest Mode Info */}
                <div
                  style={{
                    background: "rgba(255, 193, 7, 0.1)",
                    border: "1px solid rgba(255, 193, 7, 0.3)",
                    borderRadius: "8px",
                    padding: "15px",
                    fontSize: "0.9rem",
                    color: "#ffc107",
                    marginBottom: "20px",
                  }}
                >
                  <span style={{ marginRight: "8px" }}>ℹ️</span>
                  <strong>Chế độ khách:</strong> Bạn sẽ chỉ có thể chơi đơn và không thể lưu tiến trình
                  hoặc tham gia các chế độ nhiều người chơi.
                </div>

                {/* Legal Links */}
                <div
                  style={{
                    textAlign: "center",
                    fontSize: "0.8rem",
                    color: "#888888",
                  }}
                >
                  Bằng việc tham gia, bạn đồng ý với{" "}
                  <button
                    onClick={showTerms}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#4ecdc4",
                      textDecoration: "none",
                      cursor: "pointer",
                      margin: "0 5px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = "underline";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = "none";
                    }}
                  >
                    Điều khoản sử dụng
                  </button>
                  ,{" "}
                  <button
                    onClick={showPrivacy}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#4ecdc4",
                      textDecoration: "none",
                      cursor: "pointer",
                      margin: "0 5px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = "underline";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = "none";
                    }}
                  >
                    Chính sách bảo mật
                  </button>{" "}
                  và{" "}
                  <button
                    onClick={showRules}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#4ecdc4",
                      textDecoration: "none",
                      cursor: "pointer",
                      margin: "0 5px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = "underline";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = "none";
                    }}
                  >
                    Quy tắc
                  </button>
                </div>
              </div>
            ) : (
              // Game Mode Selection
              <div>
                <h1
                  style={{
                    fontSize: "3rem",
                    fontWeight: "bold",
                    marginBottom: "30px",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    textAlign: "center",
                    fontFamily: "'SVN-Determination Sans', 'Press Start 2P', cursive",
                    color: "#eb2614ff",
                    textShadow: "0 0 15px #c91e0fff, 0 0 30px #ff6b6b",
                    animation: "pulse 2s infinite",
                  }}
                >
                  Chọn chế độ chơi
                </h1>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "20px",
                  }}
                >
                  <GameModeCard
                    icon="🎯"
                    title="Chơi đơn"
                    description="Thử thách bản thân với chế độ Marathon, Sprint hoặc Ultra"
                    onClick={startSinglePlayer}
                  />
                  <GameModeCard
                    icon="⚔️"
                    title="Đối kháng"
                    description="Chơi 1v1 với người chơi khác trực tuyến"
                    locked={isGuest}
                    lockedReason={guestLockReason}
                    onClick={() => navigate('/online/casual')}
                  />
                  <GameModeCard
                    icon="👥"
                    title="Phòng tùy chỉnh"
                    description="Tạo hoặc tham gia phòng chơi với bạn bè"
                    locked={isGuest}
                    lockedReason={guestLockReason}
                    onClick={() => {
                      if (currentUser?.isGuest) return;
                      navigate('/online');
                    }}
                  />
                  <GameModeCard
                    icon="🏆"
                    title="Xếp hạng"
                    description="Thi đấu và leo rank trong hệ thống xếp hạng"
                    locked={isGuest}
                    lockedReason={guestLockReason}
                    onClick={() => navigate('/online/ranked')}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal/Page */}
      {showSettings && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(10px)',
            zIndex: 2000,
            overflowY: 'auto'
          }}
        >
          <SettingsPage onBack={() => setShowSettings(false)} />
        </div>
      )}

      {/* Friends Sidebar - Slides from right */}
      {showFriends && <FriendsManager onBack={() => setShowFriends(false)} />}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease-out'
          }}
          onClick={() => setShowLeaderboard(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: 16,
              padding: '32px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(78, 205, 196, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '2px solid rgba(78, 205, 196, 0.3)'
            }}>
              <h2 style={{ 
                margin: 0, 
                color: '#4ecdc4',
                fontSize: '1.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                🏆 Bảng xếp hạng
              </h2>
              <button
                onClick={() => setShowLeaderboard(false)}
                style={{
                  background: 'rgba(244, 67, 54, 0.2)',
                  border: '1px solid rgba(244, 67, 54, 0.5)',
                  color: '#ff6b6b',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(244, 67, 54, 0.4)';
                  e.currentTarget.style.transform = 'rotate(90deg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(244, 67, 54, 0.2)';
                  e.currentTarget.style.transform = 'rotate(0)';
                }}
              >
                ✕
              </button>
            </div>

            {/* Sort Tabs */}
            <div style={{ 
              display: 'flex', 
              gap: '12px',
              marginBottom: '24px'
            }}>
              <button
                onClick={() => setLeaderboardSort('level')}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: leaderboardSort === 'level' 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'rgba(255, 255, 255, 0.08)',
                  border: leaderboardSort === 'level'
                    ? '2px solid rgba(102, 126, 234, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (leaderboardSort !== 'level') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (leaderboardSort !== 'level') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }
                }}
              >
                📊 Xếp theo Level
              </button>
              <button
                onClick={() => setLeaderboardSort('stars')}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: leaderboardSort === 'stars'
                    ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                    : 'rgba(255, 255, 255, 0.08)',
                  border: leaderboardSort === 'stars'
                    ? '2px solid rgba(240, 147, 251, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (leaderboardSort !== 'stars') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (leaderboardSort !== 'stars') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }
                }}
              >
                ⭐ Xếp theo Stars
              </button>
            </div>

            {/* Leaderboard Table */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 100px 100px',
                padding: '14px 20px',
                background: 'rgba(78, 205, 196, 0.15)',
                borderBottom: '1px solid rgba(78, 205, 196, 0.3)',
                fontWeight: 700,
                fontSize: '0.85rem',
                color: '#4ecdc4',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                <div>Hạng</div>
                <div>Người chơi</div>
                <div>Level</div>
                <div>Stars</div>
              </div>

              {/* Table Rows */}
              {[...leaderboardData]
                .sort((a, b) => {
                  if (leaderboardSort === 'level') {
                    return b.level - a.level || b.stars - a.stars;
                  } else {
                    return b.stars - a.stars || b.level - a.level;
                  }
                })
                .map((player, index) => {
                  const isCurrentUser = player.username === currentUser?.username;
                  const rank = index + 1;
                  const getMedalEmoji = (rank: number) => {
                    if (rank === 1) return '🥇';
                    if (rank === 2) return '🥈';
                    if (rank === 3) return '🥉';
                    return `#${rank}`;
                  };

                  return (
                    <div
                      key={player.username}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '60px 1fr 100px 100px',
                        padding: '16px 20px',
                        borderBottom: index < leaderboardData.length - 1 
                          ? '1px solid rgba(255, 255, 255, 0.08)' 
                          : 'none',
                        background: isCurrentUser 
                          ? 'rgba(78, 205, 196, 0.15)'
                          : 'transparent',
                        transition: 'all 0.3s ease',
                        fontSize: '0.95rem'
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrentUser) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrentUser) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <div style={{ 
                        fontWeight: 700,
                        color: rank <= 3 ? '#ffc107' : '#888',
                        fontSize: rank <= 3 ? '1.1rem' : '0.95rem'
                      }}>
                        {getMedalEmoji(rank)}
                      </div>
                      <div style={{ 
                        fontWeight: isCurrentUser ? 700 : 500,
                        color: isCurrentUser ? '#4ecdc4' : '#fff'
                      }}>
                        {player.username}
                        {isCurrentUser && (
                          <span style={{ 
                            marginLeft: '8px', 
                            color: '#4ecdc4',
                            fontSize: '0.8rem'
                          }}>
                            (Bạn)
                          </span>
                        )}
                      </div>
                      <div style={{ 
                        fontWeight: 600,
                        color: '#9b59b6'
                      }}>
                        {player.level}
                      </div>
                      <div style={{ 
                        fontWeight: 600,
                        color: '#ffc107'
                      }}>
                        {player.stars}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* CSS Animation Styles */}
      <style>
        {`
          @font-face {
            font-family: 'SVN-Determination Sans';
            src: url('/Font/SVN-Determination-Sans.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
          }
          
          @keyframes gridMove {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
          }
          
          @keyframes fadeInDown {
            from {
              opacity: 0;
              transform: translateY(-30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(50px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          
          input::placeholder {
            color: #666666;
          }
          
          @media (max-width: 768px) {
            div[style*="justifyContent: space-around"] {
              flex-direction: column !important;
              gap: 30px !important;
              padding: 20px 0 !important;
            }
            
            div[style*="justifyContent: space-around"] > div > div:first-child {
              font-size: 2rem !important;
            }
            
            div[style*="maxWidth: 600px"] {
              padding: 30px 20px !important;
              margin: 20px !important;
            }
            
            h1[style*="fontSize: 2rem"] {
              font-size: 1.5rem !important;
            }
            
            div[style*="gridTemplateColumns: repeat(auto-fit, minmax(200px, 1fr))"] {
              grid-template-columns: 1fr !important;
            }
            
            div[style*="top: 20px; right: 20px"] {
              position: fixed !important;
              top: 10px !important;
              right: 10px !important;
              font-size: 0.8rem !important;
              padding: 8px 15px !important;
            }
          }
        `}
      </style>

      {/* Load gaming font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
        rel="stylesheet"
      />

      {/* Debug Panel (Ctrl+D to toggle) */}
      {showDebug && <ConnectionDebug onClose={() => setShowDebug(false)} />}
      
      {/* Profile Modal */}
      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  );
};

export default HomeMenu;
