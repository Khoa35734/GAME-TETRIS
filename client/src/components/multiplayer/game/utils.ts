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
  combo: number,
  b2b: number
): number => {
  if (lines === 0) return 0;
  let garbage = 0;

  if (pc) {
    garbage = 10;
  } else if (tspinType !== 'none' && lines > 0) {
    if (tspinType === 'mini' && lines === 1) {
      garbage = 0;
    } else {
      const tspinBase = [0, 2, 4, 6];
      garbage = tspinBase[lines] ?? 0;
    }
  } else {
    const standardBase = [0, 0, 1, 2, 4];
    garbage = standardBase[lines] ?? 0;
  }

  const isTetris = tspinType === 'none' && lines === 4;
  const isTSpinClear = tspinType !== 'none' && lines > 0;
  if (b2b >= 1 && (isTetris || isTSpinClear)) {
    garbage += 1;
  }

  if (combo >= 9) garbage += 5;
  else if (combo >= 7) garbage += 4;
  else if (combo >= 5) garbage += 3;
  else if (combo >= 3) garbage += 2;
  else if (combo >= 2) garbage += 1;

  return garbage;
};

// Tiện ích WebRTC
export const isUdpCandidate = (candidate?: RTCIceCandidate | RTCIceCandidateInit | null): boolean => {
  if (!candidate) return false;
  const candString = typeof candidate.candidate === 'string' ? candidate.candidate : '';
  return candString.toLowerCase().includes(' udp ');
};
