import axios from 'axios';
import { getApiBaseUrl } from './apiConfig';

// Base URL luôn đúng (VD: http://192.168.10.108:4000/api)
const api = axios.create({
  baseURL: getApiBaseUrl(),
});

// Tự động gắn Authorization header
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('tetris:token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('authToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
