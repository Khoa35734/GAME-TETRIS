// Định nghĩa kiểu cho một khối tetromino
type TetrominoShape = (string | number)[][];

interface Tetromino {
  shape: TetrominoShape;
  color: string;
}

// Định nghĩa kiểu cho đối tượng chứa tất cả các khối tetromino
// Sử dụng index signature để cho phép các key là string (ví dụ: 'I', 'J', 'L', ...)
type Tetrominoes = {
  [key: string]: Tetromino;
};

export const TETROMINOES: Tetrominoes = {
  0: { shape: [[0]], color: "0, 0, 0" },
  I: {
    shape: [
      [0, "I", 0, 0],
      [0, "I", 0, 0],
      [0, "I", 0, 0],
      [0, "I", 0, 0],
    ],
    color: "80, 227, 230",
  },
  J: {
    shape: [
      [0, "J", 0],
      [0, "J", 0],
      ["J", "J", 0],
    ],
    color: "36, 95, 223",
  },
  L: {
    shape: [
      [0, "L", 0],
      [0, "L", 0],
      [0, "L", "L"],
    ],
    color: "223, 173, 36",
  },
  O: {
    shape: [
      ["O", "O"],
      ["O", "O"],
    ],
    color: "223, 217, 36",
  },
  S: {
    shape: [
      [0, "S", "S"],
      ["S", "S", 0],
      [0, 0, 0],
    ],
    color: "48, 211, 56",
  },
  T: {
    shape: [
      ["T", "T", "T"],
      [0, "T", 0],
    ],
    color: "132, 61, 198",
  },
  Z: {
    shape: [
      ["Z", "Z", 0],
      [0, "Z", "Z"],
      [0, 0, 0],
    ],
    color: "227, 78, 78",
  },
};

export const randomTetromino = (): Tetromino => {
  const tetrominoes = "IJLOSTZ";
  const randTetrominoKey =
    tetrominoes[Math.floor(Math.random() * tetrominoes.length)];
  return TETROMINOES[randTetrominoKey];
};