// Texture mapping for tetromino types
export const TEXTURE_MAP: { [key: string]: string } = {
  I: '/img/texture/diamond.webp',    // Diamond - cyan/blue (matches I color)
  J: '/img/texture/lapis.jpg',       // Lapis - deep blue (matches J color)
  L: '/img/texture/gold.webp',       // Gold - orange/yellow (matches L color)
  O: '/img/texture/iron.jpg',        // Iron - light gray (matches O/yellow)
  S: '/img/texture/emeral.jpg',      // Emerald - green (matches S color)
  T: '/img/texture/amethyst.webp',   // Redstone - purple/red (matches T color)
  Z: '/img/texture/redstone.webp',   // Redstone - red (matches Z color)
};

// Fallback colors for tetromino types (used as backup)
export const TETROMINO_COLORS: { [key: string]: string } = {
  I: "80, 227, 230",    // Cyan
  J: "36, 95, 223",     // Blue
  L: "223, 173, 36",    // Orange
  O: "223, 217, 36",    // Yellow
  S: "48, 211, 56",     // Green
  T: "132, 61, 198",    // Purple
  Z: "227, 78, 78",     // Red
};

// Get texture URL for a tetromino type
export function getTetrominoTexture(type: string | number): string | null {
  const typeStr = String(type);
  return TEXTURE_MAP[typeStr] || null;
}

// Get fallback color for a tetromino type
export function getTetrominoColor(type: string | number): string {
  const typeStr = String(type);
  return TETROMINO_COLORS[typeStr] || "255, 255, 255";
}

// Get background style (texture with fallback to color)
export function getTetrominoBackground(type: string | number, alpha: number = 0.8): string {
  const texture = getTetrominoTexture(type);
  if (texture) {
    return `url(${texture})`;
  }
  const color = getTetrominoColor(type);
  return `rgba(${color}, ${alpha})`;
}
