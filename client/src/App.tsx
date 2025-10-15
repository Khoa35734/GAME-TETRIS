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

const App: React.FC = () => {
  const selectedBackground = useMemo(() => {
    if (!backgroundSources.length) return null;
    const idx = Math.floor(Math.random() * backgroundSources.length);
    return backgroundSources[idx];
  }, []);

  useEffect(() => {
    if (!selectedBackground) return;

    const body = document.body;
    const previous = {
      image: body.style.backgroundImage,
      size: body.style.backgroundSize,
      position: body.style.backgroundPosition,
      repeat: body.style.backgroundRepeat,
      attachment: body.style.backgroundAttachment,
      color: body.style.backgroundColor,
    };

    body.style.backgroundImage = `url(${selectedBackground})`;
    body.style.backgroundSize = "cover";
    body.style.backgroundPosition = "center center";
    body.style.backgroundRepeat = "no-repeat";
    body.style.backgroundAttachment = "fixed";
    body.style.backgroundColor = "#000";

    return () => {
      body.style.backgroundImage = previous.image;
      body.style.backgroundSize = previous.size;
      body.style.backgroundPosition = previous.position;
      body.style.backgroundRepeat = previous.repeat;
      body.style.backgroundAttachment = previous.attachment;
      body.style.backgroundColor = previous.color;
    };
  }, [selectedBackground]);

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

export default App;

