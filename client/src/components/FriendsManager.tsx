import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import socket from '../socket'; // Import socket
import type { Friend, FriendRequest, SearchResult } from '../services/friendsService';
import {
  getFriends,
  getFriendRequests,
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from '../services/friendsService';

interface FriendsManagerProps {
  onBack: () => void;
}

// Animation: Slide in from right
const slideInFromRight = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

// Animation: Fade in backdrop
const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

// Backdrop overlay
const Backdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  z-index: 1999;
  animation: ${fadeIn} 0.3s ease-out;
`;

// Main container - slides from right
const Container = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  width: 500px;
  max-width: 90vw;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-left: 2px solid rgba(78, 205, 196, 0.3);
  box-shadow: -5px 0 30px rgba(0, 0, 0, 0.5);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
  color: white;
  font-family: 'Pixcel', monospace;
  z-index: 2000;
  animation: ${slideInFromRight} 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.3);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(78, 205, 196, 0.5);
    border-radius: 4px;

    &:hover {
      background: rgba(78, 205, 196, 0.7);
    }
  }
`;

const BackButton = styled.button`
  position: sticky;
  top: 10px;
  margin-bottom: 20px;
  padding: 10px 20px;
  font-family: 'Pixcel', monospace;
  font-size: 1rem;
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid #666;
  border-radius: 5px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;

  &:hover {
    background: rgba(0, 0, 0, 0.9);
    border-color: #4af;
    transform: translateX(-5px);
  }
`;

const Title = styled.h1`
  text-align: center;
  font-size: 1.8rem;
  margin-bottom: 20px;
  margin-top: 10px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  color: #4ecdc4;
`;

const TabContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 10px 18px;
  font-size: 0.9rem;
  font-family: 'Pixcel', monospace;
  background: ${(props) => (props.$active ? 'rgba(78, 205, 196, 0.3)' : 'rgba(0, 0, 0, 0.6)')};
  border: 2px solid ${(props) => (props.$active ? '#4ecdc4' : '#444')};
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(78, 205, 196, 0.2);
    border-color: #4ecdc4;
  }
`;

const SearchSection = styled.div`
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid #444;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  background: #222;
  border: 2px solid #555;
  border-radius: 5px;
  color: white;
  margin-bottom: 10px;

  &:focus {
    outline: none;
    border-color: #4af;
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'danger' | 'success' }>`
  padding: 10px 20px;
  font-size: 0.9rem;
  font-family: 'Pixcel', monospace;
  background: ${(props) => {
    if (props.variant === 'danger') return 'rgba(244, 67, 54, 0.2)';
    if (props.variant === 'success') return 'rgba(76, 175, 80, 0.2)';
    return 'rgba(78, 205, 196, 0.2)';
  }};
  border: 1px solid
    ${(props) => {
      if (props.variant === 'danger') return '#f44';
      if (props.variant === 'success') return '#4caf50';
      return '#4ecdc4';
    }};
  border-radius: 5px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const UserCard = styled.div`
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid #444;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;

  &:hover {
    border-color: #4ecdc4;
    background: rgba(0, 0, 0, 0.7);
  }
`;

const UserInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const UserHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const OnlineIndicator = styled.div<{ $isOnline: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${(props) => (props.$isOnline ? '#4ecdc4' : '#666')};
  box-shadow: ${(props) =>
    props.$isOnline ? '0 0 8px rgba(78, 205, 196, 0.8)' : 'none'};
  flex-shrink: 0;
  position: relative;

  ${(props) =>
    props.$isOnline &&
    `
    &::after {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 2px solid rgba(78, 205, 196, 0.3);
      animation: pulse 2s ease-in-out infinite;
    }
  `}

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.5;
    }
  }
`;

const Username = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  color: #4ecdc4;
`;

const UserDetail = styled.div`
  font-size: 0.9rem;
  color: #888;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
`;

const Message = styled.div<{ type: 'success' | 'error' | 'info' }>`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 15px 30px;
  border-radius: 8px;
  text-align: center;
  font-size: 1rem;
  font-weight: bold;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  animation: slideDown 0.3s ease-out;

  ${(props) => {
    if (props.type === 'success')
      return 'background: rgba(76, 175, 80, 0.95); color: #fff; border: 2px solid #4caf50;';
    if (props.type === 'error')
      return 'background: rgba(244, 67, 54, 0.95); color: #fff; border: 2px solid #f44;';
    return 'background: rgba(78, 205, 196, 0.95); color: #fff; border: 2px solid #4ecdc4;';
  }}

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translate(-50%, -20px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: #888;
  font-size: 1.1rem;
`;

const FriendsManager: React.FC<FriendsManagerProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'friends') {
      loadFriends();
    } else if (activeTab === 'requests') {
      loadRequests();
    }
  }, [activeTab]);

  // Presence tracking via socket events
  useEffect(() => {
    const handleUserOnline = (userId: number) => {
      setFriends((prev) => prev.map((f) => f.userId === userId
        ? { ...f, isOnline: true, presenceStatus: 'online', gameMode: undefined, inGameSince: undefined }
        : f));
    };

    const handleUserOffline = (userId: number) => {
      setFriends((prev) => prev.map((f) => f.userId === userId
        ? { ...f, isOnline: false, presenceStatus: 'offline', gameMode: undefined, inGameSince: undefined }
        : f));
    };

    const handlePresenceUpdate = (payload: any) => {
      const { userId, status, mode, since } = payload || {};
      if (typeof userId !== "number") return;
      setFriends((prev) => prev.map((f) => f.userId === userId
        ? {
            ...f,
            isOnline: status === 'offline' ? false : true,
            presenceStatus: status,
            gameMode: mode,
            inGameSince: since,
          }
        : f));
    };

    console.log('👂 [FriendsManager] Registering presence listeners');
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);
    socket.on('presence:update', handlePresenceUpdate);

    return () => {
      console.log('🔇 [FriendsManager] Cleaning up presence listeners');
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
      socket.off('presence:update', handlePresenceUpdate);
    };
  }, []);

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadFriends = async () => {
    setLoading(true);
    const result = await getFriends();
    setLoading(false);

    if (result.success && result.friends) {
      setFriends(result.friends);
    } else {
      showMessage(result.message || 'Lỗi khi tải danh sách bạn bè', 'error');
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    const result = await getFriendRequests();
    setLoading(false);

    if (result.success) {
      setIncomingRequests(result.incoming || []);
      setOutgoingRequests(result.outgoing || []);
    } else {
      showMessage(result.message || 'Lỗi khi tải lời mời', 'error');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      showMessage('Vui lòng nhập User ID', 'error');
      return;
    }

    const userId = parseInt(searchQuery.trim());
    if (isNaN(userId)) {
      showMessage('User ID phải là số', 'error');
      return;
    }

    setLoading(true);
    const result = await searchUser(userId);
    setLoading(false);

    if (result.success && result.user) {
      setSearchResult(result.user);
    } else {
      setSearchResult(null);
      showMessage(result.message || 'Không tìm thấy user', 'error');
    }
  };

  const handleSendRequest = async (friendId: number) => {
    const result = await sendFriendRequest(friendId);
    if (result.success) {
      showMessage('Đã gửi lời mời kết bạn!', 'success');
      if (searchResult) {
        setSearchResult({ ...searchResult, relationshipStatus: 'requested', isOutgoing: true });
      }
    } else {
      showMessage(result.message || 'Lỗi khi gửi lời mời', 'error');
    }
  };

  const handleAcceptRequest = async (friendId: number) => {
    const result = await acceptFriendRequest(friendId);
    if (result.success) {
      showMessage('Đã chấp nhận lời mời!', 'success');
      loadRequests();
    } else {
      showMessage(result.message || 'Lỗi khi chấp nhận', 'error');
    }
  };

  const handleRejectRequest = async (friendId: number) => {
    const result = await rejectFriendRequest(friendId);
    if (result.success) {
      showMessage('Đã từ chối lời mời', 'info');
      loadRequests();
    } else {
      showMessage(result.message || 'Lỗi khi từ chối', 'error');
    }
  };

  const handleRemoveFriend = async (friendId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa bạn bè này?')) return;

    const result = await removeFriend(friendId);
    if (result.success) {
      showMessage('Đã xóa bạn bè', 'info');
      loadFriends();
    } else {
      showMessage(result.message || 'Lỗi khi xóa', 'error');
    }
  };

  return (
    <Container>
      <BackButton onClick={onBack}>← Quay lại</BackButton>
      <Title>👥 Quản lý bạn bè</Title>

      {message && <Message type={message.type}>{message.text}</Message>}

      <TabContainer>
        <Tab $active={activeTab === 'friends'} onClick={() => setActiveTab('friends')}>
          Bạn bè ({friends.length})
        </Tab>
        <Tab $active={activeTab === 'requests'} onClick={() => setActiveTab('requests')}>
          Lời mời ({incomingRequests.length})
        </Tab>
        <Tab $active={activeTab === 'search'} onClick={() => setActiveTab('search')}>
          Tìm bạn
        </Tab>
      </TabContainer>

      {/* Search Tab */}
      {activeTab === 'search' && (
        <SearchSection>
          <h3>🔍 Tìm kiếm bạn bè bằng User ID</h3>
          <SearchInput
            type="text"
            placeholder="Nhập User ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? 'Đang tìm...' : 'Tìm kiếm'}
          </Button>

          {searchResult && (
            <UserCard style={{ marginTop: '20px' }}>
              <UserInfo>
                <Username>{searchResult.username}</Username>
                <UserDetail>User ID: #{searchResult.userId}</UserDetail>
                <UserDetail>{searchResult.email}</UserDetail>
              </UserInfo>
              <ButtonGroup>
                {searchResult.relationshipStatus === 'none' && (
                  <Button variant="success" onClick={() => handleSendRequest(searchResult.userId)}>
                    ➕ Kết bạn
                  </Button>
                )}
                {searchResult.relationshipStatus === 'requested' && searchResult.isOutgoing && (
                  <Button disabled>⏳ Đã gửi lời mời</Button>
                )}
                {searchResult.relationshipStatus === 'requested' && !searchResult.isOutgoing && (
                  <>
                    <Button variant="success" onClick={() => handleAcceptRequest(searchResult.userId)}>
                      ✓ Chấp nhận
                    </Button>
                    <Button variant="danger" onClick={() => handleRejectRequest(searchResult.userId)}>
                      ✕ Từ chối
                    </Button>
                  </>
                )}
                {searchResult.relationshipStatus === 'accepted' && <Button disabled>✓ Đã là bạn bè</Button>}
              </ButtonGroup>
            </UserCard>
          )}
        </SearchSection>
      )}

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <div>
          {loading ? (
            <EmptyState>Đang tải...</EmptyState>
          ) : friends.length === 0 ? (
            <EmptyState>Chưa có bạn bè nào 😢</EmptyState>
          ) : (
            friends.map((friend) => (
              <UserCard key={friend.userId}>
                <UserInfo>
                  <UserHeader>
                    <OnlineIndicator $isOnline={friend.isOnline || false} />
                    <Username>{friend.username}</Username>
                  </UserHeader>
                  <UserDetail>User ID: #{friend.userId}</UserDetail>
                  <UserDetail>{friend.email}</UserDetail>
                  <UserDetail
                    style={{
                      color: friend.presenceStatus === 'in_game' ? '#ffc107' : friend.isOnline ? '#4ecdc4' : '#666',
                      fontSize: '0.85rem',
                    }}
                  >
                    {friend.presenceStatus === 'in_game'
                      ? (() => {
                          const minutes = friend.inGameSince ? Math.max(0, Math.floor((Date.now() - friend.inGameSince) / 60000)) : 0;
                          const modeLabel = friend.gameMode === 'multi' ? 'multi' : 'single';
                          return `Đang trong trận (${modeLabel}) • ${minutes} phút`;
                        })()
                      : friend.isOnline ? '🟢 Online' : '⚪ Offline'}
                  </UserDetail>
                </UserInfo>
                <Button variant="danger" onClick={() => handleRemoveFriend(friend.userId)}>
                  ✕ Xóa bạn
                </Button>
              </UserCard>
            ))
          )}
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div>
          <h3>📥 Lời mời đến ({incomingRequests.length})</h3>
          {incomingRequests.length === 0 ? (
            <EmptyState>Không có lời mời mới</EmptyState>
          ) : (
            incomingRequests.map((req) => (
              <UserCard key={req.userId}>
                <UserInfo>
                  <Username>{req.username}</Username>
                  <UserDetail>User ID: #{req.userId}</UserDetail>
                  <UserDetail>{req.email}</UserDetail>
                </UserInfo>
                <ButtonGroup>
                  <Button variant="success" onClick={() => handleAcceptRequest(req.userId)}>
                    ✓ Chấp nhận
                  </Button>
                  <Button variant="danger" onClick={() => handleRejectRequest(req.userId)}>
                    ✕ Từ chối
                  </Button>
                </ButtonGroup>
              </UserCard>
            ))
          )}

          <h3 style={{ marginTop: '30px' }}>📤 Lời mời đi ({outgoingRequests.length})</h3>
          {outgoingRequests.length === 0 ? (
            <EmptyState>Chưa gửi lời mời nào</EmptyState>
          ) : (
            outgoingRequests.map((req) => (
              <UserCard key={req.userId}>
                <UserInfo>
                  <Username>{req.username}</Username>
                  <UserDetail>User ID: #{req.userId}</UserDetail>
                  <UserDetail>{req.email}</UserDetail>
                </UserInfo>
                <Button disabled>⏳ Đang chờ</Button>
              </UserCard>
            ))
          )}
        </div>
      )}
    </Container>
  );
};

const FriendsManagerWithBackdrop: React.FC<FriendsManagerProps> = ({ onBack }) => {
  return (
    <>
      <Backdrop onClick={onBack} />
      <FriendsManager onBack={onBack} />
    </>
  );
};

export default FriendsManagerWithBackdrop;
