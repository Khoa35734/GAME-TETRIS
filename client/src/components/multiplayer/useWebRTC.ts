import { useCallback, useRef, useState } from 'react';
import socket from '../../socket';
import { useReliableUDP, type UDPMessage } from '../../hooks/useReliableUDP';

export const useWebRTC = (roomId: string | null, onUDPMessage: (msg: UDPMessage) => void) => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const [isRtcReady, setIsRtcReady] = useState(false);
  const udpStatsRef = useRef({ sent: 0, received: 0, failed: 0, parseErrors: 0 });

  const cleanupWebRTC = useCallback((reason = 'manual') => {
    console.log(`[WebRTC] Cleanup: ${reason}`);
    setIsRtcReady(false);
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.onicecandidate = e => {
      if (e.candidate && roomId) socket.emit('webrtc:ice', { roomId, candidate: e.candidate });
    };
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] state:', pc.connectionState);
      if (pc.connectionState === 'connected') setIsRtcReady(true);
      if (['failed', 'closed'].includes(pc.connectionState)) cleanupWebRTC(pc.connectionState);
    };
    return pc;
  }, [cleanupWebRTC, roomId]);

  const { sendUDP } = useReliableUDP({
    dc: dcRef.current,
    onMessage: onUDPMessage,
    resendLimit: 3,
    resendInterval: 200,
  });

  return { pcRef, dcRef, isRtcReady, cleanupWebRTC, createPeerConnection, sendUDP, udpStatsRef, setIsRtcReady };
};
