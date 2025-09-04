import React from "react";
import MinoPreview from "./MinoPreview";

export const HoldPanel = ({ hold }: { hold: string | null }) => (
  <div style={{
    ...panel,
    position: "absolute",
    left: 0,
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 10,
  }}>
    <div style={title}>HOLD</div>
    <MinoPreview type={(hold as any) ?? null} size={18} />
  </div>
);

export const NextPanel = ({ queue }: { queue: string[] }) => (
  <div style={panel}>
    <div style={title}>NEXT</div>
    <div style={{ display: "grid", gap: 12 }}>
      {queue.slice(0, 4).map((t, i) => (
        <MinoPreview key={i} type={t as any} size={18} />
      ))}
    </div>
  </div>
);

export const ScorePanel = ({ score = 0, rows = 0, level = 0 }:
  { score?: number; rows?: number; level?: number }) => (
  <div style={panel}>
    <div style={title}>STATS</div>
    <div style={stat}>Score: {score}</div>
    <div style={stat}>Rows: {rows}</div>
    <div style={stat}>Level: {level}</div>
  </div>
);

const panel: React.CSSProperties = {
  width: 170,
  padding: 12,
  borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(6px)",
  boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
};

const title: React.CSSProperties = {
  fontWeight: 800,
  marginBottom: 8,
  letterSpacing: 1,
  opacity: 0.9,
};

const stat: React.CSSProperties = {
  fontWeight: 600,
  padding: "4px 0",
};
