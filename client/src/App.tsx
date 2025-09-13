import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Tetris from "./components/Tetris";
import HomeMenu from "./components/HomeMenu";

const App: React.FC = () => {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<HomeMenu />} />
        <Route path="/single" element={<Tetris />} />
        <Route path="/online" element={<div style={{ padding: 16 }}><h2>Chơi trực tuyến</h2><p>Tính năng đang phát triển.</p></div>} />
        <Route path="/settings" element={<div style={{ padding: 16 }}><h2>Cài đặt</h2><p>Tuỳ chọn sẽ sớm có mặt.</p></div>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;

