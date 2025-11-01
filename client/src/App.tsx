import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import { InvitationNotification } from './components/InvitationNotification';
import { MobileWarning } from './components/MobileWarning';
import AdminDashboard from './components/admin/AdminDashboard';
import ReportsManagement from './components/admin/ReportsManagement';
import FeedbackManagement from './components/admin/FeedbackManagement';
import BroadcastMessages from './components/admin/BroadcastMessages';

import Tetris from './components/Tetris';
import HomeMenu from './components/HomeMenu';
import OnlineMenu from './components/OnlineMenu';
import Versus from './components/Versus';
import OnlineCreateRoom from './components/OnlineCreateRoom';
import OnlineJoinRoom from './components/OnlineJoinRoom';
import RoomLobby from './components/RoomLobby';
import SinglePlayerSettings from './components/SinglePlayerSettings';
import OnlineRanked from './components/OnlineRanked';
import OnlineCasual from './components/OnlineCasual';
import Inbox from './components/Inbox'; // 📬 Inbox component
import Leaderboard from './components/Leaderboard'; // 🏆 Leaderboard component

const Home: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginTest = () => {
    setIsLoggedIn(true);
    alert('? Da dang nh?p th�nh c�ng (Test Mode)');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    alert('? Da dang xu?t');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Tetris Admin Panel</h1>
          <p className="text-gray-400">Qu?n ly h? th?ng game Tetris</p>
        </div>

        <div className={`bg-gray-800 rounded-lg p-4 mb-6 ${isLoggedIn ? 'border-green-500' : 'border-red-500'} border`}>
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">
              {isLoggedIn ? '?? Da dang nh?p (Test)' : '?? Chua dang nh?p'}
            </span>
            {isLoggedIn ? (
              <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
                Dang xu?t
              </button>
            ) : (
              <button onClick={handleLoginTest} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                ?? Login Test
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link to="/admin" className="bg-gray-800 hover:bg-gray-700 p-6 rounded-lg transition-colors text-center block">
            <div className="text-2xl mb-2">??</div>
            <h3 className="text-lg font-semibold">Admin Dashboard</h3>
            <p className="text-gray-400 text-sm">Qu?n ly t?ng quan</p>
          </Link>

          <Link to="/admin/reports" className="bg-gray-800 hover:bg-gray-700 p-6 rounded-lg transition-colors text-center block">
            <div className="text-2xl mb-2">??</div>
            <h3 className="text-lg font-semibold">Reports Management</h3>
            <p className="text-gray-400 text-sm">Qu?n ly b�o c�o</p>
          </Link>

          <Link to="/admin/feedback" className="bg-gray-800 hover:bg-gray-700 p-6 rounded-lg transition-colors text-center block">
            <div className="text-2xl mb-2">??</div>
            <h3 className="text-lg font-semibold">Feedback Management</h3>
            <p className="text-gray-400 text-sm">Qu?n ly ph?n h?i</p>
          </Link>

          <Link to="/admin/broadcast" className="bg-gray-800 hover:bg-gray-700 p-6 rounded-lg transition-colors text-center block">
            <div className="text-2xl mb-2">??</div>
            <h3 className="text-lg font-semibold">Broadcast Messages</h3>
            <p className="text-gray-400 text-sm">G?i th�ng b�o</p>
          </Link>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">?? Game Navigation</h3>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-center transition-colors">
              Trang Ch? Game
            </Link>
            <Link to="/single" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-center transition-colors">
              Choi Don
            </Link>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-yellow-400">?? Luu y</h3>
          <ul className="text-sm text-yellow-300 space-y-1">
            <li> Nut "Login Test" chi de test UI, chua ket noi backend</li>
            <li> Du lieu hien thi la mock data cho testing</li>
            <li> Ket noi thuc te se duoc tich hop sau</li>
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

        {/* Global components */}
        <MobileWarning />
        <InvitationNotification />

        <Routes>
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin-dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute><ReportsManagement /></ProtectedRoute>} />
          <Route path="/admin/feedback" element={<ProtectedRoute><FeedbackManagement /></ProtectedRoute>} />
          <Route path="/admin/feedbacks" element={<ProtectedRoute><FeedbackManagement /></ProtectedRoute>} />
          <Route path="/admin/broadcast" element={<ProtectedRoute><BroadcastMessages /></ProtectedRoute>} />
          <Route path="/admin/broadcasts" element={<ProtectedRoute><BroadcastMessages /></ProtectedRoute>} />

          <Route path="/" element={<HomeMenu />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/inbox" element={<Inbox />} /> {/* 📬 Inbox Route */}
          <Route path="/leaderboard" element={<Leaderboard />} /> {/* 🏆 Leaderboard Route */}
          <Route path="/single/settings" element={<SinglePlayerSettings />} />
          <Route path="/single" element={<Tetris />} />
          <Route path="/online" element={<OnlineMenu />} />
          <Route path="/online/ranked" element={<OnlineRanked />} />
          <Route path="/online/casual" element={<OnlineCasual />} />
          <Route path="/online/create" element={<OnlineCreateRoom />} />
          <Route path="/online/join" element={<OnlineJoinRoom />} />
          <Route path="/room/:roomId" element={<RoomLobby />} />
          <Route path="/versus/:roomId" element={<Versus />} />

          <Route path="/admin-home" element={<Home />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
