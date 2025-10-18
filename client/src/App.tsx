import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';

// Import ProtectedRoute
import ProtectedRoute from './components/ProtectedRoute';

// Import ProtectedRoute

// Import các thành phần admin
import AdminDashboard from './components/admin/AdminDashboard';
import ReportsManagement from './components/admin/ReportsManagement';
import FeedbackManagement from './components/admin/FeedbackManagement';
import BroadcastMessages from './components/admin/BroadcastMessages';

// Import các thành phần game
import Tetris from './components/Tetris';
import HomeMenu from './components/HomeMenu';
import OnlineMenu from './components/OnlineMenu';
import Versus from './components/Versus';
import OnlineCreateRoom from './components/OnlineCreateRoom';
import OnlineJoinRoom from './components/OnlineJoinRoom';
import RoomLobby from './components/RoomLobby';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginTest = () => {
    setIsLoggedIn(true);
    alert('✅ Đã đăng nhập thành công (Test Mode)');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    alert('❌ Đã đăng xuất');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Tetris Admin Panel</h1>
          <p className="text-gray-400">Quản lý hệ thống game Tetris</p>
        </div>

        {/* Login Status */}
        <div className={`bg-gray-800 rounded-lg p-4 mb-6 ${isLoggedIn ? 'border-green-500' : 'border-red-500'} border`}>
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">
              {isLoggedIn ? '🟢 Đã đăng nhập (Test)' : '🔴 Chưa đăng nhập'}
            </span>
            {isLoggedIn ? (
              <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
                Đăng xuất
              </button>
            ) : (
              <button onClick={handleLoginTest} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                🔑 Login Test
              </button>
            )}
          </div>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link to="/admin" className="bg-gray-800 hover:bg-gray-700 p-6 rounded-lg transition-colors text-center block">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="text-lg font-semibold">Admin Dashboard</h3>
            <p className="text-gray-400 text-sm">Quản lý tổng quan</p>
          </Link>

          <Link to="/admin/reports" className="bg-gray-800 hover:bg-gray-700 p-6 rounded-lg transition-colors text-center block">
            <div className="text-2xl mb-2">⚠️</div>
            <h3 className="text-lg font-semibold">Reports Management</h3>
            <p className="text-gray-400 text-sm">Quản lý báo cáo</p>
          </Link>

          <Link to="/admin/feedback" className="bg-gray-800 hover:bg-gray-700 p-6 rounded-lg transition-colors text-center block">
            <div className="text-2xl mb-2">💬</div>
            <h3 className="text-lg font-semibold">Feedback Management</h3>
            <p className="text-gray-400 text-sm">Quản lý phản hồi</p>
          </Link>

          <Link to="/admin/broadcast" className="bg-gray-800 hover:bg-gray-700 p-6 rounded-lg transition-colors text-center block">
            <div className="text-2xl mb-2">📢</div>
            <h3 className="text-lg font-semibold">Broadcast Messages</h3>
            <p className="text-gray-400 text-sm">Gửi thông báo</p>
          </Link>
        </div>

        {/* Game Navigation */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">🎮 Game Navigation</h3>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-center transition-colors">
              Trang Chủ Game
            </Link>
            <Link to="/single" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-center transition-colors">
              Chơi Đơn
            </Link>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-yellow-400">ℹ️ Lưu ý</h3>
          <ul className="text-sm text-yellow-300 space-y-1">
            <li>• Nút "Login Test" chỉ để test UI, chưa kết nối backend</li>
            <li>• Dữ liệu hiển thị là mock data cho testing</li>
            <li>• Kết nối thực tế sẽ được tích hợp sau</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900">
        {/* Global Navigation */}
        <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50 px-6 py-3">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link to="/" className="text-white font-semibold text-lg flex items-center gap-2">
              🏠 Tetris Admin System
            </Link>
            <div className="flex gap-4">
              <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                Game Home
              </Link>
              <Link to="/admin" className="text-gray-300 hover:text-white transition-colors">
                Admin
              </Link>
            </div>
          </div>
        </nav>

        <Routes>
          {/* Admin Routes - Protected */}
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin-dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute><ReportsManagement /></ProtectedRoute>} />
          <Route path="/admin/feedback" element={<ProtectedRoute><FeedbackManagement /></ProtectedRoute>} />
          <Route path="/admin/feedbacks" element={<ProtectedRoute><FeedbackManagement /></ProtectedRoute>} />
          <Route path="/admin/broadcast" element={<ProtectedRoute><BroadcastMessages /></ProtectedRoute>} />
          <Route path="/admin/broadcasts" element={<ProtectedRoute><BroadcastMessages /></ProtectedRoute>} />
          
          {/* Game Routes */}
          <Route path="/" element={<HomeMenu />} />
          <Route path="/single" element={<Tetris />} />
          <Route path="/online" element={<OnlineMenu />} />
          <Route path="/online/ranked" element={<Versus />} />
          <Route path="/online/create" element={<OnlineCreateRoom />} />
          <Route path="/online/join" element={<OnlineJoinRoom />} />
          <Route path="/room/:roomId" element={<RoomLobby />} />
          <Route path="/versus/:roomId" element={<Versus />} />
          
          {/* Home Route */}
          <Route path="/admin-home" element={<Home />} />
          
          {/* Redirect */}
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;