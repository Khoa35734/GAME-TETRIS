// Dynamic API URL Configuration
// Tự động detect server IP hoặc dùng manual config

/**
 * Lấy API base URL với ưu tiên:
 * 1. Environment variable (VITE_API_URL)
 * 2. localStorage (manual config)
 * 3. Auto-detect từ hostname
 */
export const getApiBaseUrl = (): string => {
  // Ưu tiên 1: Biến môi trường (VITE_API_URL)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    console.log('[API Config] Using env URL:', envUrl);
    return envUrl;
  }

  // Ưu tiên 2: localStorage (cấu hình thủ công)
  const savedUrl = localStorage.getItem('tetris:apiUrl');
  if (savedUrl) {
    console.log('[API Config] Using saved URL:', savedUrl);
    return savedUrl;
  }

  // Ưu tiên 3: Tự động phát hiện dựa trên hostname
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  if (isLocalhost) {
    // Đang chạy trên môi trường dev local
    const url = 'http://localhost:4000/api';
    console.log('[API Config] Using localhost URL:', url);
    return url;
  } else {
    // Đang truy cập từ LAN, assume server cùng IP với client
    const url = `http://${hostname}:4000/api`;
    console.log('[API Config] Auto-detected LAN URL:', url);
    return url;
  }
};

/**
 * Lưu custom API URL vào localStorage
 */
export const setApiBaseUrl = (url: string): void => {
  localStorage.setItem('tetris:apiUrl', url);
  console.log('[API Config] Saved custom URL:', url);
};

/**
 * Xóa custom API URL (reset về default)
 */
export const resetApiBaseUrl = (): void => {
  localStorage.removeItem('tetris:apiUrl');
  console.log('[API Config] Reset to default URL');
};

/**
 * Test kết nối đến server
 */
export const testServerConnection = async (baseUrl: string): Promise<{
  success: boolean;
  message: string;
  serverInfo?: any;
}> => {
  try {
    const response = await fetch(`${baseUrl.replace('/api', '')}/api/server-info`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return {
        success: false,
        message: `Server returned ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: 'Connected successfully!',
      serverInfo: data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Connection failed',
    };
  }
};

/**
 * Tự động tìm server trong LAN
 * Thử kết nối đến các IP phổ biến trong subnet
 */
export const autoDiscoverServer = async (
  onProgress?: (ip: string, success: boolean) => void
): Promise<string | null> => {
  const hostname = window.location.hostname;

  // Nếu đang ở localhost, không cần discover
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4000/api';
  }

  // Parse IP hiện tại để lấy subnet
  const parts = hostname.split('.');
  // Chỉ hoạt động với địa chỉ IPv4
  if (parts.length !== 4) {
    return null;
  }

  const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
  const candidates: string[] = [];

  // Ưu tiên IP của client trước (khả năng cao nhất)
  candidates.push(hostname);

  // Thử các IP phổ biến trong subnet
  for (let i = 1; i <= 254; i++) {
    if (i.toString() !== parts[3]) {
      candidates.push(`${subnet}.${i}`);
    }
  }

  // Test parallel với timeout ngắn
  const timeout = 800; // 0.8 giây cho mỗi IP

  // Chỉ test 20 IP đầu tiên để tránh quá tải mạng và thời gian chờ lâu
  const testCandidates = candidates.slice(0, 20);

  for (const ip of testCandidates) {
    const baseUrl = `http://${ip}:4000/api`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`http://${ip}:4000/api/server-info`, {
        signal: controller.signal,
        method: 'GET',
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        onProgress?.(ip, true);
        console.log('[Auto Discovery] Found server at:', ip);
        return baseUrl;
      }
    } catch (error) {
      onProgress?.(ip, false);
    }
  }

  return null;
};

export default {
  getApiBaseUrl,
  setApiBaseUrl,
  resetApiBaseUrl,
  testServerConnection,
  autoDiscoverServer,
};
