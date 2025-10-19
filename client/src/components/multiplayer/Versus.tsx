import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWebRTC } from './useWebRTC';
import { useGarbageSystem } from './useGarbageSystem';
import { useGameLifecycle } from './useGameLifecycle';
import Stage from '../Stage';
import { HoldPanel, NextPanel } from '../SidePanels';
import GarbageQueueBar from '../GarbageQueueBar';

const Versus: React.FC = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // Gọi các hook con
  const { isRtcReady, sendUDP } = useWebRTC(roomId || null, msg => console.log(msg));
  const { incomingGarbage } = useGarbageSystem(roomId || null, sendUDP, () => {});
  const { countdown, matchResult } = useGameLifecycle(navigate, () => {});
  
  // Presence: mark as in-game (multi) while in Versus component
  useEffect(() => {
    socket.emit('presence:update', { status: 'in_game', mode: 'multi' });
    return () => { socket.emit('presence:update', { status: 'online' }); };
  }, []);
  
  return (
    <div style={{ color: '#fff', textAlign: 'center' }}>
      <h2>Multiplayer Versus</h2>
      <div>Room ID: {roomId}</div>
      <div>UDP: {isRtcReady ? '✅ Active' : '❌ TCP Fallback'}</div>
      <div>Incoming garbage: {incomingGarbage}</div>
      {countdown && <div>Countdown: {countdown}</div>}
      {matchResult && <div>Kết quả: {matchResult.outcome}</div>}
      <Stage stage={[]} />
      <HoldPanel hold={null} />
      <NextPanel queue={[]} />
      <GarbageQueueBar count={incomingGarbage} />
    </div>
  );
};

export default Versus;
import socket from '../../socket';
