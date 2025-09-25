import React from "react";
import { Link } from "react-router-dom";
import { StyledTetrisWrapper } from "./styles/StyledTetris";

const HomeMenu: React.FC = () => {
  return (
    <StyledTetrisWrapper style={{ display: 'grid', placeItems: 'center' }}>
      <div
        style={{
          width: 'min(520px, 92vw)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: 24,
          borderRadius: 16,
          background: 'rgba(20,20,22,0.35)',
          backdropFilter: 'blur(6px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          textAlign: 'center',
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
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
        color: "#ffffff",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      {/* Animated Background */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `
            linear-gradient(45deg, transparent 49%, rgba(255,255,255,0.02) 50%, transparent 51%),
            linear-gradient(-45deg, transparent 49%, rgba(255,255,255,0.02) 50%, transparent 51%)
          `,
          backgroundSize: "50px 50px",
          animation: "gridMove 20s linear infinite",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "20px",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Logo */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "40px",
            animation: "pulse 2s infinite",
          }}
        >
          <img
            src="/path/to/your/logo.png" // Replace with the actual path to your logo file
            alt="TETR.IO Logo"
            style={{
              width: "200px",
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

        {/* User Status */}
        {currentUser && (
          <div
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              background: "rgba(0, 0, 0, 0.8)",
              backdropFilter: "blur(10px)",
              borderRadius: "25px",
              padding: "10px 20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: "linear-gradient(45deg, #ff6b6b, #4ecdc4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "0.8rem",
              }}
            >
              {currentUser.isGuest ? "G" : currentUser.username.charAt(0).toUpperCase()}
            </div>
            <span>{currentUser.username}</span>
            <button
              style={{
                background: "none",
                border: "none",
                color: "#ff6b6b",
                cursor: "pointer",
                fontSize: "0.8rem",
                padding: "5px 10px",
                borderRadius: "15px",
                transition: "background 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 107, 107, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
              }}
              onClick={logout}
            >
              Đăng xuất
            </button>
          </div>
        )}

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
                  Welcome to TETR.IO
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
                    locked={currentUser?.isGuest}
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
                    locked={currentUser?.isGuest}
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
    </StyledTetrisWrapper>
  );
};

export default HomeMenu;