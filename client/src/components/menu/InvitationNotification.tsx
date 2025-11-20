import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../../socket';

type Invitation = {
  roomId: string;
  roomName: string;
  inviterName: string;
  maxPlayers: number;
  currentPlayers: number;
  timestamp: number;
};

export const InvitationNotification: React.FC = () => {
  const [activeInvitation, setActiveInvitation] = useState<Invitation | null>(null);
  const [queuedInvitations, setQueuedInvitations] = useState<Invitation[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handleInvitation = (data: Invitation) => {
      console.log('[InvitationNotification] Received invitation:', data);
      setActiveInvitation(prev => {
        if (prev) {
          setQueuedInvitations(queue => [...queue, data].slice(-5));
          return prev;
        }
        return data;
      });
    };

    socket.on('room:invitation', handleInvitation);

    return () => {
      socket.off('room:invitation', handleInvitation);
    };
  }, []);

  const advanceQueue = useCallback(() => {
    setQueuedInvitations(prevQueue => {
      if (prevQueue.length === 0) {
        setActiveInvitation(null);
        return [];
      }
      const [next, ...rest] = prevQueue;
      setActiveInvitation(next);
      return rest;
    });
  }, []);

  useEffect(() => {
    if (!activeInvitation) return;
    const timer = window.setTimeout(() => {
      console.log('[InvitationNotification] Invitation expired');
      advanceQueue();
    }, 15000);
    return () => window.clearTimeout(timer);
  }, [activeInvitation, advanceQueue]);

  const acceptInvitation = (invitation: Invitation) => {
    console.log('[InvitationNotification] Accepting invitation to room:', invitation.roomId);
    advanceQueue();
    navigate(`/room/${invitation.roomId}`);
  };

  const declineInvitation = (invitation: Invitation) => {
    console.log('[InvitationNotification] Declining invitation:', invitation.roomId);
    advanceQueue();
    socket.emit('room:invite-declined', {
      roomId: invitation.roomId,
      inviterName: invitation.inviterName
    });
  };

  if (!activeInvitation) return null;

  const queueLength = queuedInvitations.length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 16,
          background: 'linear-gradient(160deg, #311b92 0%, #000428 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
          padding: 28,
          color: '#fff'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Bạn được mời vào phòng</div>
            <div style={{ fontSize: 14, opacity: 0.8 }}>từ {activeInvitation.inviterName}</div>
          </div>
          <span style={{ fontSize: 28 }}>✉️</span>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.25)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ marginBottom: 8 }}>🏠 <strong>Phòng:</strong> {activeInvitation.roomName}</div>
          <div>👥 <strong>Số người:</strong> {activeInvitation.currentPlayers}/{activeInvitation.maxPlayers}</div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => acceptInvitation(activeInvitation)}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #4ecdc4, #2ebf91)',
              color: '#0d1b2a',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ✓ Tham gia ngay
          </button>
          <button
            onClick={() => declineInvitation(activeInvitation)}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ✕ Từ chối
          </button>
        </div>

        <div style={{ marginTop: 16, fontSize: 12, opacity: 0.7, textAlign: 'center' }}>
          Lời mời sẽ tự đóng sau 15 giây
          {queueLength > 0 && (
            <div style={{ marginTop: 4 }}>
              {queueLength} lời mời khác đang chờ
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
};
