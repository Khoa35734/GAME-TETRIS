// Định nghĩa các kiểu dữ liệu sẽ được sử dụng trong các hàm
export type Player = {
  pos: { x: number; y: number };
  tetromino: (string | number)[][];
  collided: boolean;
};

type Cell = [string | number, string];

export type Stage = Cell[][];

export const STAGE_WIDTH: number = 12;
export const END_BUFFER_ROWS: number = 3; // số hàng trên cùng ẩn cho điều kiện end game
export const STAGE_HEIGHT: number = 20 + END_BUFFER_ROWS;

// Hàm tạo màn chơi giờ đây sẽ trả về kiểu Stage đã được định nghĩa
export const createStage = (): Stage =>
  Array.from(Array(STAGE_HEIGHT), () =>
    new Array(STAGE_WIDTH).fill([0, "clear"])
  );

// Thêm kiểu dữ liệu cho các tham số của hàm để tăng tính rõ ràng và an toàn
export const checkCollision = (
  player: Player,
  stage: Stage,
  { x: moveX, y: moveY }: { x: number; y: number }
): boolean => {
  // Dùng vòng lặp for truyền thống để có thể return ngay khi phát hiện va chạm
  for (let y = 0; y < player.tetromino.length; y += 1) {
    for (let x = 0; x < player.tetromino[y].length; x += 1) {
      // 1. Kiểm tra xem ô đang xét có phải là một phần của khối không
      if (player.tetromino[y][x] !== 0) {
        // 2. Tọa độ mới của ô trên sân chơi
        const newY = y + player.pos.y + moveY;
        const newX = x + player.pos.x + moveX;

        // 3. Kiểm tra va chạm với tường (trái/phải)
        if (newX < 0 || newX >= STAGE_WIDTH) {
          return true;
        }


        // Kiểm tra va chạm với đáy sân chơi (chiều cao đã gồm buffer)

        if (newY >= STAGE_HEIGHT) {
          return true;
        }

        // 5. Kiểm tra va chạm với các khối đã có trên sân chơi
        // Chỉ kiểm tra khi ô nằm trong sân chơi (newY >= 0)
        if (newY >= 0 && stage[newY][newX][1] !== "clear") {
          return true;
        }
      }
    }
  }

  // 6. Nếu không có va chạm nào, trả về false
  return false;
};
// Hàm tính toán vị trí ghost block
export const getGhostPosition = (player: Player, stage: Stage): { x: number; y: number } => {
  if (!player || !stage) return { x: 0, y: 0 };

  const ghost = { ...player, pos: { ...player.pos } };


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