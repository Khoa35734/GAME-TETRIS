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
  // Lặp qua từng ô của khối tetromino
  for (let y = 0; y < player.tetromino.length; y += 1) {
    for (let x = 0; x < player.tetromino[y].length; x += 1) {
      // 1. Kiểm tra xem chúng ta có đang ở trên một ô thực của tetromino không
      if (player.tetromino[y][x] !== 0) {
        if (
          // 2. Kiểm tra nước đi có nằm trong chiều cao của màn chơi (y) không
          // Không được đi xuyên qua đáy màn chơi
          !stage[y + player.pos.y + moveY] ||
          // 3. Kiểm tra nước đi có nằm trong chiều rộng của màn chơi (x) không
          !stage[y + player.pos.y + moveY][x + player.pos.x + moveX] ||
          // 4. Kiểm tra xem ô sắp di chuyển tới có phải là ô trống ('clear') không
          stage[y + player.pos.y + moveY][x + player.pos.x + moveX][1] !==
            "clear"
        ) {
          return true; // Va chạm xảy ra
        }
      }
    }
  }
  // Không có va chạm
  return false;
};