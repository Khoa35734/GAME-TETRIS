// import { useEffect, useState } from 'react';
// import socket from '../socket.ts';

// type ChatMessage = { from?: string; text: string };

// export default function App() {
// 	const [messages, setMessages] = useState<ChatMessage[]>([]);
// 	const [connected, setConnected] = useState(false);

// 	useEffect(() => {
// 		function onConnect() {
// 			setConnected(true);
// 			console.log('Connected:', socket.id);
// 			socket.emit('ping');
// 		}
// 		function onDisconnect() {
// 			setConnected(false);
// 		}
// 		function onPong() {
// 			console.log('Pong nhận được');
// 		}
// 		function onChat(data: ChatMessage) {
// 			setMessages((prev) => [...prev, data]);
// 		}

// 		socket.on('connect', onConnect);
// 		socket.on('disconnect', onDisconnect);
// 		socket.on('pong', onPong);
// 		socket.on('chat:message', onChat);

// 			return () => {
// 			socket.off('connect', onConnect);
// 			socket.off('disconnect', onDisconnect);
// 			socket.off('pong', onPong);
// 			socket.off('chat:message', onChat);
// 				// không đóng socket singleton khi unmount
// 		};
// 	}, [socket]);

// 	const sendMessage = () => {
// 		socket.emit('chat:message', { text: 'Hello từ React' });
// 	};

// 	return (
// 		<div style={{ maxWidth: 600, margin: '40px auto', color: '#fff', fontFamily: 'system-ui' }}>
// 			<h2>React Chat Test</h2>
// 			<div style={{ marginBottom: 12 }}>
// 					Trạng thái: {connected ? 'Đã kết nối' : 'Mất kết nối'}
// 			</div>
// 			<button onClick={sendMessage}>Send Hello</button>
// 			<div style={{ marginTop: 16 }}>
// 				{messages.map((m, i) => (
// 					<p key={i}>
// 						{m.from ? `${m.from}: ` : ''}
// 						{m.text}
// 					</p>
// 				))}
// 			</div>
// 		</div>
// 	);
// }
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import socket from '../socket.ts';

// Import các thành phần mới
import AdminDashboard from './admin/AdminDashboard'; 
import ReportsManagement from './admin/ReportsManagement';
import FeedbackManagement from './admin/FeedbackManagement';
import BroadcastMessages from './admin/BroadcastMessages';

// Định nghĩa kiểu dữ liệu cho tin nhắn chat
type ChatMessage = { from?: string; text: string };

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginTest = () => {
    // Giả lập đăng nhập
    setIsLoggedIn(true);
    alert('✅ Đã đăng nhập thành công (Test Mode)');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    alert('❌ Đã đăng xuất');
  };

  return (
    <div style={{ 
      padding: 24, 
      fontFamily: 'Inter, sans-serif', 
      color: '#fff',
      minHeight: '100vh',
      background: '#0f0f0f'
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: 32, marginBottom: 12 }}>Admin Panel Test</h1>
        <p style={{ color: '#9ca3af', marginBottom: 24 }}>
          Test các chức năng admin (Chưa có đăng nhập thật)
        </p>

        {/* Login Status */}
        <div style={{
          background: isLoggedIn ? '#064e3b' : '#7f1d1d',
          padding: 16,
          borderRadius: 8,
          marginBottom: 24,
          border: `2px solid ${isLoggedIn ? '#10b981' : '#ef4444'}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              {isLoggedIn ? '🟢 Đã đăng nhập (Test)' : '🔴 Chưa đăng nhập'}
            </span>
            {isLoggedIn ? (
              <button onClick={handleLogout} style={logoutButtonStyle}>
                Đăng xuất
              </button>
            ) : (
              <button onClick={handleLoginTest} style={loginButtonStyle}>
                🔑 Login Test
              </button>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link to="/admin-dashboard" style={testButtonStyle}>
            📊 Admin Dashboard
          </Link>
          <Link to="/reports-management" style={testButtonStyle}>
            ⚠️ Reports Management
          </Link>
          <Link to="/feedback-management" style={testButtonStyle}>
            💬 Feedback Management
          </Link>
          <Link to="/broadcast-messages" style={testButtonStyle}>
            📢 Broadcast Messages
          </Link>
          <Link to="/chat" style={testButtonStyle}>
            💭 Chat Test
          </Link>
        </div>

        {/* Info Box */}
        <div style={{
          marginTop: 32,
          padding: 16,
          background: '#1e1e1e',
          borderRadius: 8,
          border: '1px solid #374151'
        }}>
          <h3 style={{ fontSize: 18, marginBottom: 8, color: '#fbbf24' }}>ℹ️ Lưu ý</h3>
          <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6 }}>
            • Nút "Login Test" chỉ để test UI, chưa kết nối backend<br/>
            • Sau khi làm xong chức năng đăng nhập, sẽ xóa nút này<br/>
            • Thay thế bằng form đăng nhập thật với authentication
          </p>
        </div>
      </div>
    </div>
  );
};

const testButtonStyle: React.CSSProperties = {
  display: 'block',
  padding: '16px 24px',
  background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
  color: '#fff',
  textDecoration: 'none',
  borderRadius: 8,
  textAlign: 'center',
  fontWeight: 600,
  fontSize: 16,
  cursor: 'pointer',
  transition: 'all 0.2s',
  border: 'none',
};

const loginButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#10b981',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14,
};

const logoutButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#ef4444',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14,
};

const ChatTest: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
      console.log('Connected:', socket.id);
      socket.emit('ping');
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onPong() {
      console.log('Pong nhận được');
    }
    function onChat(data: ChatMessage) {
      setMessages((prev) => [...prev, data]);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('pong', onPong);
    socket.on('chat:message', onChat);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('pong', onPong);
      socket.off('chat:message', onChat);
    };
  }, []);

  const sendMessage = () => {
    socket.emit('chat:message', { text: 'Hello từ React' });
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: '40px auto',
        color: '#fff',
        fontFamily: 'system-ui',
        background: '#1e1e1e',
        padding: 20,
        borderRadius: 8,
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
      }}
    >
      <h2 style={{ textAlign: 'center', marginBottom: 20 }}>React Chat Test</h2>
      <div style={{ marginBottom: 12, fontSize: 16 }}>
        <strong>Trạng thái:</strong> {connected ? 'Đã kết nối' : 'Mất kết nối'}
      </div>
      <button
        onClick={sendMessage}
        style={{
          padding: '10px 20px',
          background: connected ? '#3b82f6' : '#6b7280',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: connected ? 'pointer' : 'not-allowed',
          fontWeight: 'bold',
          fontSize: 14,
        }}
        disabled={!connected}
      >
        Send Hello
      </button>
      <div style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Messages:</h3>
        <div
          style={{
            background: '#2d2d2d',
            padding: 12,
            borderRadius: 8,
            maxHeight: 300,
            overflowY: 'auto',
          }}
        >
          {messages.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>No messages yet...</p>
          ) : (
            messages.map((m, i) => (
              <p key={i} style={{ margin: '4px 0' }}>
                <strong>{m.from ? `${m.from}: ` : ''}</strong>
                <span>{m.text}</span>
              </p>
            ))
          )}
        </div>
      </div>
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <Link to="/" style={{ color: '#3b82f6', textDecoration: 'none' }}>
          ← Quay lại Home
        </Link>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div style={{ background: '#0f0f0f', minHeight: '100vh' }}>
        {/* Global Navigation */}
        <nav style={{
          padding: '12px 24px',
          background: '#1a1a1a',
          borderBottom: '1px solid #374151',
          position: 'sticky',
          top: 0,
          zIndex: 1000
        }}>
          <Link to="/" style={{
            color: '#3b82f6',
            textDecoration: 'none',
            fontSize: 16,
            fontWeight: 600
          }}>
            🏠 Admin Test Home
          </Link>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/reports-management" element={<ReportsManagement />} />
          <Route path="/feedback-management" element={<FeedbackManagement />} />
          <Route path="/broadcast-messages" element={<BroadcastMessages />} />
          <Route path="/chat" element={<ChatTest />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;