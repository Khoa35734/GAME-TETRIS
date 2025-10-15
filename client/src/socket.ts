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

const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

// Debug logging
socket.on('connect', () => {
  console.log('✅ [Socket.IO] Connected! Socket ID:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.warn('⚠️ [Socket.IO] Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('❌ [Socket.IO] Connection error:', error.message);
});

export default socket;
