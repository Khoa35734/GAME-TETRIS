// Định nghĩa các kiểu dữ liệu
export type Player = {
  pos: { x: number; y: number };
  tetromino: (string | number)[][];
  collided: boolean;
};

export type Cell = [string | number, string];
export type Stage = Cell[][];

export const STAGE_WIDTH: number = 12;
export const END_BUFFER_ROWS: number = 3; // số hàng trên cùng ẩn cho điều kiện end game
export const STAGE_HEIGHT: number = 20 + END_BUFFER_ROWS;

// Tạo bóng chơi (ghost)
export const getGhostPiecePosition = (player: Player, stage: Stage): { x: number; y: number } => {
  let ghostY = player.pos.y;
  while (!checkCollision(player, stage, { x: 0, y: ghostY + 1 })) {
    ghostY++;
  }
  return { x: player.pos.x, y: ghostY };
};

// Hàm tạo màn chơi
export const createStage = (): Stage =>
  Array.from(Array(STAGE_HEIGHT), () =>
    new Array(STAGE_WIDTH).fill([0, "clear"])
  );

// Kiểm tra va chạm
export const checkCollision = (
  player: Player,
  stage: Stage,
  { x: moveX, y: moveY }: { x: number; y: number }
): boolean => {
  for (let y = 0; y < player.tetromino.length; y += 1) {
    for (let x = 0; x < player.tetromino[y].length; x += 1) {
      // Kiểm tra xem ô đang xét có phải là một phần của khối không
      if (player.tetromino[y][x] !== 0) {
        // Tọa độ mới của ô trên sân chơi
        const newY = y + player.pos.y + moveY;
        const newX = x + player.pos.x + moveX;

        // Kiểm tra va chạm với tường (trái/phải)
        if (newX < 0 || newX >= STAGE_WIDTH) {
          return true;
        }

        // Kiểm tra va chạm với đáy sân chơi (chiều cao đã gồm buffer)
        if (newY >= STAGE_HEIGHT) {
          return true;
        }

        // Kiểm tra va chạm với các khối đã có trên sân chơi
        if (newY >= 0 && stage[newY][newX][1] !== 'clear') {
          return true;
        }
      }
    }
  }

  return false;
};
// Hàm tính toán vị trí ghost piece
export const calculateGhostPosition = (
  player: Player,
  stage: Stage
): { x: number; y: number } => {
  // Tạo bản sao của player để không ảnh hưởng đến player thật
  const ghostPlayer = { ...player };
  let dropDistance = 0;

  // Tìm khoảng cách rơi xuống tối đa
  while (!checkCollision(
    ghostPlayer,
    stage,
    { x: 0, y: dropDistance + 1 }
  )) {
    dropDistance++;
  }

  return {
    x: player.pos.x,
    y: player.pos.y + dropDistance
  };
};

// Hàm lấy tetromino cho ghost piece
export const getGhostTetromino = (player: Player): (string | number)[][] => {
  return player.tetromino.map(row => 
    row.map(cell => cell !== 0 ? 'ghost' : 0)
  );
};

// Kiểm tra end game: có ô đã merged nằm trong vùng buffer (3 hàng trên cùng)
export const isGameOverFromBuffer = (stage: Stage): boolean => {
  for (let y = 0; y < END_BUFFER_ROWS; y++) {
    for (let x = 0; x < STAGE_WIDTH; x++) {
      const cell = stage[y][x];
      if (cell && cell[1] === 'merged' && cell[0] !== 0 && cell[0] !== '0') {
        return true;
      }
    }
  }
  return false;
};

// Hỗ trợ: một ô được xem là "chiếm chỗ" nếu ngoài biên hoặc stage[y][x] không 'clear'
export const isOccupied = (stage: Stage, x: number, y: number): boolean => {
  if (x < 0 || x >= STAGE_WIDTH || y < 0 || y >= STAGE_HEIGHT) return true;
  return stage[y][x][1] !== 'clear';
};

// Phát hiện T-Spin đơn giản: 3/4 góc quanh tâm T bị chiếm + khối hiện tại là T
export const isTSpin = (player: Player, stage: Stage): boolean => {
  // Chỉ áp dụng cho T; giả định matrix 3x3 bao quanh tâm tại (1,1)
  // Nếu không phải 3x3 thì phép kiểm vẫn hợp lệ cho T guideline tiêu chuẩn của ta
  const cx = player.pos.x + 1;
  const cy = player.pos.y + 1;
  const corners = [
    [cx - 1, cy - 1],
    [cx + 1, cy - 1],
    [cx - 1, cy + 1],
    [cx + 1, cy + 1],
  ];
  let occ = 0;
  for (const [x, y] of corners) if (isOccupied(stage, x, y)) occ++;
  return occ >= 3;
};