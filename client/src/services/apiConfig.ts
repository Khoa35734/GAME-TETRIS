// Dynamic API URL Configuration
// Tự động detect server IP hoặc dùng manual config

/**
 * Lấy API base URL với ưu tiên:
 * 1. Environment variable (VITE_API_URL)
 * 2. localStorage (manual config)
 * 3. Auto-detect từ hostname
 */
export const getApiBaseUrl = (): string => {
  // Priority 1: Environment variable
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    console.log('[API Config] Using env URL:', envUrl);
    return envUrl;
  }

  // Priority 2: localStorage (manual config)
  const savedUrl = localStorage.getItem('tetris:apiUrl');
  if (savedUrl) {
    console.log('[API Config] Using saved URL:', savedUrl);
    return savedUrl;
  }

  // Priority 3: Auto-detect based on current hostname
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  if (isLocalhost) {
    // Đang chạy trên localhost
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
  if (parts.length !== 4) {
    return null;
  }

  const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
  const candidates: string[] = [];

  // Thử IP của client trước (most likely)
  candidates.push(hostname);

  // Thử các IP phổ biến trong subnet
  for (let i = 1; i <= 255; i++) {
    if (i.toString() !== parts[3]) {
      candidates.push(`${subnet}.${i}`);
    }
  }

  // Test parallel với timeout ngắn
  const timeout = 1000; // 1 second per attempt
  
  for (const ip of candidates.slice(0, 20)) { // Test first 20 IPs only
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
