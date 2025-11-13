import { io } from 'socket.io-client';
import { getApiBaseUrl } from './services/apiConfig';
import { tokenStore } from './services/tokenStore';

// ==========================
// 🔌 Khởi tạo Server URL
// ==========================
const getServerUrl = (): string => {
  const apiUrl = getApiBaseUrl();
  const serverUrl = apiUrl.replace(/\/api$/, '');
  console.log('[Socket.IO] Using server:', serverUrl);
  return serverUrl;
};

export const SERVER_URL = getServerUrl();

// Tải token đã lưu
tokenStore.hydrateFromLocalStorage();

// ==========================
// ⚙️ Hàm tạo auth payload
// ==========================
const coerceAccountId = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const coerced = Number(trimmed);
    if (Number.isFinite(coerced)) {
      return coerced;
    }
  }
  return undefined;
};

const buildAuthPayload = () => {
  const token = tokenStore.getAccessToken();
  let accountId: number | undefined;
  let username: string | undefined;

  const stored = localStorage.getItem('tetris:user');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      accountId = coerceAccountId(parsed?.accountId);
      if (typeof parsed?.username === 'string' && parsed.username.trim()) {
        username = parsed.username.trim();
      }
    } catch (error) {
      console.warn('[Socket.IO] Failed to parse stored user:', error);
    }
  }

  return { token, accountId, username };
};

// ==========================
// 🧠 Tạo socket
// ==========================
const socket = io(SERVER_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket', 'polling'],
  auth: buildAuthPayload(),
});

// ==========================
// 🧩 Trạng thái nội bộ
// ==========================
let isAuthenticated = false;
let authenticationPromise: Promise<void> | null = null;

// ==========================
// 🔁 Gắn auth và connect lại
// ==========================
const attachAuthAndConnect = () => {
  const auth = buildAuthPayload();
  if (!auth.token || !auth.accountId) {
    console.warn('[Socket.IO] Missing token/accountId; skipping connect');
    return;
  }

  socket.auth = auth;
  console.log('[Socket.IO] Connecting with auth payload:', auth);
  socket.connect();
};

// ==========================
// 🧩 Theo dõi token thay đổi
// ==========================
tokenStore.subscribe((token) => {
  if (token) {
    console.log('[Socket.IO] Token updated, reconnecting...');
    socket.disconnect(); // refresh handshake
    attachAuthAndConnect();
  } else {
    console.log('[Socket.IO] Token cleared, disconnecting');
    isAuthenticated = false;
    authenticationPromise = null;
    socket.disconnect();
  }
});

// ==========================
// 📡 Sự kiện socket
// ==========================
socket.on('connect', () => {
  console.log('[Socket.IO] ✅ Connected:', socket.id);
  isAuthenticated = false;
});

socket.on('disconnect', (reason) => {
  console.warn('[Socket.IO] ❌ Disconnected:', reason);
  isAuthenticated = false;
  authenticationPromise = null;
});

socket.on('user:authenticated', (data) => {
  console.log('[Socket.IO] 🎯 Auth confirmed by server:', data);
  isAuthenticated = true;
  authenticationPromise = null;
});

socket.on('connect_error', (error) => {
  console.error('[Socket.IO] Connection error:', error.message);
});

socket.on('matchmaking:error', (data: { error: string }) => {
  console.error('[Matchmaking] Error:', data.error);
  if (data.error === 'Not authenticated' || data.error === 'Authentication error') {
    alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    tokenStore.clear();
    localStorage.removeItem('tetris:user');
    window.location.href = '/';
  }
});

// ==========================
// 🔍 Hàm công khai
// ==========================
export const authenticateUser = () => {
  attachAuthAndConnect();
};

export const waitForAuthentication = async (): Promise<boolean> => {
  if (isAuthenticated) return true;

  if (!authenticationPromise) {
    authenticationPromise = new Promise<void>((resolve, reject) => {
      const onAuthenticated = () => {
        socket.off('disconnect', onDisconnect);
        resolve();
      };

      const onDisconnect = () => {
        socket.off('user:authenticated', onAuthenticated);
        reject(new Error('Socket disconnected before authentication'));
      };

      socket.once('user:authenticated', onAuthenticated);
      socket.once('disconnect', onDisconnect);
    });

    attachAuthAndConnect();
  }

  try {
    await authenticationPromise;
  } catch (error) {
    console.error('[Socket.IO] waitForAuthentication error:', error);
  }

  return isAuthenticated;
};

// ==========================
// 🚀 Auto connect nếu có token
// ==========================
if (tokenStore.getAccessToken()) {
  attachAuthAndConnect();
}

export default socket;
