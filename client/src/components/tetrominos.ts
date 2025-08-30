export const TETROMINOES = {
  0: { shape: [[0]], color: '0, 0, 0' },
  I: {
    shape: [
      [0, 0, 0, 0],
      ['I', 'I', 'I', 'I'],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: '80, 227, 230',
  },
  J: {
    shape: [
      [0, 0, 0],
      ['J', 'J', 'J'],
      [0, 0, 'J'],
    ],
    color: '36, 95, 223',
  },
  L: {
    shape: [
      [0, 0, 0],
      ['L', 'L', 'L'],
      ['L', 0, 0],
    ],
    color: '223, 173, 36',
  },
  O: {
    shape: [
      ['O', 'O'],
      ['O', 'O'],
    ],
    color: '223, 217, 36',
  },
  S: {
    shape: [
      [0, 0, 0],
      [0, 'S', 'S'],
      ['S', 'S', 0],
    ],
    color: '48, 211, 56',
  },
  T: {
    shape: [
      [0, 0, 0],
      ['T', 'T', 'T'],
      [0, 'T', 0],
    ],
    color: '132, 61, 198',
  },
  Z: {
    shape: [
      [0, 0, 0],
      ['Z', 'Z', 0],
      [0, 'Z', 'Z'],
    ],
    color: '227, 78, 78',
  },
  // Thêm ghost piece
  ghost: {
    shape: [[0]], // Shape không quan trọng vì chúng ta sẽ dùng shape của player
    color: '150, 150, 150, 0.5', // Màu xám trong suốt
  },
};

export type TetrominoTypes = keyof typeof TETROMINOES;