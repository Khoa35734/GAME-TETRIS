import { TETROMINOES } from "./tetrominos";

type Props = { type: keyof typeof TETROMINOES | null; size?: number };

export default function MinoPreview({ type, size = 16 }: Props) {
  if (!type || !TETROMINOES[type]) {
    return <div style={{ width: size * 4, height: size * 4 }} />;
  }
  const { shape, color } = TETROMINOES[type];

  return (
    <div
      style={{
        width: size * 4,
        height: size * 4,
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 1,
        padding: 2,
        background: "rgba(255,255,255,0.04)",
        borderRadius: 6,
      }}
    >
      {Array.from({ length: 16 }).map((_, i) => {
        const r = Math.floor(i / 4), c = i % 4;
        const filled = shape[r]?.[c] ? 1 : 0;
        return (
          <div
            key={i}
            style={{
              width: size,
              height: size,
              background: filled ? `rgb(${color})` : "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 3,
              boxShadow: filled ? "inset 0 0 6px rgba(0,0,0,.5)" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
