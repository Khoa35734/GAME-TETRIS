import axios from 'axios';
import { getApiBaseUrl } from './apiConfig';

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

const getAuthToken = (): string | null => {
  return localStorage.getItem('tetris:token');
};

export const getFriends = async (): Promise<{ success: boolean; friends?: Friend[]; message?: string }> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    const response = await axios.get(`${getApiUrl()}/friends`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  } catch (error: any) {
    console.error('[friendsService] Get friends error:', error);
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

    const response = await axios.get(`${getApiUrl()}/friends/requests`, {
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

    const response = await axios.post(
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

    const response = await axios.post(
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

    const response = await axios.post(
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

    const response = await axios.post(
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

    const response = await axios.delete(`${getApiUrl()}/friends/${friendId}`, {
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
