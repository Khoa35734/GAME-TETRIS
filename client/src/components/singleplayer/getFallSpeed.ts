export const MAX_LEVEL = 22;

export function getFallSpeed(lvl: number): number {
  const L = Math.min(lvl, MAX_LEVEL - 1);
  const START_SPEED = 800;
  const END_SPEED = 16.67;
  if (L >= MAX_LEVEL - 1) return END_SPEED;
  const progress = L / (MAX_LEVEL - 1);
  const speed = START_SPEED * Math.pow(END_SPEED / START_SPEED, progress);
  return Math.max(END_SPEED, speed);
}

