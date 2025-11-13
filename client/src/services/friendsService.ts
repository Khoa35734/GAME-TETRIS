import axios from 'axios';
import { getApiBaseUrl } from './apiConfig';
import { tokenStore } from './tokenStore';

const getApiUrl = () => getApiBaseUrl();

export interface Friend {
  userId: number;
  username: string;
  email: string;
  createdAt: string;
  isOnline?: boolean; // Online status
  presenceStatus?: 'online' | 'offline' | 'in_game';
  gameMode?: 'single' | 'multi';
  inGameSince?: number;
}

export interface FriendRequest {
  userId: number;
  username: string;
  email: string;
  requestedAt: string;
}

export interface SearchResult {
  userId: number;
  username: string;
  email: string;
  createdAt: string;
  relationshipStatus: 'none' | 'requested' | 'accepted' | 'blocked';
  isOutgoing: boolean;
}

type ApiResponse<T extends object = Record<string, unknown>> = {
  success: boolean;
  message?: string;
} & T;

const normalizeToken = (token: string | null | undefined): string | null => {
  if (!token) return null;
  const trimmed = token.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
  return trimmed;
};

const getAuthToken = (): string | null => {
  const fromStore = normalizeToken(tokenStore.getAccessToken());
  if (fromStore) {
    console.log('[FriendsService] ✅ Using token from tokenStore');
    return fromStore;
  }

  const fromStorage = normalizeToken(localStorage.getItem('tetris:token'));
  if (fromStorage) {
    console.log('[FriendsService] ✅ Using token from localStorage');
    return fromStorage;
  }

  console.warn('[FriendsService] ❌ No valid token found');
  return null;
};

export const getFriends = async (): Promise<{ success: boolean; friends?: Friend[]; message?: string }> => {
  try {
    const token = getAuthToken();
    if (!token) {
      console.error('[friendsService] ❌ Cannot fetch friends - no token');
      return { success: false, message: 'Not authenticated' };
    }

    console.log('[friendsService] 🔍 Fetching friends with token:', token.substring(0, 20) + '...');

    const response = await axios.get<ApiResponse<{ friends?: Friend[] }>>(`${getApiUrl()}/friends`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('[friendsService] ✅ Friends fetched successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[friendsService] ❌ Get friends error:', error.response?.status, error.response?.data);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch friends',
    };
  }
};

export const getFriendRequests = async (): Promise<{
  success: boolean;
  incoming?: FriendRequest[];
  outgoing?: FriendRequest[];
  message?: string;
}> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    const response = await axios.get<
      ApiResponse<{ incoming?: FriendRequest[]; outgoing?: FriendRequest[] }>
    >(`${getApiUrl()}/friends/requests`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  } catch (error: any) {
    console.error('[friendsService] Get requests error:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch requests',
    };
  }
};

export const searchUser = async (userId: number): Promise<{
  success: boolean;
  user?: SearchResult;
  message?: string;
}> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    const response = await axios.post<ApiResponse<{ user?: SearchResult }>>(
      `${getApiUrl()}/friends/search`,
      { userId },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('[friendsService] Search error:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to search user',
    };
  }
};

export const sendFriendRequest = async (friendId: number): Promise<{
  success: boolean;
  message?: string;
}> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    const response = await axios.post<ApiResponse>(
      `${getApiUrl()}/friends/request`,
      { friendId },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('[friendsService] Send request error:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to send request',
    };
  }
};

export const acceptFriendRequest = async (friendId: number): Promise<{
  success: boolean;
  message?: string;
}> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    const response = await axios.post<ApiResponse>(
      `${getApiUrl()}/friends/accept`,
      { friendId },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('[friendsService] Accept request error:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to accept request',
    };
  }
};

export const rejectFriendRequest = async (friendId: number): Promise<{
  success: boolean;
  message?: string;
}> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    const response = await axios.post<ApiResponse>(
      `${getApiUrl()}/friends/reject`,
      { friendId },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('[friendsService] Reject request error:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to reject request',
    };
  }
};

export const removeFriend = async (friendId: number): Promise<{
  success: boolean;
  message?: string;
}> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    const response = await axios.delete<ApiResponse>(`${getApiUrl()}/friends/${friendId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  } catch (error: any) {
    console.error('[friendsService] Remove friend error:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to remove friend',
    };
  }
};
