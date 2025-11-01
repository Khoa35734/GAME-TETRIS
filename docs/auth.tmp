// Authentication Service - Kết nối với backend API
import { getApiBaseUrl } from './apiConfig';

const getApiUrl = () => `${getApiBaseUrl()}/auth`;

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: {
    accountId: number;
    username: string;
    email: string;
    role?: string;
  };
}

export const authService = {
  /**
   * Đăng ký tài khoản mới
   */
  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${getApiUrl()}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (data.success && data.token) {
        // Lưu token và user info vào localStorage
        localStorage.setItem('tetris:token', data.token);
        localStorage.setItem('tetris:user', JSON.stringify({
          accountId: data.user.accountId,
          username: data.user.username,
          email: data.user.email,
          role: data.user.role || 'player',
          isGuest: false
        }));
      }

      return data;
    } catch (error) {
      console.error('[AuthService] Register error:', error);
      return {
        success: false,
        message: 'Không thể kết nối đến server. Vui lòng thử lại sau.'
      };
    }
  },

  /**
   * Đăng nhập
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${getApiUrl()}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success && data.token) {
        // Lưu token và user info vào localStorage
        localStorage.setItem('tetris:token', data.token);
        localStorage.setItem('tetris:user', JSON.stringify({
          accountId: data.user.accountId,
          username: data.user.username,
          email: data.user.email,
          role: data.user.role || 'player',
          isGuest: false
        }));
      }

      return data;
    } catch (error) {
      console.error('[AuthService] Login error:', error);
      return {
        success: false,
        message: 'Không thể kết nối đến server. Vui lòng thử lại sau.'
      };
    }
  },

  /**
   * Xác thực token
   */
  async verifyToken(): Promise<AuthResponse | null> {
    const token = localStorage.getItem('tetris:token');
    if (!token) return null;

    try {
      const response = await fetch(`${getApiUrl()}/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!data.success) {
        // Token không hợp lệ, xóa localStorage
        this.logout();
        return null;
      }

      return data;
    } catch (error) {
      console.error('[AuthService] Verify error:', error);
      return null;
    }
  },

  /**
   * Đăng xuất
   */
  logout() {
    localStorage.removeItem('tetris:token');
    localStorage.removeItem('tetris:user');
  },

  /**
   * Lấy thông tin user hiện tại từ localStorage
   */
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('tetris:user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  /**
   * Lấy token hiện tại
   */
  getToken() {
    return localStorage.getItem('tetris:token');
  }
};

// Export helper function for getting user data
export function getUserData() {
  try {
    const userStr = localStorage.getItem('tetris:user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}
