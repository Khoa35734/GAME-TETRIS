import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Tetris from "./components/Tetris";
import HomeMenu from "./components/HomeMenu";
import OnlineMenu from "./components/OnlineMenu";
import Versus from "./components/Versus";
import OnlineCreateRoom from "./components/OnlineCreateRoom";
import OnlineJoinRoom from "./components/OnlineJoinRoom";

const App: React.FC = () => {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<HomeMenu />} />
        <Route path="/single" element={<Tetris />} />
  <Route path="/online" element={<OnlineMenu />} />
  <Route path="/online/ranked" element={<Versus />} />
  <Route path="/online/create" element={<OnlineCreateRoom />} />
  <Route path="/online/join" element={<OnlineJoinRoom />} />
        <Route path="/settings" element={<div style={{ padding: 16 }}><h2>Cài đặt</h2><p>Tuỳ chọn sẽ sớm có mặt.</p></div>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;

