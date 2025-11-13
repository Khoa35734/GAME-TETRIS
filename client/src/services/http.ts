import axios from 'axios';
import { getApiBaseUrl } from './apiConfig';
import { tokenStore } from './tokenStore';

const normalizeToken = (token: string | null | undefined): string | null => {
  if (!token) return null;
  const trimmed = token.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
  return trimmed;
};

const resolveToken = (): string | null => {
  const inMemory = normalizeToken(tokenStore.getAccessToken());
  if (inMemory) return inMemory;

  const keys = ['tetris:token', 'token', 'authToken'] as const;
  for (const key of keys) {
    const candidate = normalizeToken(localStorage.getItem(key));
    if (candidate) return candidate;
  }

  return null;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();

  const token = resolveToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }

  return config;
});

export default api;