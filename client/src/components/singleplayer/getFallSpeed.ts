// File: client/src/components/singleplayer/getFallSpeed.ts
import { MAX_LEVEL } from './constants';

/**
 * Tính toán tốc độ rơi (ms) dựa trên level hiện tại.
 * Tốc độ giảm dần theo hàm mũ từ level 1 đến MAX_LEVEL.
 * @param lvl Level hiện tại (bắt đầu từ 0).
 * @returns Thời gian rơi (milliseconds).
 */
export const getFallSpeed = (lvl: number): number => {
  // Giới hạn level tối đa
  const L = Math.min(lvl, MAX_LEVEL - 1); // lvl từ 0 đến (MAX_LEVEL - 1)

  const START_SPEED = 800;   // Tốc độ ban đầu (level 1)
  const END_SPEED = 16.67; // Tốc độ cuối cùng (~60G)

  if (L >= MAX_LEVEL - 1) {
    return END_SPEED;
  }

  // Tính toán tốc độ dựa trên tiến trình theo hàm mũ
  const progress = L / (MAX_LEVEL - 1); // 0 -> 1
  const speed = START_SPEED * Math.pow(END_SPEED / START_SPEED, progress);

  return Math.max(END_SPEED, speed); // Đảm bảo không nhỏ hơn tốc độ cuối
};