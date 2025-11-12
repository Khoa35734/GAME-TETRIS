import React from "react";
import MinoPreview from "./MinoPreview";

type CSS = React.CSSProperties;
const texture = "/img/texture/brick.jpg";

// ============================
// 🧱 HOLD PANEL
// ============================
export const HoldPanel = ({
  hold,
  style,
}: {
  hold: string | null;
  style?: CSS;
}) => (
  <div style={{ ...panelTexture, ...panelHold, ...(style || {}) }}>
    <div style={header}>HOLD</div>
    <div style={content}>
      <MinoPreview type={(hold as any) ?? null} size={14} />
    </div>
  </div>
);

// ============================
// 🔮 NEXT PANEL
// ============================
export const NextPanel = ({
  queue,
  style,
}: {
  queue: string[];
  style?: CSS;
}) => (
  <div style={{ ...panelTexture, ...panelNext, ...(style || {}) }}>
    <div style={header}>NEXT</div>
    <div style={contentGrid}>
      {queue.slice(0, 4).map((t, i) => (
        <MinoPreview key={i} type={t as any} size={14} />
      ))}
    </div>
  </div>
);

// ============================
// 🧾 SCORE PANEL (GIỮ NGUYÊN NỀN MỜ)
// ============================
export const ScorePanel = ({
  score = 0,
  rows = 0,
  level = 0,
  style,
}: {
  score?: number;
  rows?: number;
  level?: number;
  style?: CSS;
}) => (
  <div style={{ ...panelScore, ...(style || {}) }}>
    <div style={title}>STATS</div>
    <div style={stat}>Score: {score}</div>
    <div style={stat}>Rows: {rows}</div>
    <div style={stat}>Level: {level}</div>
  </div>
);

// ===================================
// 🎨 STYLE DEFINITIONS
// ===================================

const panelTexture: CSS = {
  position: "relative",
  border: "2px solid #fff",
  borderRadius: 0,
  backgroundImage: `url(${texture})`,
  backgroundSize: "20px 20px",
  backgroundRepeat: "repeat",
  backgroundColor: "rgba(0,0,0,0.9)",
  boxShadow: "0 0 12px rgba(255,255,255,0.1)",
  overflow: "hidden",
  padding: "26px 8px 10px 8px",
};

// 🧩 HOLD: hẹp, luôn giữ kích cỡ, sát board trái
const panelHold: CSS = {
  width: 95,
  minHeight: 90,
  transform: "translateX(-2px)", // dịch sát board trái
  marginRight: 2,
};

// 🔮 NEXT: hẹp, sát board phải, canh giữa khối
const panelNext: CSS = {
  width: 95,
  height: 4 * (4 * 14 + 6), // Reduced: 4 khối I (4 ô mỗi khối, mỗi ô size=14, gap=6)
  marginLeft: 2,
  transform: "translateX(2px)", // dịch sát phải
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  overflow: "hidden",
};

// 📊 SCORE PANEL giữ nguyên
const panelScore: CSS = {
  width: 160,
  padding: 12,
  borderRadius: 12,
  background: "rgba(20, 20, 22, 0.75)",
  backdropFilter: "blur(10px)",
  boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  marginLeft: 10,
  marginTop: 10,
  transform: "translateX(3px)",
};

// ============================
// 🏷️ HEADER
// ============================
const header: CSS = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: 22,
  background: "#fff",
  color: "#000",
  fontWeight: 900,
  fontSize: "0.7rem",
  textAlign: "center",
  lineHeight: "22px",
  letterSpacing: "1px",
  borderBottom: "2px solid #fff",
  userSelect: "none",
  textShadow: "0 0 1px rgba(0,0,0,0.3)",
};

// ============================
// 📦 CONTENT
// ============================
const content: CSS = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginTop: 8,
  height: "calc(100% - 30px)",
};

const contentGrid: CSS = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "space-evenly",
  height: "100%", // chiếm toàn bộ panelNext
  width: "100%",
  gap: 8,
  marginTop: 6,
};

// ============================
// 📊 SCORE PANEL TEXT
// ============================
const title: CSS = {
  fontWeight: 800,
  marginBottom: 8,
  letterSpacing: 1,
  opacity: 0.9,
  color: "#fff",
};

const stat: CSS = {
  fontWeight: 600,
  padding: "4px 0",
  color: "#fff",
  textShadow: "0 1px 2px #000",
};

export default {};
