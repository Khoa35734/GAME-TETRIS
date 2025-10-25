import React, { useEffect, useState } from 'react';
import socket from '../../socket';
import { useNavigate } from 'react-router-dom';

type Invitation = {
  roomId: string;
  roomName: string;
  inviterName: string;
  maxPlayers: number;
  currentPlayers: number;
  timestamp: number;
};

export const InvitationNotification: React.FC = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handleInvitation = (data: Invitation) => {
      console.log('[InvitationNotification] Received invitation:', data);
      
      // Add to list (max 3 invitations displayed)
      setInvitations(prev => {
        const newInvitations = [...prev, data];
        return newInvitations.slice(-3); // Keep only last 3
      });

      // Auto-remove after 15 seconds
      setTimeout(() => {
        setInvitations(prev => prev.filter(inv => inv.timestamp !== data.timestamp));
      }, 15000);
    };

    socket.on('room:invitation', handleInvitation);

    return () => {
      socket.off('room:invitation', handleInvitation);
    };
  }, []);

  const acceptInvitation = (invitation: Invitation) => {
    console.log('[InvitationNotification] Accepting invitation to room:', invitation.roomId);
    
    // Remove from list
    setInvitations(prev => prev.filter(inv => inv.timestamp !== invitation.timestamp));
    
    // Navigate to room lobby
    navigate(`/room/${invitation.roomId}`);
  };

  const declineInvitation = (invitation: Invitation) => {
    console.log('[InvitationNotification] Declining invitation:', invitation.roomId);
    
    // Remove from list
    setInvitations(prev => prev.filter(inv => inv.timestamp !== invitation.timestamp));
    
    // Optionally notify the inviter
    socket.emit('room:invite-declined', {
      roomId: invitation.roomId,
      inviterName: invitation.inviterName
    });
  };

  if (invitations.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '380px'
    }}>
      {invitations.map((invitation) => (
        <div
          key={invitation.timestamp}
          style={{
            background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.95) 0%, rgba(123, 31, 162, 0.95) 100%)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            animation: 'slideInRight 0.3s ease-out',
            color: 'white'
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <span style={{ fontSize: '24px' }}>✉️</span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: 'white'
              }}>
                Lời mời vào phòng
              </div>
              <div style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.8)',
                marginTop: '2px'
              }}>
                từ {invitation.inviterName}
              </div>
            </div>
          </div>

          {/* Room Info */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            padding: '10px',
            marginBottom: '12px',
            fontSize: '14px'
          }}>
            <div style={{ marginBottom: '6px' }}>
              🏠 <strong>Phòng:</strong> {invitation.roomName}
            </div>
            <div>
              👥 <strong>Số người:</strong> {invitation.currentPlayers}/{invitation.maxPlayers}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={() => acceptInvitation(invitation)}
              style={{
                flex: 1,
                padding: '10px',
                background: 'linear-gradient(135deg, #4ecdc4 0%, #44a39b 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(78, 205, 196, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(78, 205, 196, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(78, 205, 196, 0.4)';
              }}
            >
              ✓ Tham gia
            </button>
            <button
              onClick={() => declineInvitation(invitation)}
              style={{
                flex: 1,
                padding: '10px',
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(255, 107, 107, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 107, 0.4)';
              }}
            >
              ✕ Từ chối
            </button>
          </div>

          {/* Timer indicator */}
          <div style={{
            marginTop: '10px',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.6)',
            textAlign: 'center'
          }}>
            ⏱️ Lời mời sẽ tự động hết hạn sau 15 giây
          </div>
        </div>
      ))}

      <style>
        {`
          @keyframes slideInRight {
            from {
              transform: translateX(400px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
};
