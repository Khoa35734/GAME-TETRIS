// --- DAS/ARR Movement Settings (TETR.IO style) ---
export const DAS_DELAY: number = 120; // Delayed Auto Shift (ms) - có thể điều chỉnh trong settings
export const ARR: number = 40; // Auto Repeat Rate (ms) - 0 = instant, 40 = normal (giống Tetris.tsx)
export const MOVE_INTERVAL: number = ARR || 16; // Fallback cho ARR

// --- SRS/TETR.IO Settings ---
export const ENABLE_180_ROTATION: boolean = true; // Bật xoay 180°

// --- Gravity/Speed Settings ---
export const MAX_LEVEL = 22; // Level tối đa

// --- Lock Delay Settings ---
export const INACTIVITY_LOCK_MS = 750; // Không thao tác trong 0.75s → lock
export const HARD_CAP_MS = 3000; // Sau 3s từ lúc chạm đất đầu tiên → lock ngay

// --- AFK Detection ---
export const AFK_TIMEOUT_MS = 300000; // 300 seconds (5 minutes)
export const AFK_ENABLED = true; // Enable AFK detection

// --- Hard Drop Spam ---
export const HARD_DROP_SPAM_INTERVAL = 200; // 200ms between drops = 5 drops/second
