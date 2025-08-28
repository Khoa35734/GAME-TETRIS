// Định nghĩa các kiểu dữ liệu sẽ được sử dụng trong các hàm
export type Player = {
  pos: { x: number; y: number };
  tetromino: (string | number)[][];
  collided: boolean;
};

type Cell = [string | number, string];

export type Stage = Cell[][];

export const STAGE_WIDTH: number = 12;
export const STAGE_HEIGHT: number = 20;

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

        // 4. Kiểm tra va chạm với đáy sân chơi
        if (newY >= STAGE_HEIGHT) {
          return true;
        }

        // 5. Kiểm tra va chạm với các khối đã có trên sân chơi
        // Chỉ kiểm tra khi ô nằm trong sân chơi (newY >= 0)
        if (newY >= 0 && stage[newY][newX][1] !== 'clear') {
          return true;
        }
      }
    }
  }

  // 6. Nếu không có va chạm nào, trả về false
  return false;
};