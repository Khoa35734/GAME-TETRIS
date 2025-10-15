import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import socket from '../socket';
import { getApiBaseUrl } from '../services/apiConfig';
import axios from 'axios';

const DebugContainer = styled.div`
  position: fixed;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.9);
  color: #00ff00;
  padding: 15px;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  max-width: 400px;
  z-index: 9999;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
`;

const Title = styled.div`
  font-weight: bold;
  color: #00ffff;
  margin-bottom: 10px;
  font-size: 14px;
`;

const Row = styled.div`
  margin: 5px 0;
  display: flex;
  align-items: center;
`;

const Label = styled.span`
  color: #888;
  margin-right: 8px;
  min-width: 100px;
`;

const Value = styled.span<{ status?: 'online' | 'offline' | 'error' }>`
  color: ${(props) =>
    props.status === 'online' ? '#00ff00' : props.status === 'error' ? '#ff0000' : '#ffff00'};
  font-weight: bold;
`;

const Button = styled.button`
  background: #00ff00;
  color: #000;
  border: none;
  padding: 5px 10px;
  margin: 5px 5px 0 0;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Courier New', monospace;
  font-size: 11px;

  &:hover {
    background: #00cc00;
  }
`;

const ConnectionDebug: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [socketStatus, setSocketStatus] = useState<'online' | 'offline'>('offline');
  const [apiUrl, setApiUrl] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [socketId, setSocketId] = useState<string | null>(null);

  useEffect(() => {
    const updateStatus = () => {
      setSocketStatus(socket.connected ? 'online' : 'offline');
      setSocketId(socket.id || null);
    };

    updateStatus();
    setApiUrl(getApiBaseUrl());
    setServerUrl(getApiBaseUrl().replace('/api', ''));

    socket.on('connect', updateStatus);
    socket.on('disconnect', updateStatus);

    return () => {
      socket.off('connect', updateStatus);
      socket.off('disconnect', updateStatus);
    };
  }, []);

  const fetchOnlineUsers = async () => {
    try {
      const response = await axios.get(`${getApiBaseUrl().replace('/api', '')}/api/debug/online-users`);
      setOnlineUsers(response.data.onlineUsers || []);
    } catch (error) {
      console.error('Failed to fetch online users:', error);
      setOnlineUsers([]);
    }
  };

  const reconnect = () => {
    socket.disconnect();
    setTimeout(() => {
      socket.connect();
    }, 500);
  };

  return (
    <DebugContainer>
      <Title>🔧 Connection Debug</Title>
      
      <Row>
        <Label>API URL:</Label>
        <Value>{apiUrl}</Value>
      </Row>
      
      <Row>
        <Label>Socket URL:</Label>
        <Value>{serverUrl}</Value>
      </Row>
      
      <Row>
        <Label>Socket.IO:</Label>
        <Value status={socketStatus}>{socketStatus.toUpperCase()}</Value>
      </Row>
      
      <Row>
        <Label>Socket ID:</Label>
        <Value>{socketId || 'N/A'}</Value>
      </Row>

      <Row>
        <Label>Online Users:</Label>
        <Value>{onlineUsers.length}</Value>
      </Row>

      {onlineUsers.length > 0 && (
        <div style={{ marginTop: '10px', fontSize: '11px' }}>
          {onlineUsers.map((user) => (
            <div key={user.socketId} style={{ color: '#888' }}>
              • User {user.userId} ({user.socketId.slice(0, 8)}...)
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '10px' }}>
        <Button onClick={reconnect}>🔄 Reconnect</Button>
        <Button onClick={fetchOnlineUsers}>👥 Refresh Users</Button>
        {onClose && <Button onClick={onClose}>❌ Close</Button>}
      </div>
    </DebugContainer>
  );
};

export default ConnectionDebug;
