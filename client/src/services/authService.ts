import { getApiBaseUrl } from './apiConfig';
import { tokenStore } from './tokenStore';

const getApiUrl = () => `${getApiBaseUrl()}/auth`;

export interface AuthResponse {
  success: boolean;
  message?: string;
  accessToken?: string;
  expiresIn?: number;
  token?: string;
  user?: {
    accountId: number;
    username: string;
    email: string;
    role?: string;
    isGuest?: boolean;
  };
}

type Nullable<T> = T | null;

// ==============================
// 🧱 Storage helpers
// ==============================
const persistUser = (user: AuthResponse['user'] | null) => {
  if (!user) {
    localStorage.removeItem('tetris:user');
    return;
  }

  localStorage.setItem(
    'tetris:user',
    JSON.stringify({
      accountId: user.accountId,
      username: user.username,
      email: user.email,
      role: user.role ?? 'player',
      isGuest: user.isGuest ?? false,
    }),
  );
};

const parseJson = async (response: Response) => {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

// ==============================
// 🧩 Handle Token + User
// ==============================
const handleAuthPayload = (data: AuthResponse): AuthResponse => {
  const token = data.accessToken ?? data.token ?? null;

  if (data.success && data.user) {
    // Persist user first so socket reconnects include identity info.
    persistUser(data.user);
  }

  if (data.success && token) {
    const ttl = typeof data.expiresIn === 'number' ? data.expiresIn : undefined;
    tokenStore.setAccessToken(token, ttl);
  }

  return data;
};

// ==============================
// 🌐 Main Service
// ==============================
export const authService = {
  // ---- Đăng ký ----
  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${getApiUrl()}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, email, password }),
      });

      const data: AuthResponse = await parseJson(response);
      return handleAuthPayload(data);
    } catch (error) {
      console.error('[AuthService] register error:', error);
      return { success: false, message: 'Không thể kết nối tới server. Vui lòng thử lại sau.' };
    }
  },

  // ---- Đăng nhập ----
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${getApiUrl()}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data: AuthResponse = await parseJson(response);
      return handleAuthPayload(data);
    } catch (error) {
      console.error('[AuthService] login error:', error);
      return { success: false, message: 'Không thể kết nối tới server. Vui lòng thử lại sau.' };
    }
  },

  // ---- Gia hạn phiên ----
  async refreshAccessToken(): Promise<AuthResponse> {
    try {
      const response = await fetch(`${getApiUrl()}/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      const data: AuthResponse = await parseJson(response);
      if (!data.success) {
        tokenStore.clear();
        persistUser(null);
        return data;
      }

      return handleAuthPayload(data);
    } catch (error) {
      console.error('[AuthService] refresh error:', error);
      tokenStore.clear();
      persistUser(null);
      return { success: false, message: 'Không thể gia hạn phiên đăng nhập.' };
    }
  },

  // ---- Đăng xuất ----
  async logout(): Promise<void> {
    try {
      await fetch(`${getApiUrl()}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.warn('[AuthService] logout error:', error);
    } finally {
      tokenStore.clear();
      persistUser(null);
    }
  },

  // ---- Lấy hồ sơ người dùng ----
  async fetchProfile(): Promise<AuthResponse | null> {
    const token = tokenStore.getAccessToken();
    if (!token) return null;

    try {
      const response = await fetch(`${getApiUrl()}/me`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        return null;
      }

      const data: AuthResponse = await parseJson(response);
      if (data.success && data.user) {
        persistUser(data.user);
      }
      return data;
    } catch (error) {
      console.error('[AuthService] fetchProfile error:', error);
      return null;
    }
  },

  // ---- Lấy người dùng hiện tại từ localStorage ----
  getCurrentUser(): Nullable<AuthResponse['user']> {
    try {
      const raw = localStorage.getItem('tetris:user');
      return raw ? (JSON.parse(raw) as AuthResponse['user']) : null;
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    return tokenStore.getAccessToken();
  },

  // ---- ✅ Hàm mới: Lấy token hiện tại ----
 

  // ---- ✅ Hàm mới: Kiểm tra token hợp lệ ----
  async verifyToken(): Promise<AuthResponse> {
    const token = tokenStore.getAccessToken();
    if (!token) return { success: false, message: 'No token found' };

    try {
      const response = await fetch(`${getApiUrl()}/verify`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (!response.ok) {
        return { success: false, message: 'Token verification failed' };
      }

      const data: AuthResponse = await parseJson(response);
      if (data.success && data.user) persistUser(data.user);
      return data;
    } catch (error) {
      console.error('[AuthService] verifyToken error:', error);
      return { success: false, message: 'Token verification failed' };
    }
  },
};

// ✅ Helper bên ngoài
export function getUserData() {
  return authService.getCurrentUser();
}
