// ========================================
// SRS (Super Rotation System) Implementation
// Bao gồm: Wall Kick, Floor Kick, 180° Rotation
// ========================================

import type { Player, Stage } from './gamehelper';
import { checkCollision } from './gamehelper';

// ========================================
// 1️⃣ SRS WALL KICK TABLES
// ========================================

// Rotation states: 0 (spawn) → 1 (right) → 2 (180°) → 3 (left) → 0
type RotationState = 0 | 1 | 2 | 3;

// Kick offset format: [x, y] where positive x = right, positive y = down
type KickOffset = [number, number];

// Wall Kick Data cho J, L, S, T, Z (5 vị trí test theo SRS guideline)
const JLSTZ_WALL_KICKS: Record<string, KickOffset[]> = {
  // 0→1 (spawn → right)
  '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  // 1→0 (right → spawn)
  '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  // 1→2 (right → 180°)
  '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  // 2→1 (180° → right)
  '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  // 2→3 (180° → left)
  '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  // 3→2 (left → 180°)
  '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  // 3→0 (left → spawn)
  '3>0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  // 0→3 (spawn → left)
  '0>3': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
};

// Wall Kick Data cho I (bảng riêng)
const I_WALL_KICKS: Record<string, KickOffset[]> = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

// 180° Rotation Kick Data (TETR.IO style - cho phép chui khe dễ hơn)
const JLSTZ_180_KICKS: Record<string, KickOffset[]> = {
  // 0→2 or 2→0
  '0>2': [[0, 0], [0, 1], [1, 1], [-1, 1], [1, 0], [-1, 0]],
  '2>0': [[0, 0], [0, -1], [-1, -1], [1, -1], [-1, 0], [1, 0]],
  // 1→3 or 3→1
  '1>3': [[0, 0], [1, 0], [1, 2], [1, 1], [0, 2], [0, 1]],
  '3>1': [[0, 0], [-1, 0], [-1, 2], [-1, 1], [0, 2], [0, 1]],
};

const I_180_KICKS: Record<string, KickOffset[]> = {
  '0>2': [[0, 0], [0, 1]],
  '2>0': [[0, 0], [0, -1]],
  '1>3': [[0, 0], [1, 0], [2, 0], [1, 0], [2, 0], [0, 0]],
  '3>1': [[0, 0], [-1, 0], [-2, 0], [-1, 0], [-2, 0], [0, 0]],
};

// O piece không cần kick (không xoay)

// ========================================
// 2️⃣ HELPER FUNCTIONS
// ========================================

/**
 * Rotate matrix 90° clockwise
 */
export const rotateMatrix = (matrix: (string | number)[][]): (string | number)[][] => {
  const rotated: (string | number)[][] = [];
  const rows = matrix.length;
  const cols = matrix[0]?.length || 0;

  for (let x = 0; x < cols; x++) {
    const newRow: (string | number)[] = [];
    for (let y = rows - 1; y >= 0; y--) {
      newRow.push(matrix[y][x]);
    }
    rotated.push(newRow);
  }

  return rotated;
};

/**
 * Rotate matrix 90° counter-clockwise
 */
export const rotateMatrixCCW = (matrix: (string | number)[][]): (string | number)[][] => {
  const rotated: (string | number)[][] = [];
  const rows = matrix.length;
  const cols = matrix[0]?.length || 0;

  for (let x = cols - 1; x >= 0; x--) {
    const newRow: (string | number)[] = [];
    for (let y = 0; y < rows; y++) {
      newRow.push(matrix[y][x]);
    }
    rotated.push(newRow);
  }

  return rotated;
};

/**
 * Rotate matrix 180°
 */
export const rotateMatrix180 = (matrix: (string | number)[][]): (string | number)[][] => {
  return matrix.slice().reverse().map(row => row.slice().reverse());
};

/**
 * Get next rotation state
 */
const getNextRotationState = (current: RotationState, direction: 1 | -1 | 2): RotationState => {
  if (direction === 2) {
    // 180° rotation
    return ((current + 2) % 4) as RotationState;
  }
  // Clockwise (+1) or Counter-clockwise (-1)
  return ((current + direction + 4) % 4) as RotationState;
};

/**
 * Get wall kick table based on piece type
 */
const getKickTable = (pieceType: string, is180: boolean = false): Record<string, KickOffset[]> => {
  if (pieceType === 'O') return {}; // O doesn't kick
  
  if (is180) {
    return pieceType === 'I' ? I_180_KICKS : JLSTZ_180_KICKS;
  }
  
  return pieceType === 'I' ? I_WALL_KICKS : JLSTZ_WALL_KICKS;
};

// ========================================
// 3️⃣ MAIN ROTATION FUNCTION WITH WALL KICK
// ========================================

export interface RotationResult {
  success: boolean;
  newMatrix: (string | number)[][];
  newX: number;
  newY: number;
  newRotationState: RotationState;
  kickIndex?: number; // Which kick was used (0 = no kick, 1-4 = kick positions)
}

/**
 * Thử xoay mảnh với SRS Wall Kick
 * @param player - Player hiện tại
 * @param stage - Board hiện tại
 * @param direction - 1 (CW), -1 (CCW), 2 (180°)
 * @param currentRotationState - Trạng thái xoay hiện tại (0-3)
 * @returns RotationResult với thông tin về xoay thành công hay không
 */
export const tryRotateWithKick = (
  player: Player & { type?: string; rotationState?: RotationState },
  stage: Stage,
  direction: 1 | -1 | 2,
  currentRotationState: RotationState = 0
): RotationResult => {
  const pieceType = player.type || 'T';
  
  // O piece doesn't rotate
  if (pieceType === 'O') {
    return {
      success: false,
      newMatrix: player.tetromino,
      newX: player.pos.x,
      newY: player.pos.y,
      newRotationState: currentRotationState,
    };
  }

  // Rotate matrix
  let rotatedMatrix: (string | number)[][];
  if (direction === 2) {
    rotatedMatrix = rotateMatrix180(player.tetromino);
  } else if (direction === 1) {
    rotatedMatrix = rotateMatrix(player.tetromino);
  } else {
    rotatedMatrix = rotateMatrixCCW(player.tetromino);
  }

  const nextState = getNextRotationState(currentRotationState, direction);
  const is180 = direction === 2;
  
  // Get kick table
  const kickTable = getKickTable(pieceType, is180);
  const kickKey = `${currentRotationState}>${nextState}`;
  const kicks = kickTable[kickKey] || [[0, 0]];

  // Try each kick offset
  for (let i = 0; i < kicks.length; i++) {
    const [kickX, kickY] = kicks[i];
    const testX = player.pos.x + kickX;
    const testY = player.pos.y - kickY; // Note: kickY positive = move down, but our y increases downward

    const testPlayer = {
      ...player,
      tetromino: rotatedMatrix,
      pos: { x: testX, y: testY },
    };

    // Check collision
    if (!checkCollision(testPlayer, stage, { x: 0, y: 0 })) {
      // Success!
      return {
        success: true,
        newMatrix: rotatedMatrix,
        newX: testX,
        newY: testY,
        newRotationState: nextState,
        kickIndex: i,
      };
    }
  }

  // All kicks failed
  return {
    success: false,
    newMatrix: player.tetromino,
    newX: player.pos.x,
    newY: player.pos.y,
    newRotationState: currentRotationState,
  };
};

// ========================================
// 4️⃣ FLOOR KICK (Bonus feature)
// ========================================

/**
 * Thử nâng mảnh lên 1-2 ô để xoay được (Floor Kick)
 * Gọi sau khi tryRotateWithKick thất bại
 */
export const tryFloorKick = (
  player: Player & { type?: string; rotationState?: RotationState },
  stage: Stage,
  direction: 1 | -1 | 2,
  currentRotationState: RotationState = 0
): RotationResult => {
  // Try lifting up 1 or 2 cells
  for (let liftY = 1; liftY <= 2; liftY++) {
    const liftedPlayer = {
      ...player,
      pos: { x: player.pos.x, y: player.pos.y - liftY },
    };

    const result = tryRotateWithKick(liftedPlayer, stage, direction, currentRotationState);
    
    if (result.success) {
      return result;
    }
  }

  return {
    success: false,
    newMatrix: player.tetromino,
    newX: player.pos.x,
    newY: player.pos.y,
    newRotationState: currentRotationState,
  };
};

// ========================================
// 5️⃣ COMBINED ROTATION (Wall Kick + Floor Kick)
// ========================================

/**
 * Thử xoay với đầy đủ Wall Kick và Floor Kick
 */
export const tryRotate = (
  player: Player & { type?: string; rotationState?: RotationState },
  stage: Stage,
  direction: 1 | -1 | 2,
  currentRotationState: RotationState = 0
): RotationResult => {
  // Try normal wall kick first
  const wallKickResult = tryRotateWithKick(player, stage, direction, currentRotationState);
  
  if (wallKickResult.success) {
    return wallKickResult;
  }

  // If wall kick failed, try floor kick
  const floorKickResult = tryFloorKick(player, stage, direction, currentRotationState);
  
  return floorKickResult;
};
