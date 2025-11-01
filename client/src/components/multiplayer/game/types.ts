// Re-export các kiểu dữ liệu game cơ bản để các file khác có thể import từ một nơi
export type { Stage as StageType, Cell as StageCell, TSpinType } from '../../../game/gamehelper';

export type MatchOutcome = 'win' | 'lose' | 'draw';
export type MatchSummary = { outcome: MatchOutcome; reason?: string } | null;

// Type cho state của hook core game
export type GameCoreState = {
  player: ReturnType<typeof import('../../../hooks/usePlayer')['usePlayer']>[0];
  stage: ReturnType<typeof import('../../../hooks/useStage')['useStage']>[0];
  rows: number;
  level: number;
  gameOver: boolean;
  locking: boolean;
  hasHeld: boolean;
  rotationState: 0 | 1 | 2 | 3;
  dropTime: number | null;
  combo: number;
  b2b: number;
  lastPlacement: ReturnType<typeof import('../../../hooks/useStage')['useStage']>[4];
  rowsCleared: number;
  isApplyingGarbage: boolean;
};

// Type cho các hàm set state của core game
export type GameCoreSetters = {
  updatePlayerPos: ReturnType<typeof import('../../../hooks/usePlayer')['usePlayer']>[1];
  resetPlayer: ReturnType<typeof import('../../../hooks/usePlayer')['usePlayer']>[2];
  holdSwap: ReturnType<typeof import('../../../hooks/usePlayer')['usePlayer']>[7];
  clearHold: ReturnType<typeof import('../../../hooks/usePlayer')['usePlayer']>[8];
  setQueueSeed: ReturnType<typeof import('../../../hooks/usePlayer')['usePlayer']>[9];
  pushQueue: ReturnType<typeof import('../../../hooks/usePlayer')['usePlayer']>[10];
  setPlayer: ReturnType<typeof import('../../../hooks/usePlayer')['usePlayer']>[11];
  setStage: ReturnType<typeof import('../../../hooks/useStage')['useStage']>[1];
  setRows: (value: React.SetStateAction<number>) => void;
  setLevel: (value: React.SetStateAction<number>) => void;
  setGameOver: (value: React.SetStateAction<boolean>) => void;
  setLocking: (value: React.SetStateAction<boolean>) => void;
  setHasHeld: (value: React.SetStateAction<boolean>) => void;
  setRotationState: (value: React.SetStateAction<0 | 1 | 2 | 3>) => void;
  setDropTime: (value: React.SetStateAction<number | null>) => void;
  setCombo: (value: React.SetStateAction<number>) => void;
  setB2b: (value: React.SetStateAction<number>) => void;
  setIsApplyingGarbage: (value: React.SetStateAction<boolean>) => void;
};
