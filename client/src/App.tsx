import React, { useEffect, useMemo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Tetris from "./components/Tetris";
import HomeMenu from "./components/HomeMenu";
import OnlineMenu from "./components/OnlineMenu";
import Versus from "./components/Versus";
import OnlineCreateRoom from "./components/OnlineCreateRoom";
import OnlineJoinRoom from "./components/OnlineJoinRoom";
import AdminDashboard from "./components/admin/AdminDashboard";
import RoomLobby from "./components/RoomLobby";
import { InvitationNotification } from "./components/InvitationNotification";
import { MobileWarning } from "./components/MobileWarning";
import SinglePlayerSettings from "./components/SinglePlayerSettings";
import OnlineRanked from "./components/OnlineRanked";
import OnlineCasual from "./components/OnlineCasual";

const backgroundModules = import.meta.glob("../img/*.{jpg,jpeg,png,gif,webp}", {
  eager: true,
  as: "url",
});
const backgroundSources = Object.values(backgroundModules) as string[];

// Import ProtectedRoute
import ProtectedRoute from './components/ProtectedRoute';

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
    <div className="App">
      {/* Mobile device warning - blocks access on phones/tablets */}
      <MobileWarning />
      
      {/* Global notification for room invitations */}
      <InvitationNotification />
      
      <Routes>
        <Route path="/" element={<HomeMenu />} />
        <Route path="/single/settings" element={<SinglePlayerSettings />} />
        <Route path="/single" element={<Tetris />} />
  <Route path="/online" element={<OnlineMenu />} />
  <Route path="/online/ranked" element={<OnlineRanked />} />
  <Route path="/online/casual" element={<OnlineCasual />} />
  <Route path="/online/create" element={<OnlineCreateRoom />} />
  <Route path="/online/join" element={<OnlineJoinRoom />} />
        <Route path="/room/:roomId" element={<RoomLobby />} />
        <Route path="/versus/:roomId" element={<Versus />} />
        <Route path="/settings" element={<div style={{ padding: 16 }}><h2>Cài đặt</h2><p>Tuỳ chọn sẽ sớm có mặt.</p></div>} />
  <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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