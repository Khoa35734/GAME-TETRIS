import axios from 'axios';
import { getApiBaseUrl } from './apiConfig';

const getApiUrl = () => getApiBaseUrl();

export interface KeyBindings {
  moveLeft: string;
  moveRight: string;
  softDrop: string;
  hardDrop: string;
  rotateClockwise: string;
  rotateCounterClockwise: string;
  rotate180: string;
  hold: string;
  restart: string;
}

export interface UserSettings {
  das_delay_ms?: number;
  arr_ms?: number;
  soft_drop_rate?: number;
  show_next_pieces?: number;
  sound_enabled?: boolean;
  music_enabled?: boolean;
  sound_volume?: number;
  music_volume?: number;
  key_bindings?: KeyBindings;
  theme_preference?: string;
  language_pref?: string;
}

type ApiResponse<T extends object = Record<string, unknown>> = {
  success: boolean;
  message?: string;
} & T;

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  softDrop: 'ArrowDown',
  hardDrop: 'Space',
  rotateClockwise: 'ArrowUp',
  rotateCounterClockwise: 'z',
  rotate180: 'a',
  hold: 'c',
  restart: 'r',
};

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('tetris:token');
};

// Get user settings
export const getUserSettings = async (): Promise<{ success: boolean; settings?: UserSettings; message?: string }> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    const response = await axios.get<ApiResponse<{ settings?: UserSettings }>>(`${getApiUrl()}/settings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('[settingsService] Get settings error:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch settings',
    };
  }
};

// Update user settings
export const updateUserSettings = async (settings: Partial<UserSettings>): Promise<{ success: boolean; message?: string }> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    const response = await axios.put<ApiResponse>(`${getApiUrl()}/settings`, settings, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('[settingsService] Update settings error:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to update settings',
    };
  }
};

// Update only key bindings
export const updateKeyBindings = async (keyBindings: KeyBindings): Promise<{ success: boolean; message?: string }> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    const response = await axios.patch<ApiResponse>(
      `${getApiUrl()}/settings/keys`,
      { key_bindings: keyBindings },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('[settingsService] Update key bindings error:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to update key bindings',
    };
  }
};

// Reset settings to default
export const resetSettings = async (): Promise<{ success: boolean; message?: string }> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    const response = await axios.post<ApiResponse>(`${getApiUrl()}/settings/reset`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('[settingsService] Reset settings error:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to reset settings',
    };
  }
};

// Load key bindings from localStorage (fallback if not logged in)
export const getLocalKeyBindings = (): KeyBindings => {
  const stored = localStorage.getItem('keyBindings');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_KEY_BINDINGS;
    }
  }
  return DEFAULT_KEY_BINDINGS;
};

// Save key bindings to localStorage
export const saveLocalKeyBindings = (keyBindings: KeyBindings): void => {
  localStorage.setItem('keyBindings', JSON.stringify(keyBindings));
};
