import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface User {
  username: string;
  email?: string;
  isGuest: boolean;
}

interface GameModeProps {
  icon: string;
  title: string;
  description: string;
  locked?: boolean;
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

  // Stats state
  const [stats, setStats] = useState({
    totalPlayers: 0,
    gamesPlayed: 0,
    hoursPlayed: 0,
  });

  // Form states
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    animateStats();
  }, []);

  // Animate statistics with a single interval
  const animateStats = () => {
    const targets = {
      totalPlayers: 3,
      gamesPlayed: 6,
      hoursPlayed: 9,
    };

    const increments = {
      totalPlayers: targets.totalPlayers / 100,
      gamesPlayed: targets.gamesPlayed / 100,
      hoursPlayed: targets.hoursPlayed / 100,
    };

    let current = {
      totalPlayers: 0,
      gamesPlayed: 0,
      hoursPlayed: 0,
    };

    const timer = setInterval(() => {
      current = {
        totalPlayers: Math.min(current.totalPlayers + increments.totalPlayers, targets.totalPlayers),
        gamesPlayed: Math.min(current.gamesPlayed + increments.gamesPlayed, targets.gamesPlayed),
        hoursPlayed: Math.min(current.hoursPlayed + increments.hoursPlayed, targets.hoursPlayed),
      };

      setStats({
        totalPlayers: Math.floor(current.totalPlayers),
        gamesPlayed: Math.floor(current.gamesPlayed),
        hoursPlayed: Math.floor(current.hoursPlayed),
      });

      if (
        current.totalPlayers >= targets.totalPlayers &&
        current.gamesPlayed >= targets.gamesPlayed &&
        current.hoursPlayed >= targets.hoursPlayed
      ) {
        clearInterval(timer);
      }
    }, 20);
  };

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginForm.username || !loginForm.password) {
      alert("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    setLoading(true);
    setLoadingMessage("Đang đăng nhập...");

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      const user: User = {
        username: loginForm.username,
        email: loginForm.username.includes("@") ? loginForm.username : `${loginForm.username}@example.com`,
        isGuest: false,
      };
      setCurrentUser(user);
      setShowGameModes(true);
      setLoadingMessage("");
      try { localStorage.setItem('tetris:user', JSON.stringify(user)); } catch {}
    }, 1500);
  };

  // Handle register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const { username, email, password, confirmPassword } = registerForm;

    if (!username || !email || !password || !confirmPassword) {
      alert("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    if (password !== confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }

    if (password.length < 6) {
      alert("Mật khẩu phải có ít nhất 6 ký tự!");
      return;
    }

    setLoading(true);
    setLoadingMessage("Đang tạo tài khoản...");

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      const user: User = {
        username,
        email,
        isGuest: false,
      };
      setCurrentUser(user);
      setShowGameModes(true);
      setLoadingMessage("");
      try { localStorage.setItem('tetris:user', JSON.stringify(user)); } catch {}
    }, 2000);
  };

  // Play as guest
  const playAsGuest = () => {
    const guestId = "Guest_" + Math.random().toString(36).substr(2, 9);
    const user: User = {
      username: guestId,
      isGuest: true,
    };
    setCurrentUser(user);
    setShowGameModes(true);
    try { localStorage.setItem('tetris:user', JSON.stringify(user)); } catch {}
  };

  // Logout
  const logout = () => {
    setCurrentUser(null);
    setShowGameModes(false);
    setLoginForm({ username: "", password: "" });
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
      navigate("/single");
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
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentUser, activeTab, loading]);

  // Game Mode Component
  const GameModeCard: React.FC<GameModeProps> = ({ icon, title, description, locked, onClick }) => (
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
    </div>
  );

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#000", // nền đen
        color: "#ffffff",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      {/* Animated Background (ẩn để tránh cảm giác không full nền đen) */}
      {/* Intentionally removed for clean black background */}

      {/* Top user bar */}
      {currentUser && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, height: 56,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px', zIndex: 1000,
            borderBottom: '1px solid rgba(255,255,255,0.12)'
          }}
        >
          <div style={{ color: '#fff', fontWeight: 700 }}>
            Xin chào, {currentUser.username}{currentUser.isGuest ? ' (Khách)' : ''}
          </div>
          <button
            onClick={logout}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff', padding: '8px 12px', borderRadius: 8, cursor: 'pointer'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          >
            Đăng xuất
          </button>
        </div>
      )}
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
          marginTop: currentUser ? 56 : 0,
        }}
      >
                    {/* Logo Game */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <img
            src="/logogame.webp"
            alt="Logo Game"
            style={{
              width: "150px",
              height: "auto",
              filter: "drop-shadow(0 0 10px #4ecdc4)",
            }}
          />
        </div>
        {/* Stats Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            padding: "40px 0",
            marginBottom: "40px",
            animation: "fadeInDown 1s ease-out",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "2.5rem",
                fontWeight: "bold",
                textShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
                marginBottom: "8px",
                fontFamily: "'Courier New', monospace",
              }}
            >
              {stats.totalPlayers.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: "0.9rem",
                color: "#888888",
                textTransform: "uppercase",
                letterSpacing: "2px",
                fontWeight: 300,
              }}
            >
              Total Players
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "2.5rem",
                fontWeight: "bold",
                textShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
                marginBottom: "8px",
                fontFamily: "'Courier New', monospace",
              }}
            >
              {stats.gamesPlayed.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: "0.9rem",
                color: "#888888",
                textTransform: "uppercase",
                letterSpacing: "2px",
                fontWeight: 300,
              }}
            >
              Games Played
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "2.5rem",
                fontWeight: "bold",
                textShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
                marginBottom: "8px",
                fontFamily: "'Courier New', monospace",
              }}
            >
              {stats.hoursPlayed.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: "0.9rem",
                color: "#888888",
                textTransform: "uppercase",
                letterSpacing: "2px",
                fontWeight: 300,
              }}
            >
              Hours Played
            </div>
          </div>
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
                    color: "#4ecdc4",
                    textShadow: "0 0 10px #4ecdc4, 0 0 20px #ff6b6b",
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
                    onClick={() => setActiveTab("login")}
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
                    onClick={() => setActiveTab("register")}
                  >
                    Đăng ký
                  </button>
                </div>

                {/* Login Form */}
                {activeTab === "login" && (
                  <form id="loginForm" onSubmit={handleLogin}>
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
                        Tên đăng nhập hoặc Email
                      </label>
                      <input
                        type="text"
                        value={loginForm.username}
                        onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
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
                        placeholder="Nhập tên đăng nhập hoặc email"
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
                        background: "linear-gradient(45deg, #ff6b6b, #4ecdc4)",
                        color: "white",
                        marginBottom: "15px",
                        width: "100%",
                        position: "relative",
                        overflow: "hidden",
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
                      {loading ? loadingMessage : "Đăng nhập"}
                    </button>
                  </form>
                )}

                {/* Register Form */}
                {activeTab === "register" && (
                  <form onSubmit={handleRegister}>
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
                        type="text"
                        value={registerForm.username}
                        onChange={(e) =>
                          setRegisterForm({ ...registerForm, username: e.target.value })
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
                        Email
                      </label>
                      <input
                        type="email"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
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
                        type="password"
                        value={registerForm.password}
                        onChange={(e) =>
                          setRegisterForm({ ...registerForm, password: e.target.value })
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
                        placeholder="Tạo mật khẩu mạnh"
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
                        background: "linear-gradient(45deg, #ff6b6b, #4ecdc4)",
                        color: "white",
                        marginBottom: "15px",
                        width: "100%",
                        position: "relative",
                        overflow: "hidden",
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
                      {loading ? loadingMessage : "Đăng ký"}
                    </button>
                  </form>
                )}

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
                    fontSize: "2rem",
                    fontWeight: "bold",
                    marginBottom: "30px",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    textAlign: "center",
                    fontFamily: "'Press Start 2P', cursive",
                    color: "#4ecdc4",
                    textShadow: "0 0 10px #4ecdc4, 0 0 20px #ff6b6b",
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
                    onClick={() => navigate('/online/ranked')}
                  />
                  <GameModeCard
                    icon="👥"
                    title="Phòng tùy chỉnh"
                    description="Tạo hoặc tham gia phòng chơi với bạn bè"
                    locked={currentUser?.isGuest}
                  />
                  <GameModeCard
                    icon="🏆"
                    title="Xếp hạng"
                    description="Thi đấu và leo rank trong hệ thống xếp hạng"
                    onClick={() => navigate('/online/ranked')}
                  />
                </div>

                {/* Back to login button */}
                <button
                  onClick={logout}
                  style={{
                    marginTop: "30px",
                    padding: "10px 20px",
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: "8px",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    transition: "all 0.3s ease",
                    display: "block",
                    margin: "30px auto 0",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  }}
                >
                  ← Quay lại đăng nhập
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS Animation Styles */}
      <style>
        {`
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
    </div>
  );
};

export default HomeMenu;
