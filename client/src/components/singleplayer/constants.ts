// ===========================================================
// 🕹️ TETRIS INPUT HANDLING — Chuẩn theo Tetris Guideline / TETR.IO
// ===========================================================

// --- Độ nhạy phím (Input Sensitivity) ---
// 1 frame = 1000 / 60 ≈ 16.67 ms
// TETR.IO mặc định: DAS = 10F (~167ms), ARR = 2F (~33ms)
export const DAS_FRAMES = 10;                         // frames
export const ARR_FRAMES = 2;                          // frames

export const DAS_DELAY = DAS_FRAMES * (1000 / 60);    // ≈ 167 ms
export const ARR = ARR_FRAMES * (1000 / 60);          // ≈ 33 ms
export const MOVE_INTERVAL = ARR || (1000 / 60);      // fallback 1 frame
export const DCD = 16;
// --- Tốc độ rơi (Gravity) ---
export const MAX_LEVEL = 22; // tốc độ rơi tối đa (chuẩn guideline)

// --- Khóa khối (Lock Delay) ---
export const INACTIVITY_LOCK_MS = 500; // lock sau 0.5s không hoạt động
export const HARD_CAP_MS = 3000;       // lock sau 3s kể từ lần chạm đầu tiên

// --- Hard Drop ---
export const HARD_DROP_DELAY = 100;   // delay giữa các lần hard drop khi giữ phím Space
export const PANEL_WIDTH = 120;       // chiều rộng panel hiển thị
export const SIDE_GAP = 14;           // khoảng cách biên
