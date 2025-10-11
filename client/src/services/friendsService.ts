import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface Friend {
  userId: number;
  username: string;
  email: string;
  createdAt: string;
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

// Lấy danh sách bạn bè
export const getFriends = async (): Promise<{ success: boolean; friends?: Friend[]; message?: string }> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    const response = await axios.get(`${API_BASE_URL}/friends`, {
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

// Lấy danh sách lời mời kết bạn
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

    const response = await axios.get(`${API_BASE_URL}/friends/requests`, {
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

// Tìm user theo user_id
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
      `${API_BASE_URL}/friends/search`,
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

// Gửi lời mời kết bạn
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
      `${API_BASE_URL}/friends/request`,
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

// Chấp nhận lời mời kết bạn
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
      `${API_BASE_URL}/friends/accept`,
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

// Từ chối lời mời kết bạn
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
      `${API_BASE_URL}/friends/reject`,
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

// Xóa bạn bè
export const removeFriend = async (friendId: number): Promise<{
  success: boolean;
  message?: string;
}> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    const response = await axios.delete(`${API_BASE_URL}/friends/${friendId}`, {
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
