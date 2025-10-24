import React from "react";
import { StyledDisplay } from "./styles/StyledDisplay";
import { getTetrominoTexture } from "./textureUtils";

interface HoldDisplayProps {
  tetromino: any;
}

const HoldDisplay: React.FC<HoldDisplayProps> = ({ tetromino }) => {
  const texture = "/img/texture/brick.jpg"; // texture nền của vùng HOLD

  return (
    <StyledDisplay
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: 4,
        backgroundImage: `url(${texture})`,
        backgroundSize: "16px 16px",
        backgroundRepeat: "repeat",
        backgroundColor: "rgba(0,0,0,0.8)",
        border: "2px solid white",
        borderRadius: 0, // sắc cạnh
        boxShadow: "0 0 8px rgba(255,255,255,0.15)",
        minWidth: 48,
        minHeight: 48,
      }}
    >
      {/* Thanh tiêu đề HOLD */}
      <div
        style={{
          position: "absolute",
          top: -14,
          left: 0,
          width: "100%",
          height: 12,
          background: "white",
          color: "#000",
          fontSize: "0.65rem",
          fontWeight: 700,
          textAlign: "center",
          lineHeight: "12px",
          letterSpacing: "1px",
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottom: "1px solid #fff",
          textShadow: "none",
          userSelect: "none",
        }}
      >
        HOLD
      </div>

      {/* Hiển thị khối Tetromino */}
      {tetromino ? (
        <div
          style={{
            display: "inline-block",
            marginTop: 6,
            transform: "scale(1.1)", // phóng nhẹ cho rõ
          }}
        >
          {tetromino.map((row: any, y: number) => (
            <div key={y} style={{ display: "flex" }}>
              {row.map((cell: any, x: number) => {
                const cellTexture = cell !== 0 ? getTetrominoTexture(cell) : null;
                return (
                  <div
                    key={x}
                    style={{
                      width: 8,
                      height: 8,
                      background:
                        cell !== 0
                          ? cellTexture
                            ? `url(${cellTexture})`
                            : getTetrominoColorFallback(cell)
                          : "transparent",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      imageRendering: "pixelated",
                      border: cell !== 0 ? "1px solid rgba(255,255,255,0.25)" : "none",
                      boxShadow:
                        cell !== 0
                          ? "inset 0 0 4px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)"
                          : "none",
                      margin: 0.5,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            color: "#ddd",
            fontSize: "0.55rem",
            textShadow: "0 1px 1px #000",
            marginTop: 10,
          }}
        >
          Empty
        </div>
      )}
    </StyledDisplay>
  );
};

// 🎨 Màu fallback cho Tetromino nếu không có texture
function getTetrominoColorFallback(cell: any) {
  switch (cell) {
    case "I":
      return "#50e3e6";
    case "J":
      return "#245fdf";
    case "L":
      return "#dfad24";
    case "O":
      return "#dfd924";
    case "S":
      return "#30d338";
    case "T":
      return "#843dc6";
    case "Z":
      return "#e34e4e";
    default:
      return "#fff";
  }
}

export default HoldDisplay;
