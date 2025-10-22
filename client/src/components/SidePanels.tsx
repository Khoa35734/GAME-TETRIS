import React from "react";
import MinoPreview from "./MinoPreview";

type CSS = React.CSSProperties;

export const HoldPanel = ({
  hold,
  style,
}: {
  hold: string | null;
  style?: CSS;
}) => (
  <div style={{ ...panel, ...(style || {}) }}>
    <div style={title}>HOLD</div>
    <MinoPreview type={(hold as any) ?? null} size={18} />
  </div>
);

export const NextPanel = ({
  queue,
  style,
}: {
  queue: string[];
  style?: CSS;
}) => (
  <div style={{ ...panel, ...(style || {}) }}>
    <div style={title}>NEXT</div>
    <div style={{ display: "grid", gap: 12 }}>
      {queue.slice(0, 4).map((t, i) => (
        <MinoPreview key={i} type={t as any} size={18} />
      ))}
    </div>
  </div>
);

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
  <div style={{ ...panel, ...(style || {}) }}>
    <div style={title}>STATS</div>
    <div style={stat}>Score: {score}</div>
    <div style={stat}>Rows: {rows}</div>
    <div style={stat}>Level: {level}</div>
  </div>
);

// ===================================
// START: CÁC THAY ĐỔI
// ===================================
const panel: CSS = {
  width: 170,
  padding: 12,
  borderRadius: 12,
  // Sửa: Đổi từ nền trắng 6% sang nền đen 75%
  background: "rgba(20, 20, 22, 0.75)", 
  // Sửa: Tăng độ mờ
  backdropFilter: "blur(10px)", 
  boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
  // Thêm: Viền trắng mờ để tách biệt khỏi nền
  border: "1px solid rgba(255, 255, 255, 0.1)" 
};

const title: CSS = {
  fontWeight: 800,
  marginBottom: 8,
  letterSpacing: 1,
  opacity: 0.9,
};
// ===================================
// END: CÁC THAY ĐỔI
// ===================================

const stat: CSS = {
  fontWeight: 600,
  padding: "4px 0",
};

export default {};