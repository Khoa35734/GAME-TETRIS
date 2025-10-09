import { io } from 'socket.io-client';

// Use env or fall back to current host on port 4000 (LAN-friendly)
const envUrl = (import.meta as any).env?.VITE_SERVER_URL;
const derivedUrl = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:4000`
  : 'http://localhost:4000';
export const SERVER_URL = envUrl || derivedUrl;

const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
});

export default socket;
