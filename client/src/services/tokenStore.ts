// src/services/tokenStore.ts
// Token store in-memory + auto hydrate + event listeners

type TokenListener = (token: string | null, expiresAt: number | null) => void;

let accessToken: string | null = null;
let expiresAt: number | null = null;
const listeners = new Set<TokenListener>();

const notify = () => {
  for (const listener of listeners) {
    listener(accessToken, expiresAt);
  }
};

const setToken = (token: string | null, expiresInSeconds?: number) => {
  accessToken = token;
  expiresAt =
    token && typeof expiresInSeconds === "number"
      ? Date.now() + expiresInSeconds * 1000
      : token
      ? expiresAt
      : null;

  // Lưu vào localStorage để khôi phục sau khi reload trang
  if (token) localStorage.setItem("tetris:token", token);
  else localStorage.removeItem("tetris:token");

  notify();
};

export const tokenStore = {
  // Đặt token mới (khi login)
  setAccessToken(token: string, expiresInSeconds?: number) {
    setToken(token, expiresInSeconds);
  },

  // Đọc token từ localStorage lúc app khởi động
  hydrateFromLocalStorage() {
    const token = localStorage.getItem("tetris:token");
    if (token) {
      accessToken = token;
      expiresAt = null;
      notify();
      console.log("💾 [TokenStore] Hydrated token from localStorage");
    }
  },

  // ✅ Cho phép socket.ts gọi trực tiếp
  hydrate(token: string, absoluteExpiry: number) {
    accessToken = token || null;
    expiresAt = absoluteExpiry || null;

    if (token) {
      localStorage.setItem("tetris:token", token);
      console.log("💾 [TokenStore] Hydrated token manually");
    } else {
      localStorage.removeItem("tetris:token");
    }

    notify();
  },

  clear() {
    accessToken = null;
    expiresAt = null;
    localStorage.removeItem("tetris:token");
    notify();
  },

  getAccessToken(): string | null {
    return accessToken;
  },

  getExpiresAt(): number | null {
    return expiresAt;
  },

  getTimeUntilExpiry(): number | null {
    return expiresAt ? expiresAt - Date.now() : null;
  },

  subscribe(listener: TokenListener) {
    listeners.add(listener);
  },

  unsubscribe(listener: TokenListener) {
    listeners.delete(listener);
  },
};
