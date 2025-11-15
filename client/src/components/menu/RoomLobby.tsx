import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import socket from '../../socket';
import { getApiBaseUrl } from '../../services/apiConfig';

type Player = {
  id: string;              // socket.id tren server
  name: string | null;
  ready: boolean;
  alive: boolean;
  ping?: number | null;
};

type ChatMessage = {
  from: string;
  fromName?: string;
  message: string;
  ts: number;
};

type Friend = {
  friendId: number;
  friendUsername: string;
  status: string;
  isOnline: boolean;
};

const RoomLobby: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [players, setPlayers] = useState<Player[]>([]);
  const [host, setHost] = useState<string | null>(null);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [error, setError] = useState('');

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const hasJoinedRef = useRef(false);
  const creatorFlagRef = useRef(false);

  const [isReady, setIsReady] = useState(false);

  // Danh tinh
  const [displayName, setDisplayName] = useState('');
  const [identityReady, setIdentityReady] = useState(false);
  const [_myAccountId, setMyAccountId] = useState<string | null>(null); // accountId (neu co)
  const [mySocketId, setMySocketId] = useState<string | null>(socket.id || null); // socket.id that

  // Ping
  const [_myPing, setMyPing] = useState<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  // Invite friends
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [invitingFriends, setInvitingFriends] = useState<Set<number>>(new Set());

  // Ghi nhan neu ban la nguoi tao phong
  useEffect(() => {
    if (!roomId) {
      creatorFlagRef.current = false;
      return;
    }
    creatorFlagRef.current = sessionStorage.getItem(`roomHost_${roomId}`) === 'true';
  }, [roomId]);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Theo doi socket.id (connect/reconnect)
  useEffect(() => {
    const onConnect = () => setMySocketId(socket.id || null);
    const onReconnect = () => setMySocketId(socket.id || null);
    socket.on('connect', onConnect);
    socket.io.on('reconnect', onReconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.io.off('reconnect', onReconnect);
    };
  }, []);

  // Resolve danh tinh (uu tien user.id/username; fallback socket.id)
  useEffect(() => {
    const resolveIdentity = () => {
      try {
        const raw = localStorage.getItem('tetris:user');
        if (raw) {
          const user = JSON.parse(raw);
          if (user?.id) {
            const accountId = String(user.id);
            setMyAccountId(accountId);
            setDisplayName(user.username || `User_${accountId.slice(0, 6)}`);
            setIdentityReady(true);
            console.log('[RoomLobby] Identity from localStorage:', { accountId, username: user.username });
            return;
          }
        }
      } catch (err) {
        console.warn('[RoomLobby] Failed to parse local user info', err);
      }
      const waitForSocketId = () => {
        if (socket.id) {
          setMySocketId(socket.id);
          setMyAccountId(socket.id);
          setDisplayName(`Guest_${socket.id.slice(0, 6)}`);
          setIdentityReady(true);
          console.log('[RoomLobby] Identity fallback to socket.id:', socket.id);
        } else {
          setTimeout(waitForSocketId, 100);
        }
      };
      waitForSocketId();
    };
    resolveIdentity();
  }, []);

  // Ping tracking
  useEffect(() => {
    pingIntervalRef.current = window.setInterval(() => {
      const ts = Date.now();
      socket.emit('ping', ts);
    }, 2000);

    const onPong = (ts?: number) => {
      if (ts) {
        const ping = Date.now() - ts;
        setMyPing(ping);
        socket.emit('client:ping', ping);
      }
    };
    socket.on('pong', onPong);

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      socket.off('pong', onPong);
    };
  }, []);

  // Room wiring
  useEffect(() => {
    if (!roomId) {
      setError('ID phòng không hợp lệ');
      return;
    }
    if (!identityReady) return;

    const onRoomUpdate = (data: any) => {
      console.log('Room update:', data);
      if (data) {
        setPlayers(data.players || []);
        setHost(data.host || null);
        setMaxPlayers(data.maxPlayers || 2);
      }
    };

    const onRoomChat = (data: ChatMessage) => {
      setChatMessages(prev => [...prev, data]);
    };

    const onGameStarting = () => {
      console.log('[RoomLobby] 🎮 game:starting -> navigate');
      // Don't set hasJoinedRef to false, so cleanup won't emit leave
      hasJoinedRef.current = false;
      navigate(`/versus/${roomId}`);
    };

    const requestSync = () => {
      if (!roomId) return;
      socket.emit('room:sync', roomId, (payload: any) => {
        if (payload?.ok && payload.data) {
          const { players: syncedPlayers = [], host: syncedHost = null, maxPlayers: syncedMax = 2 } = payload.data;
          setPlayers(syncedPlayers);
          setHost(syncedHost);
          setMaxPlayers(syncedMax);
        } else if (payload?.error === 'not-found') {
          setError('Phòng không tồn tại');
          setTimeout(() => navigate('/online'), 2000);
        }
      });
    };

    socket.on('room:update', onRoomUpdate);
    socket.on('room:chat', onRoomChat);
    socket.on('game:starting', onGameStarting);

    if (!hasJoinedRef.current) {
      const nameToUse = displayName || 'Guest';
      socket.emit('room:join', roomId, { name: nameToUse }, (result: any) => {
        if (!result?.ok) {
          switch (result?.error) {
            case 'not-found': setError('Phòng không tồn tại'); break;
            case 'full': setError('Phòng đã đầy (2/2 người chơi)'); break;
            case 'started': setError('Trận đấu đã bắt đầu'); break;
            default: setError('Không thể vào phòng');
          }
          if (roomId) {
            sessionStorage.removeItem(`roomHost_${roomId}`);
            sessionStorage.removeItem(`joined_${roomId}`);
          }
          setTimeout(() => navigate('/online'), 2000);
        } else {
          // danh dau da join
          hasJoinedRef.current = true;
          sessionStorage.setItem(`joined_${roomId}`, 'true');
          if (creatorFlagRef.current && roomId) {
            sessionStorage.removeItem(`roomHost_${roomId}`);
          }

          // >>> ap snapshot ngay neu co
          if (result.data) {
            const { players = [], host = null, maxPlayers = 2 } = result.data;
            setPlayers(players);
            setHost(host);
            setMaxPlayers(maxPlayers);
          }

          // van goi sync de chac chan
          requestSync();
        }
      });
    } else {
      requestSync();
    }

    return () => {
      socket.off('room:update', onRoomUpdate);
      socket.off('room:chat', onRoomChat);
      socket.off('game:starting', onGameStarting);
      
      // Only leave if hasJoinedRef is still true (means we didn't navigate to game)
      if (hasJoinedRef.current && roomId) {
        console.log('[RoomLobby] Cleanup: User left before game started, leaving room', roomId);
        socket.emit('room:leave', roomId);
        sessionStorage.removeItem(`joined_${roomId}`);
        sessionStorage.removeItem(`roomHost_${roomId}`);
      } else {
        console.log('[RoomLobby] Cleanup: hasJoinedRef is false, NOT leaving room (game started)');
      }
    };
  }, [roomId, navigate, identityReady, displayName]);

  // Chat
  const sendChat = () => {
    if (!chatInput.trim() || !roomId) return;
    socket.emit('room:chat', roomId, chatInput.trim(), (ack: any) => {
      if (ack?.ok) setChatInput('');
    });
  };

  // Ready toggle
  const toggleReady = () => {
    if (!roomId) return;
    const newReady = !isReady;
    setIsReady(newReady);
    socket.emit('room:ready', roomId, newReady);
  };

  // Start game: so voi socket.id
  const startGame = () => {
    if (!roomId || host !== mySocketId) return;
    console.log('[RoomLobby] Host starting game for room:', roomId);
    socket.emit('room:startGame', roomId, (result: any) => {
      if (result?.ok) {
        if (result?.data?.players) {
          const joinedPlayers = result.data.players.map((p: any) => ({
            id: p.id || p.playerId,
            name: p.name || p.accountId || 'Người chơi',
            ready: !!p.ready,
            alive: !!p.alive,
          }));
          setPlayers(joinedPlayers);
          setHost(result.data.host || null);
          setMaxPlayers(result.data.maxPlayers || joinedPlayers.length || 2);
        }
      } else {
        console.error('[RoomLobby] Failed to start game:', result?.error);
        setError(result?.error || 'Không thể bắt đầu trận đấu');
      }
    });
  };

  // Friends
  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      const token = localStorage.getItem('tetris:token');
      if (!token) {
        console.warn('[RoomLobby] No token found, cannot fetch friends');
        setLoadingFriends(false);
        return;
      }
      const response = await fetch(`${getApiBaseUrl()}/friends/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) setFriends(data.friends || []);
      }
    } catch (err) {
      console.error('[RoomLobby] Failed to fetch friends:', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  const openInviteModal = () => {
    setShowInviteModal(true);
    fetchFriends();
  };

  const inviteFriend = (friendId: number, friendUsername: string) => {
    if (!roomId) return;
    setInvitingFriends(prev => new Set(prev).add(friendId));
    socket.emit(
      'room:invite',
      { roomId, friendId, friendUsername, inviterName: displayName },
      (response: any) => {
        setInvitingFriends(prev => {
          const next = new Set(prev);
          next.delete(friendId);
          return next;
        });
        if (response?.ok) {
          setChatMessages(prev => [
            ...prev,
            { from: 'system', fromName: 'Hệ thống', message: `✉️ Đã gửi lời mời đến ${friendUsername}`, ts: Date.now() },
          ]);
          setShowInviteModal(false);
        } else {
          alert(`Không thể gửi lời mời: ${response?.error || 'Unknown error'}`);
        }
      }
    );
  };

  if (error) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#000', color: '#fff', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 24, marginBottom: 12 }}>{error}</div>
          <div style={{ fontSize: 14, opacity: 0.7 }}>Đang quay lại...</div>
        </div>
      </div>
    );
  }

  // Dieu kien host/canStart dung socket.id
  const isHost = host === mySocketId;
  const nonHostPlayers = players.filter(p => p.id !== host);
  const allNonHostReady = nonHostPlayers.every(p => p.ready);
  const canStart = isHost && players.length >= 2 && allNonHostReady;

  console.log('[RoomLobby] canStart check:', {
    isHost,
    playersCount: players.length,
    nonHostPlayers: nonHostPlayers.length,
    allNonHostReady,
    canStart,
    players: players.map(p => ({ id: p.id.slice(0, 8), ready: p.ready, isHost: p.id === host })),
  });

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(20,20,22,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => navigate('/online')} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>
          ← Thoát
        </button>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '2px', textAlign: 'center' }}>
          PHÒNG: {roomId}
        </div>
        <div style={{ width: 80 }} />
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', overflow: 'hidden' }}>
        {/* ===== Left: Players ===== */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', background: 'rgba(20,20,22,0.5)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Người chơi ({players.length}/{maxPlayers})
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {players.map((p) => {
              const isMe = p.id === mySocketId;
              const isHostPlayer = p.id === host;
              const nameShown = p.name || p.id.slice(0, 8);

              return (
                <div
                  key={p.id}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    background: isMe ? 'rgba(78, 205, 196, 0.2)' : 'rgba(255,255,255,0.05)',
                    borderRadius: 8,
                    border: isMe ? '1px solid rgba(78, 205, 196, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>{isHostPlayer ? '👑' : '👤'}</span>
                    <span style={{ fontWeight: 600, color: isMe ? '#4ecdc4' : '#fff' }}>
                      {nameShown}
                      {isMe && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.7 }}>(Bạn)</span>}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.7, display: 'flex', gap: 8 }}>
                    {isHostPlayer && <span>👑 Host</span>}
                    {p.ready ? (
                      <span style={{ color: '#4ecdc4' }}>✓ Sẵn sàng</span>
                    ) : (
                      <span style={{ color: '#888' }}>⏳ Chưa sẵn sàng</span>
                    )}
                  </div>

                  {typeof p.ping === 'number' && (
                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                      📶 Ping: {p.ping}ms
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Invite Friends Button */}
          {isHost && players.length < maxPlayers && (
            <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                onClick={openInviteModal}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(156, 39, 176, 0.2)',
                  border: '1px solid rgba(156, 39, 176, 0.5)',
                  borderRadius: 8,
                  color: '#ba68c8',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 14,
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(156, 39, 176, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(156, 39, 176, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                👥 Mời bạn bè
              </button>
            </div>
          )}
        </div>

        {/* ===== Middle: Settings ===== */}
        <div style={{ background: 'rgba(20,20,22,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>⚙️</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Cài đặt trò chơi
          </div>
          <div style={{ fontSize: 14, opacity: 0.6, marginBottom: 32 }}>(Sẽ phát triển sau)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 300 }}>
            {!isHost && (
              <button
                onClick={toggleReady}
                style={{
                  padding: '16px 24px',
                  fontSize: 16,
                  fontWeight: 700,
                  background: isReady ? 'rgba(78, 205, 196, 0.3)' : 'rgba(255,255,255,0.1)',
                  border: isReady ? '2px solid rgba(78, 205, 196, 0.8)' : '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                {isReady ? '✓ Đã sẵn sàng' : 'Sẵn sàng'}
              </button>
            )}
            {isHost && (
              <button
                onClick={startGame}
                disabled={!canStart}
                style={{
                  padding: '16px 24px',
                  fontSize: 18,
                  fontWeight: 700,
                  background: canStart ? 'linear-gradient(45deg, #ff6b6b, #4ecdc4)' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 8,
                  cursor: canStart ? 'pointer' : 'not-allowed',
                  opacity: canStart ? 1 : 0.5,
                }}
              >
                Bắt đầu trận đấu
              </button>
            )}
          </div>
        </div>

        {/* ===== Right: Chat ===== */}
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', background: 'rgba(20,20,22,0.5)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Chat
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {chatMessages.map((msg, i) => {
              const player = players.find((p) => p.id === msg.from);
              const name = msg.fromName || player?.name || msg.from.slice(0, 8);
              const isMe = msg.from === mySocketId;
              return (
                <div key={i} style={{ padding: '8px 12px', background: isMe ? 'rgba(78, 205, 196, 0.15)' : 'rgba(255,255,255,0.05)', borderRadius: 8, fontSize: 14 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12, opacity: 0.8 }}>
                    {isMe ? '💬 Bạn' : `💬 ${name}`}
                  </div>
                  <div>{msg.message}</div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <form onSubmit={(e) => { e.preventDefault(); sendChat(); }} style={{ display: 'flex', gap: 8 }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Nhập tin nhắn..."
                style={{ flex: 1, padding: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14 }}
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                style={{
                  padding: '12px 20px',
                  background: chatInput.trim() ? 'rgba(78, 205, 196, 0.3)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  borderRadius: 8,
                  cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Gửi
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ===== Invite Friends Modal ===== */}
      {showInviteModal && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(8px)'
          }}
          onClick={() => setShowInviteModal(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: 16, padding: 32, maxWidth: 500, width: '90%',
              maxHeight: '70vh', overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(156, 39, 176, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid rgba(156, 39, 176, 0.3)'
            }}>
              <h2 style={{ margin: 0, color: '#ba68c8', fontSize: '1.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
                👥 Mời bạn bè
              </h2>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{
                  background: 'rgba(244, 67, 54, 0.2)',
                  border: '1px solid rgba(244, 67, 54, 0.5)',
                  color: '#ff6b6b',
                  width: 36, height: 36, borderRadius: '50%',
                  cursor: 'pointer', fontSize: '1.2rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(244, 67, 54, 0.4)';
                  e.currentTarget.style.transform = 'rotate(90deg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(244, 67, 54, 0.2)';
                  e.currentTarget.style.transform = 'rotate(0)';
                }}
              >
                ✕
              </button>
            </div>

            {/* Friends List */}
            {loadingFriends ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
                <div>Đang tải danh sách bạn bè...</div>
              </div>
            ) : friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>😢</div>
                <div>Bạn chưa có bạn bè nào</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {friends.map((friend) => {
                  const isInviting = invitingFriends.has(friend.friendId);
                  const canInvite = friend.isOnline && !isInviting;

                  return (
                    <div
                      key={friend.friendId}
                      style={{
                        padding: 16,
                        background: friend.isOnline ? 'rgba(78, 205, 196, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 12,
                        border: friend.isOnline ? '1px solid rgba(78, 205, 196, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 12, height: 12, borderRadius: '50%',
                            background: friend.isOnline ? '#4ecdc4' : '#888',
                            boxShadow: friend.isOnline ? '0 0 8px rgba(78, 205, 196, 0.6)' : 'none'
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '1rem', color: friend.isOnline ? '#fff' : '#888' }}>
                            {friend.friendUsername}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: friend.isOnline ? '#4ecdc4' : '#666', marginTop: 2 }}>
                            {friend.isOnline ? '🟢 Đang online' : '⚫ Offline'}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => canInvite && inviteFriend(friend.friendId, friend.friendUsername)}
                        disabled={!canInvite}
                        style={{
                          padding: '8px 16px',
                          background: canInvite ? 'rgba(156, 39, 176, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                          border: canInvite ? '1px solid rgba(156, 39, 176, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 8,
                          color: canInvite ? '#ba68c8' : '#555',
                          fontWeight: 600, fontSize: '0.9rem',
                          cursor: canInvite ? 'pointer' : 'not-allowed',
                          transition: 'all 0.3s ease', opacity: canInvite ? 1 : 0.5
                        }}
                        onMouseEnter={(e) => {
                          if (canInvite) {
                            e.currentTarget.style.background = 'rgba(156, 39, 176, 0.5)';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (canInvite) {
                            e.currentTarget.style.background = 'rgba(156, 39, 176, 0.3)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }
                        }}
                      >
                        {isInviting ? '⏳ Đang gửi...' : friend.isOnline ? '✉️ Mời' : '🚫 Offline'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomLobby;
