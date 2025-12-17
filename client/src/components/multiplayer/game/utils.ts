import type { StageType, StageCell, TSpinType } from './types';
import { MAX_LEVEL } from './constants';

// Tốc độ rơi
export const getFallSpeed = (lvl: number): number => {
  // Cap level tại 22
  const L = Math.min(lvl, MAX_LEVEL - 1); // lvl từ 0-21, map sang level 1-22
  
  const START_SPEED = 800; // 0.8 giây ở level 1
  const END_SPEED = 16.67;  // ~16.67ms ở level 22 (instant)
  
  if (L >= MAX_LEVEL - 1) {
    return END_SPEED;
  }
  
  const progress = L / (MAX_LEVEL - 1); // 0 → 1
  const speed = START_SPEED * Math.pow(END_SPEED / START_SPEED, progress);
  
  return Math.max(END_SPEED, speed);
};

export const cloneStageForNetwork = (stage: StageType): StageType =>
  stage.map(row => row.map(cell => [cell[0], cell[1]] as StageCell));

export const createGarbageRow = (width: number, hole: number): StageCell[] =>
  Array.from({ length: width }, (_, x) => (x === hole ? [0, 'clear'] : ['garbage', 'merged'])) as StageCell[];

export const isPerfectClearBoard = (stage: StageType): boolean =>
  stage.every(row => row.every(([value]) =>
    value === 0 || value === '0' || (typeof value === 'string' && value.startsWith('ghost'))
  ));

export const normalizeBestOf = (value: number): number => {
  const cleaned = Math.max(1, Math.floor(value));
  return cleaned % 2 === 0 ? cleaned + 1 : cleaned;
};

export const getWinsRequired = (bestOf: number): number => Math.floor(normalizeBestOf(bestOf) / 2) + 1;

// Tính toán hàng rác
export const calculateGarbageLines = (
  lines: number,
  tspinType: TSpinType,
  pc: boolean,
  combo: number, // 1-indexed combo count (e.g., 2 means the 2nd consecutive clear)
  b2b: number   // 1-indexed B2B chain count
): number => {
  if (lines === 0) return 0;
  let garbage = 0;

  // 1. Base Damage (per user's TETR.IO spec)
  if (pc) {
    garbage = 10; // Perfect Clear
  } else if (tspinType !== 'none') {
    // T-Spins
    if (tspinType === 'mini') {
      if (lines === 1) garbage = 0;      // Mini T-Spin Single (spec: 0)
      else if (lines === 2) garbage = 1; // Mini T-Spin Double (spec: 1)
    } else { // Full T-Spin
      const tspinBase = [0, 2, 4, 6]; // lines: 0, Single (2), Double (4), Triple (6)
      garbage = tspinBase[lines] ?? 0;
    }
  } else {
    // Standard Clears
    const standardBase = [0, 0, 1, 2, 4]; // lines: 0, Single (0), Double (1), Triple (2), Quad (4)
    garbage = standardBase[lines] ?? 0;
  }

  // 2. B2B (Back-to-Back) Bonus
  const isHardClear = (tspinType !== 'none' && lines > 0) || (tspinType === 'none' && lines === 4);
  if (b2b > 1 && isHardClear) {
    // Bonus applies from the 2nd consecutive hard clear onwards
    garbage += 1;
  }

  // 3. Combo Bonus (per user's TETR.IO spec)
  // Index of table corresponds to combo count.
  const comboTable = [0, 0, 1, 1, 2, 2, 3, 3]; 
  if (combo >= 2) {
    const comboBonus = comboTable[Math.min(combo, comboTable.length - 1)];
    garbage += comboBonus;
  }

  return garbage;
};

// Tiện ích WebRTC
export const isUdpCandidate = (candidate?: RTCIceCandidate | RTCIceCandidateInit | null): boolean => {
  if (!candidate) return false;
  const candString = typeof candidate.candidate === 'string' ? candidate.candidate : '';
  return candString.toLowerCase().includes(' udp ');
};
