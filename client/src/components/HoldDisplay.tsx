import React from "react";
import { StyledDisplay } from "./styles/StyledDisplay";

interface HoldDisplayProps {
  tetromino: any;
}

const HoldDisplay: React.FC<HoldDisplayProps> = ({ tetromino }) => {
  // Thu nhỏ vùng hiển thị, tô màu khối hold
  return (
    <StyledDisplay style={{
      minHeight: 16,
      minWidth: 16,
      marginBottom: 2,
      padding: 1,
      background: "rgba(30,30,30,0.95)",
      borderRadius: 6,
      border: "2px solid #fff",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      backdropFilter: "none"
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: "0.6rem", color: "#fff", fontWeight: 600, marginBottom: 1, textShadow: "0 1px 2px #000" }}>HOLD</span>
        {tetromino ? (
          <div style={{ display: "inline-block" }}>
            {tetromino.map((row: any, y: number) => (
              <div key={y} style={{ display: "flex" }}>
                {row.map((cell: any, x: number) => (
                  <div
                    key={x}
                    style={{
                      width: 4,
                      height: 4,
                      background: cell !== 0 ? getTetrominoColor(cell) : "transparent",
                      border: cell !== 0 ? "1px solid #fff" : "none",
                      margin: 0.5,
                      boxShadow: cell !== 0 ? "0 1px 2px #222" : "none"
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: "#bbb", fontSize: "0.5rem", textShadow: "0 1px 2px #000" }}>Empty</div>
        )}
      </div>
    </StyledDisplay>
  );
};

// Hàm lấy màu tetromino từ tên khối
function getTetrominoColor(cell: any) {
  switch (cell) {
    case "I": return "#50e3e6";
    case "J": return "#245fdf";
    case "L": return "#dfad24";
    case "O": return "#dfd924";
    case "S": return "#30d338";
    case "T": return "#843dc6";
    case "Z": return "#e34e4e";
    default: return "#fff";
  }
}

export default HoldDisplay;
