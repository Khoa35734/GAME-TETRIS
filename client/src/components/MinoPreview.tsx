import { TETROMINOES } from "./tetrominos";
import { getTetrominoTexture } from "./textureUtils";

type Props = {
  type: keyof typeof TETROMINOES | null;
  size?: number; // kích cỡ 1 ô vuông
  placeholder?: boolean; // dùng trong hold rỗng
};

export default function MinoPreview({ type, size = 24, placeholder = false }: Props) {
  // Nếu không có type nhưng cần giữ chỗ (hold rỗng)
  if (!type || !TETROMINOES[type]) {
    return (
      <div
        style={{
          width: size * 4,
          height: size * 4,
          display: "grid",
          gridTemplateColumns: `repeat(4, ${size}px)`,
          gridTemplateRows: `repeat(4, ${size}px)`,
          gap: 0,
          background: "none",
        }}
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: size,
              height: size,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          />
        ))}
      </div>
    );
  }

  const { shape } = TETROMINOES[type];
  const texture = getTetrominoTexture(type);
  const rows = shape.length;
  const cols = shape[0].length;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: `repeat(${rows}, ${size}px)`,
        gridTemplateColumns: `repeat(${cols}, ${size}px)`,
        justifyContent: "center",
        alignItems: "center",
        gap: 0,
        padding: 0,
        margin: 0,
        width: cols * size,
        height: rows * size,
      }}
    >
      {shape.map((row, y) =>
        row.map((cell, x) => {
          const filled = cell !== 0;
          const backgroundImage =
            filled && texture ? `url(${texture})` : undefined;
          const backgroundColor =
            filled && !texture ? "rgba(255,255,255,0.2)" : "transparent";
          return (
            <div
              key={`${y}-${x}`}
              style={{
                width: size,
                height: size,
                backgroundColor,
                backgroundImage,
                backgroundSize: backgroundImage ? "cover" : undefined,
                backgroundPosition: backgroundImage ? "center" : undefined,
                backgroundRepeat: backgroundImage ? "no-repeat" : undefined,
              }}
            />
          );
        })
      )}
    </div>
  );
}
