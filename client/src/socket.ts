import { io } from 'socket.io-client';
import { getApiBaseUrl } from './services/apiConfig';

// Get server URL from API config (removes /api from base URL)
// This ensures Socket.IO uses the SAME IP as API requests
const getServerUrl = (): string => {
  const apiUrl = getApiBaseUrl();
  // Remove /api suffix to get base server URL
  // e.g., "http://192.168.10.108:4000/api" → "http://192.168.10.108:4000"
  const serverUrl = apiUrl.replace('/api', '');
  console.log('[Socket.IO] Connecting to:', serverUrl);
  return serverUrl;
};

export const SERVER_URL = getServerUrl();

// Track authentication status
let isAuthenticated = false;
let authenticationPromise: Promise<void> | null = null;

const socket = io(SERVER_URL, {
  transports: ['polling', 'websocket'], // Try polling first to avoid WebSocket SSL issues
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  forceNew: false,
  upgrade: true, // Allow upgrade to WebSocket after connecting with polling
});

// Auto-authenticate on connect/reconnect if user is logged in
socket.on('connect', () => {
  console.log('✅ [Socket.IO] Connected! Socket ID:', socket.id);
  
  // Reset authentication status
  isAuthenticated = false;
  
  // Auto-authenticate if user data exists in localStorage
  const userDataStr = localStorage.getItem('tetris:user');
  if (userDataStr) {
    try {
      const userData = JSON.parse(userDataStr);
      if (userData && userData.accountId) {
        // Ensure accountId is a number
        const accountId = typeof userData.accountId === 'string' 
          ? parseInt(userData.accountId, 10) 
          : userData.accountId;
          
        console.log(`🔐 [Socket.IO] Auto-authenticating user ${accountId}...`);
        
        // Create authentication promise
        authenticationPromise = new Promise<void>((resolve) => {
          // Listen for authentication confirmation
          const authConfirmed = () => {
            isAuthenticated = true;
            console.log(`✅ [Socket.IO] Authentication confirmed for user ${accountId}`);
            socket.off('user:authenticated', authConfirmed);
            resolve();
          };
          
          socket.once('user:authenticated', authConfirmed);
          
          // Delay a bit to ensure server is ready, then send auth
          setTimeout(() => {
            socket.emit('user:authenticate', accountId);
            console.log(`📤 [Socket.IO] Authentication request sent for user ${accountId} (type: ${typeof accountId})`);
            
            // Fallback: assume authenticated after 1 second if no response
            setTimeout(() => {
              if (!isAuthenticated) {
                console.log(`⚠️ [Socket.IO] No auth response, assuming authenticated`);
                isAuthenticated = true;
                resolve();
              }
            }, 1000);
          }, 200);
        });
      }
    } catch (error) {
      console.error('❌ [Socket.IO] Failed to parse user data:', error);
    }
  } else {
    console.log('ℹ️ [Socket.IO] No user data found, skipping authentication');
  }
});

socket.on('disconnect', (reason) => {
  console.warn('⚠️ [Socket.IO] Disconnected:', reason);
  isAuthenticated = false;
});

socket.on('connect_error', (error) => {
  console.error('❌ [Socket.IO] Connection error:', error.message);
});

// Handle matchmaking error - show alert if not authenticated
socket.on('matchmaking:error', (data: { error: string }) => {
  console.error('❌ [Matchmaking] Error:', data.error);
  
  if (data.error === 'Not authenticated' || data.error === 'Authentication error') {
    // Clear localStorage and prompt re-login
    localStorage.removeItem('tetris:user');
    
    alert('⚠️ Phiên đăng nhập đã hết hạn!\n\nVui lòng đăng nhập lại để tham gia matchmaking.');
    
    // Redirect to home page
    window.location.href = '/';
  } else {
    alert('❌ Lỗi matchmaking: ' + data.error);
  }
});

// Export function to check if authenticated
export const waitForAuthentication = async (): Promise<boolean> => {
  if (isAuthenticated) {
    return true;
  }
  
  if (authenticationPromise) {
    await authenticationPromise;
    return isAuthenticated;
  }
  
  // No authentication in progress, check localStorage
  const userDataStr = localStorage.getItem('tetris:user');
  if (!userDataStr) {
    return false;
  }
  
  // Wait a bit for auto-auth to kick in
  await new Promise(resolve => setTimeout(resolve, 500));
  return isAuthenticated;
};

export const isUserAuthenticated = () => isAuthenticated;

export default socket;
