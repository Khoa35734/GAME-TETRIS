import { useEffect, useRef, useState, useCallback } from 'react';
import socket from '../../../socket';
import { useReliableUDP, type UDPMessage } from '../../../hooks/useReliableUDP';
import * as U from '../game/utils';
import type { GameCoreState, StageType } from '../game/types';

type NetworkProps = {
  roomId: string | null;
  meId: string | null;
  core: GameCoreState;
  nextFour: any[];
  hold: any;
  onOpponentTopout: (reason: string) => void;
  onGarbageReceived: (lines: number) => void;
  onOpponentState: (matrix: any, hold: any) => void;
};

/**
 * Quản lý toàn bộ logic network: WebRTC, UDP, và Ping.
 */
export const useNetwork = ({
  roomId,
  meId,
  core,
  nextFour,
  hold,
  onOpponentTopout,
  onGarbageReceived,
  onOpponentState,
}: NetworkProps) => {
  const [isRtcReady, setIsRtcReady] = useState(false);
  const [myPing, setMyPing] = useState<number | null>(null);
  const [oppPing, setOppPing] = useState<number | null>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const udpStatsRef = useRef({ sent: 0, received: 0, failed: 0, parseErrors: 0 });
  const pingIntervalRef = useRef<number | null>(null);

  // === 1. UDP Channel ===
  
  const onUDPMessage = useCallback((msg: UDPMessage) => {
    switch (msg.type) {
      case 'garbage':
        onGarbageReceived(msg.payload?.lines || 0);
        break;
      case 'snapshot':
        onOpponentState(msg.payload?.matrix, msg.payload?.hold);
        break;
      case 'topout':
        onOpponentTopout(msg.payload?.reason || 'Opponent topout');
        break;
      case 'input':
        break;
      default:
        console.warn('⚠️ Unknown UDP msg type:', msg.type, msg);
        break;
    }
  }, [onGarbageReceived, onOpponentState, onOpponentTopout]);

  const { sendUDP } = useReliableUDP({
    dc: dcRef.current,
    onMessage: onUDPMessage,
    resendLimit: 3,
    resendInterval: 200,
  });

  const handleUDPMessage = useCallback((raw: string) => {
    try {
      const msg = JSON.parse(raw) as UDPMessage;
      udpStatsRef.current.received++;
      onUDPMessage(msg);
    } catch (err) {
      udpStatsRef.current.parseErrors++;
    }
  }, [onUDPMessage]);

  // === 2. WebRTC Setup ===
  
  const cleanupWebRTC = useCallback((reason = 'manual') => {
    console.log(`[WebRTC] Cleanup: ${reason}`);
    setIsRtcReady(false);
    if (dcRef.current) { try { dcRef.current.close(); } catch {} dcRef.current = null; }
    if (pcRef.current) { try { pcRef.current.close(); } catch {} pcRef.current = null; }
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.onicecandidate = e => {
      if (e.candidate && roomId) {
        socket.emit('webrtc:ice', { roomId, candidate: e.candidate });
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setIsRtcReady(true);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed')
        cleanupWebRTC(pc.connectionState);
    };
    return pc;
  }, [cleanupWebRTC, roomId]);
  
  const initWebRTC = useCallback(async (isHost: boolean) => {
    const pc = createPeerConnection();
    pcRef.current = pc;
    if (isHost) {
      const dc = pc.createDataChannel('tetris', { ordered: false, maxRetransmits: 0 });
      dcRef.current = dc;
      dc.onmessage = e => handleUDPMessage(e.data);
      dc.onopen = () => setIsRtcReady(true);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:offer', { roomId, offer });
    } else {
      pc.ondatachannel = e => {
        dcRef.current = e.channel;
        e.channel.onmessage = ev => handleUDPMessage(ev.data);
        e.channel.onopen = () => setIsRtcReady(true);
      };
    }
  }, [createPeerConnection, handleUDPMessage, roomId]);

  // === 3. WebRTC Listeners ===
  
  useEffect(() => {
    const handleOffer = async ({ offer }: any) => {
      try {
        const pc = createPeerConnection();
        pc.ondatachannel = (e) => {
          dcRef.current = e.channel;
          dcRef.current.onopen = () => setIsRtcReady(true);
          dcRef.current.onclose = () => setIsRtcReady(false);
          dcRef.current.onerror = (err) => console.error('❌ [WebRTC] Data channel error:', err);
          dcRef.current.onmessage = (event) => handleUDPMessage(event.data);
        };
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc:answer', { roomId, answer });
      } catch (err) { cleanupWebRTC('offer-error'); }
    };
    const handleAnswer = async ({ answer }: any) => {
      try { if (pcRef.current) await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer)); } 
      catch (err) { cleanupWebRTC('answer-error'); }
    };
    const handleICE = async ({ candidate }: any) => {
      try {
        if (pcRef.current && candidate && U.isUdpCandidate(candidate)) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) { console.error('[WebRTC] ⚠️ ICE candidate failed:', err); }
    };
    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice', handleICE);
    return () => {
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice', handleICE);
    };
  }, [roomId, handleUDPMessage, createPeerConnection, cleanupWebRTC]);

  // === 4. Ping Logic ===
  
  useEffect(() => {
    pingIntervalRef.current = window.setInterval(() => socket.emit('ping', Date.now()), 2000);
    const onPong = (timestamp?: number) => {
      if (timestamp) {
        const ping = Date.now() - timestamp;
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
  
  useEffect(() => {
    const onRoomUpdate = (snapshot: any) => {
      if (snapshot?.players) {
        const opp = snapshot.players.find((p: any) => p.id !== meId && p.id !== socket.id);
        if (opp?.ping) setOppPing(opp.ping);
      }
    };
    socket.on('room:update', onRoomUpdate);
    return () => { socket.off('room:update', onRoomUpdate); };
  }, [meId]);

  // === 5. Network Emitter Functions (Public) ===
  
  const sendGarbage = useCallback((lines: number) => {
    const sent = sendUDP('garbage', { lines }, true);
    if (!sent && roomId) socket.emit('game:attack', roomId, { lines });
  }, [sendUDP, roomId]);

  const sendInput = useCallback((action: string, _data?: any) => {
    sendUDP('input', { action }, false);
  }, [sendUDP]);
  
  const sendTopout = useCallback((reason?: string) => {
    const sent = sendUDP('topout', { reason }, true);
    if (!sent && roomId) socket.emit('game:topout', roomId, reason);
  }, [sendUDP, roomId]);

  const sendSnapshot = useCallback(() => {
    const snapshot = {
      matrix: U.cloneStageForNetwork(core.stage),
      hold: hold,
      next: nextFour,
      lines: 0,
    };
    const sent = sendUDP('snapshot', snapshot, true);
    if (!sent && roomId) socket.emit('game:state', roomId, snapshot);
  }, [core.stage, hold, nextFour, sendUDP, roomId]);

  // Gửi snapshot định kỳ
  useEffect(() => {
    const interval = setInterval(() => {
      if (isRtcReady) sendSnapshot();
    }, 500);
    return () => clearInterval(interval);
  }, [isRtcReady, sendSnapshot]);

  // Gửi state TCP (fallback)
  const lastSyncTime = useRef<number>(0);
  const lastSyncedStage = useRef<StageType | null>(null);
  useEffect(() => {
    if (!roomId || core.gameOver || isRtcReady) return;
    if (JSON.stringify(lastSyncedStage.current) === JSON.stringify(core.stage)) return;
    
    const now = Date.now();
    if (now - lastSyncTime.current < 100) return;
    lastSyncTime.current = now;
    lastSyncedStage.current = core.stage;
    
    socket.emit('game:state', roomId, {
      matrix: U.cloneStageForNetwork(core.stage),
      hold: hold,
      next: nextFour
    });
  }, [core.stage, hold, nextFour, roomId, core.gameOver, isRtcReady]);

  return {
    isRtcReady,
    myPing,
    oppPing,
    udpStatsRef,
    sendGarbage,
    sendInput,
    sendTopout,
    initWebRTC,
    cleanupWebRTC,
  };
};
