import React from "react";
import { Link } from "react-router-dom";

const HomeMenu: React.FC = () => {
  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: "min(520px, 92vw)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: 24,
          borderRadius: 16,
          background: "rgba(20,20,22,0.35)",
          backdropFilter: "blur(6px)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: 0, letterSpacing: 1 }}>TETRIS</h1>
        <p style={{ marginTop: -6, opacity: 0.8 }}>Phiên bản PBL4</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          <Link to="/single"><button style={{ fontSize: 18, fontWeight: 700 }}>Chơi đơn</button></Link>
          <Link to="/online"><button>Chơi trực tuyến</button></Link>
          <Link to="/settings"><button>Cài đặt</button></Link>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
          Dùng phím mũi tên/ASDW để di chuyển, Space để thả nhanh.
        </div>
      </div>
    </div>
  );
};

export default HomeMenu;
