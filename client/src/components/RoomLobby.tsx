import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import socket from '../socket';
import { SERVER_URL } from '../socket';

type Player = {
  id: string;
  name: string | null;
  ready: boolean;
  alive: boolean;
};

type ChatMessage = {
  from: string;
  message: string;
  ts: number;
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
  const [displayName, setDisplayName] = useState('');
  const [identityReady, setIdentityReady] = useState(false);

  useEffect(() => {
    if (!roomId) {
      creatorFlagRef.current = false;
      return;
    }
    creatorFlagRef.current = sessionStorage.getItem(`roomHost_${roomId}`) === 'true';
  }, [roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Resolve player display name once (prefer username, fallback to IP, else Guest)
  useEffect(() => {
    const resolveIdentity = async () => {
      try {
        const raw = localStorage.getItem('tetris:user');
        if (raw) {
          const user = JSON.parse(raw);
          if (user?.username) {
            setDisplayName(String(user.username));
            setIdentityReady(true);
            return;
          }
        }
      } catch (err) {
        console.warn('[RoomLobby] Failed to parse local user info', err);
      }

      try {
        const res = await fetch(`${SERVER_URL}/whoami`);
        if (res.ok) {
          const data = await res.json();
          if (data?.ip) {
            setDisplayName(String(data.ip));
            setIdentityReady(true);
            return;
          }
        }
      } catch (err) {
        console.warn('[RoomLobby] Failed to fetch client IP', err);
      }

      setDisplayName('Guest');
      setIdentityReady(true);
    };

    resolveIdentity();
  }, []);

  useEffect(() => {
    if (!roomId) {
      setError('ID phòng không hợp lệ');
      return;
    }

    if (!identityReady) {
      return;
    }

    const onRoomUpdate = (data: any) => {
      console.log('Room update received:', data);
      if (data) {
        setPlayers(data.players || []);
        setHost(data.host || null);
        setMaxPlayers(data.maxPlayers || 2);
      }
    };

    const onRoomChat = (data: any) => {
      setChatMessages((prev) => [...prev, data]);
    };

    const onGameStart = () => {
      console.log('[RoomLobby] Game starting, navigating to versus...');
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
        } else if (payload && payload.error === 'not-found') {
          setError('Phòng không tồn tại');
          setTimeout(() => navigate('/online'), 2000);
        }
      });
    };

    socket.on('room:update', onRoomUpdate);
    socket.on('room:chat', onRoomChat);
    socket.on('game:start', onGameStart);

    if (!hasJoinedRef.current) {
      const nameToUse = displayName || 'Guest';
      socket.emit('room:join', roomId, { name: nameToUse }, (result: any) => {
        if (!result?.ok) {
          switch (result?.error) {
            case 'not-found':
              setError('Phòng không tồn tại');
              break;
            case 'full':
              setError('Phòng đã đầy (2/2 người chơi)');
              break;
            case 'started':
              setError('Trận đấu đã bắt đầu');
              break;
            default:
              setError('Không thể vào phòng');
          }
          if (roomId) {
            sessionStorage.removeItem(`roomHost_${roomId}`);
            sessionStorage.removeItem(`joined_${roomId}`);
          }
          setTimeout(() => navigate('/online'), 2000);
        } else {
          hasJoinedRef.current = true;
          sessionStorage.setItem(`joined_${roomId}`, 'true');
          const socketId = socket.id ?? '';
          if (socketId) {
            setPlayers((prev) => {
              if (prev.some((p) => p.id === socketId)) return prev;
              return [...prev, { id: socketId, name: nameToUse || null, ready: false, alive: true }];
            });
            if (creatorFlagRef.current) {
              setHost(socketId);
            }
          }
          if (creatorFlagRef.current && roomId) {
            sessionStorage.removeItem(`roomHost_${roomId}`);
          }
          requestSync();
        }
      });
    } else {
      requestSync();
    }

    return () => {
      socket.off('room:update', onRoomUpdate);
      socket.off('room:chat', onRoomChat);
      socket.off('game:start', onGameStart);
      if (hasJoinedRef.current && roomId) {
        socket.emit('room:leave', roomId);
        hasJoinedRef.current = false;
        sessionStorage.removeItem(`joined_${roomId}`);
        sessionStorage.removeItem(`roomHost_${roomId}`);
      }
    };
  }, [roomId, navigate, identityReady, displayName]);

  const sendChat = () => {
    if (!chatInput.trim() || !roomId) return;
    socket.emit('room:chat', roomId, chatInput.trim(), (ack: any) => {
      if (ack?.ok) {
        setChatInput('');
      }
    });
  };

  const toggleReady = () => {
    if (!roomId) return;
    const newReady = !isReady;
    setIsReady(newReady);
    socket.emit('room:ready', roomId, newReady);
  };

  const startGame = () => {
    if (!roomId || host !== socket.id) return;
    console.log('[RoomLobby] Host starting game for room:', roomId);
    socket.emit('room:startGame', roomId, (result: any) => {
      if (result?.ok) {
        console.log('[RoomLobby] Game start acknowledged by server, waiting for game:start event...');
      } else {
        console.error('[RoomLobby] Failed to start game:', result?.error);
        setError(result?.error || 'Không thể bắt đầu trận đấu');
      }
    });
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

  const isHost = host === socket.id;
  // Chủ phòng không cần ready, chỉ check người chơi khác (non-host)
  const nonHostPlayers = players.filter(p => p.id !== host);
  const allNonHostReady = nonHostPlayers.every((p) => p.ready);
  const canStart = isHost && players.length >= 2 && allNonHostReady;
  
  console.log('[RoomLobby] canStart check:', {
    isHost,
    playersCount: players.length,
    nonHostPlayers: nonHostPlayers.length,
    allNonHostReady,
    canStart,
    players: players.map(p => ({ id: p.id.slice(0, 8), ready: p.ready, isHost: p.id === host }))
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
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', background: 'rgba(20,20,22,0.5)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Người chơi ({players.length}/{maxPlayers})
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {players.map((p) => {
              const isMe = p.id === socket.id;
              const isHostPlayer = p.id === host;
              const displayName = p.name || p.id.slice(0, 8);
              return (
                <div key={p.id} style={{ padding: 12, marginBottom: 8, background: isMe ? 'rgba(78, 205, 196, 0.2)' : 'rgba(255,255,255,0.05)', borderRadius: 8, border: isMe ? '1px solid rgba(78, 205, 196, 0.5)' : '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>{isHostPlayer ? '👑' : '👤'}</span>
                    <span style={{ fontWeight: 600 }}>
                      {displayName}
                      {isMe && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.7 }}>(Bạn)</span>}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, display: 'flex', gap: 8 }}>
                    {isHostPlayer && <span>🏠 Host</span>}
                    {p.ready && <span style={{ color: '#4ecdc4' }}>✓ Sẵn sàng</span>}
                    {!p.ready && <span style={{ color: '#888' }}>⏳ Chưa sẵn sàng</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ background: 'rgba(20,20,22,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>⚙️</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Cài đặt trò chơi
          </div>
          <div style={{ fontSize: 14, opacity: 0.6, marginBottom: 32 }}>(Sẽ phát triển sau)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 300 }}>
            {!isHost && (
              <button onClick={toggleReady} style={{ padding: '16px 24px', fontSize: 16, fontWeight: 700, background: isReady ? 'rgba(78, 205, 196, 0.3)' : 'rgba(255,255,255,0.1)', border: isReady ? '2px solid rgba(78, 205, 196, 0.8)' : '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, cursor: 'pointer' }}>
                {isReady ? '✓ Đã sẵn sàng' : 'Sẵn sàng'}
              </button>
            )}
            {isHost && (
              <button onClick={startGame} disabled={!canStart} style={{ padding: '16px 24px', fontSize: 18, fontWeight: 700, background: canStart ? 'linear-gradient(45deg, #ff6b6b, #4ecdc4)' : 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', borderRadius: 8, cursor: canStart ? 'pointer' : 'not-allowed', opacity: canStart ? 1 : 0.5 }}>
                Bắt đầu trận đấu
              </button>
            )}
          </div>
        </div>
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', background: 'rgba(20,20,22,0.5)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Chat
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {chatMessages.map((msg, i) => {
              const player = players.find((p) => p.id === msg.from);
              const name = player?.name || msg.from.slice(0, 8);
              const isMe = msg.from === socket.id;
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
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Nhập tin nhắn..." style={{ flex: 1, padding: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14 }} />
              <button type="submit" disabled={!chatInput.trim()} style={{ padding: '12px 20px', background: chatInput.trim() ? 'rgba(78, 205, 196, 0.3)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, cursor: chatInput.trim() ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
                Gửi
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomLobby;
