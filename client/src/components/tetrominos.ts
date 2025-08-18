export const TETROMINOS = {
  0: { shape: [[0]], color: '0, 0, 0' }, // Khối rỗng
  I: {
    shape: [
      [0, 'I', 0, 0],
      [0, 'I', 0, 0],
      [0, 'I', 0, 0],
      [0, 'I', 0, 0],
    ],
    color: '80, 227, 230',
  },
  J: {
    shape: [
      [0, 'J', 0],
      [0, 'J', 0],
      ['J', 'J', 0],
    ],
    color: '36, 95, 223',
  },
  // ... Định nghĩa các khối L, O, S, T, Z tương tự
};

export const randomTetromino = () => {
  const tetrominos = 'IJLOSTZ';
  const randTetromino = tetrominos[Math.floor(Math.random() * tetrominos.length)];
  return TETROMINOS[randTetromino as keyof typeof TETROMINOS];
};