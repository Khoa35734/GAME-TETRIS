import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import socket, { SERVER_URL } from '../socket.ts';
import Stage from './Stage';
import { HoldPanel, NextPanel } from './SidePanels';
import GarbageQueueBar from './GarbageQueueBar';
import { checkCollision, createStage, getTSpinType, isGameOverFromBuffer } from '../gamehelper';
import type { Stage as StageType, Cell as StageCell, TSpinType } from '../gamehelper';
import { usePlayer } from '../hooks/usePlayer';
import { useStage } from '../hooks/useStage';
import { useGameStatus } from '../hooks/useGameStatus';
import { useInterval } from '../hooks/useInterval';

// ========================================
// 🎮 SRS ROTATION & INPUT SYSTEM IMPORTS
// ========================================
import { tryRotate } from '../srsRotation';
// Future: Full TETR.IO mechanics (uncomment when needed)
/*
import {
  createDASState,
  updateDAS,
  createIRSIHSState,
  getSpawnIntent,
  createLockDelayState,
  updateLockDelay,
  tickLockDelay,
  createAREState,
  startARE,
  updateARE,
  type DASState,
  type IRSIHSState,
  type LockDelayState,
  type AREState,
} from '../inputSystem';
*/

// --- DAS/ARR Movement Settings (TETR.IO style) ---
const DAS_DELAY: number = 120; // Delayed Auto Shift (ms) - có thể điều chỉnh trong settings
const ARR: number = 0; // Auto Repeat Rate (ms) - 0 = instant, 40 = normal
const MOVE_INTERVAL: number = ARR || 16; // Fallback cho ARR

// --- SRS/TETR.IO Settings ---
// Future: Uncomment when implementing full TETR.IO mechanics
// const LOCK_DELAY: number = 500; // Lock delay khi chạm đất (ms)
// const MAX_LOCK_RESETS: number = 15; // Max số lần reset lock delay (infinite spin limit)
// const ARE_DELAY: number = 0; // Entry delay (0 = instant spawn like TETR.IO)
const ENABLE_180_ROTATION: boolean = true; // Bật xoay 180°
// const ENABLE_FLOOR_KICK: boolean = true; // Bật floor kick (đá sàn) - always enabled in tryRotate()

// --- Gravity/Speed Settings ---
// Tốc độ rơi: Bắt đầu 800ms ở level 1, giảm dần đến ~16ms ở level 22
const MAX_LEVEL = 22; // Level tối đa

const getFallSpeed = (lvl: number): number => {
  // Cap level tại 22
  const L = Math.min(lvl, MAX_LEVEL - 1); // lvl từ 0-21, map sang level 1-22
  
  // Level 0 (hiển thị level 1): 800ms
  // Level 21 (hiển thị level 22): ~16ms
  const START_SPEED = 800; // 0.8 giây ở level 1
  const END_SPEED = 16.67;  // ~16.67ms ở level 22 (instant)
  
  if (L >= MAX_LEVEL - 1) {
    return END_SPEED;
  }
  
  // Giảm dần theo hàm mũ để có độ chuyển tiếp mượt
  const progress = L / (MAX_LEVEL - 1); // 0 → 1
  const speed = START_SPEED * Math.pow(END_SPEED / START_SPEED, progress);
  
  return Math.max(END_SPEED, speed);
};

// --- Lock Delay Settings ---
const INACTIVITY_LOCK_MS = 750; // Không thao tác trong 0.75s → lock
const HARD_CAP_MS = 3000; // Sau 3s từ lúc chạm đất đầu tiên → lock ngay

type MatchOutcome = 'win' | 'lose' | 'draw';
type MatchSummary = { outcome: MatchOutcome; reason?: string } | null;

const cloneStageForNetwork = (stage: StageType): StageType =>
  stage.map(row => row.map(cell => [cell[0], cell[1]] as StageCell));

const createGarbageRow = (width: number, hole: number): StageCell[] =>
  Array.from({ length: width }, (_, x) => (x === hole ? [0, 'clear'] : ['garbage', 'merged'])) as StageCell[];

const isPerfectClearBoard = (stage: StageType): boolean =>
  stage.every(row => row.every(([value]) =>
    value === 0 || value === '0' || (typeof value === 'string' && value.startsWith('ghost'))
  ));

// Calculate garbage lines from clear action
const calculateGarbageLines = (
  lines: number, 
  tspinType: TSpinType, 
  pc: boolean,
  combo: number,
  b2b: number
): number => {
  if (lines === 0) return 0;

  let garbage = 0;

  // Perfect Clear bonus
  if (pc) {
    garbage = 10;
  } else if (tspinType !== 'none' && lines > 0) {
    // T-Spin clears
    if (tspinType === 'mini' && lines === 1) {
      garbage = 0;
    } else {
      const tspinBase = [0, 2, 4, 6];
      garbage = tspinBase[lines] ?? 0;
    }
  } else {
    // Standard clears
    const standardBase = [0, 0, 1, 2, 4];
    garbage = standardBase[lines] ?? 0;
  }

  // B2B bonus (Back-to-Back Tetris or T-Spin)
  const isTetris = tspinType === 'none' && lines === 4;
  const isTSpinClear = tspinType !== 'none' && lines > 0;
  if (b2b >= 1 && (isTetris || isTSpinClear)) {
    garbage += 1;
  }

  // Combo bonus (combo >= 2)
  if (combo >= 9) garbage += 5;
  else if (combo >= 7) garbage += 4;
  else if (combo >= 5) garbage += 3;
  else if (combo >= 3) garbage += 2;
  else if (combo >= 2) garbage += 1;

  return garbage;
};

const isUdpCandidate = (candidate?: RTCIceCandidate | RTCIceCandidateInit | null): boolean => {
  if (!candidate) return false;
  const candString = typeof candidate.candidate === 'string' ? candidate.candidate : '';
  return candString.toLowerCase().includes(' udp ');
};

const Versus: React.FC = () => {
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams<{ roomId?: string }>();
  const [meId, setMeId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(urlRoomId || null);
  const [waiting, setWaiting] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  // ========================================
  // ⚡ WEBRTC UDP STATE & REFS
  // ========================================
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const [isRtcReady, setIsRtcReady] = useState(false);
  const udpStatsRef = useRef({ sent: 0, received: 0, failed: 0 });
  const lastSnapshotRef = useRef<number>(0);
  const closingRef = useRef(false);
  
  // Your (Right side) board state
  const [player, updatePlayerPos, resetPlayer, /* playerRotate (replaced by playerRotateSRS) */, hold, canHold, nextFour, holdSwap, clearHold, setQueueSeed, pushQueue, setPlayer] = usePlayer();
  const [stage, setStage, rowsCleared, , lastPlacement] = useStage(player);
  const [, , rows, setRows, level, setLevel] = useGameStatus();
  const [dropTime, setDropTime] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [locking, setLocking] = useState(false);
  const [hasHeld, setHasHeld] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timerOn, setTimerOn] = useState(false);
  const [pendingGarbageLeft, setPendingGarbageLeft] = useState(0);
  const [matchResult, setMatchResult] = useState<MatchSummary>(null);
  
  // ========================================
  // 📊 PING TRACKING
  // ========================================
  const [myPing, setMyPing] = useState<number | null>(null);
  const [oppPing, setOppPing] = useState<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  
  // ========================================
  // 🎮 SRS ROTATION STATE
  // ========================================
  const [rotationState, setRotationState] = useState<0 | 1 | 2 | 3>(0);
  
  // NEW: Garbage queue and combo/b2b tracking
  const [incomingGarbage, setIncomingGarbage] = useState(0); // Garbage queued from opponent
  const [opponentIncomingGarbage, setOpponentIncomingGarbage] = useState(0); // Track opponent's incoming garbage
  const [isApplyingGarbage, setIsApplyingGarbage] = useState(false); // Track garbage animation state
  const [combo, setCombo] = useState(0);
  const [b2b, setB2b] = useState(0);
  
  // DAS/ARR movement state
  const [moveIntent, setMoveIntent] = useState<{ dir: number; startTime: number; dasCharged: boolean } | null>(null);
  
  // Lock delay state
  const [isGrounded, setIsGrounded] = useState(false);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const capTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const capExpiredRef = useRef<boolean>(false);
  const groundedSinceRef = useRef<number | null>(null);
  const lastGroundActionRef = useRef<number | null>(null);
  
  // AFK Detection (30 seconds) - TEMPORARILY DISABLED FOR TESTING
  const afkTimeoutRef = useRef<number | null>(null);
  const AFK_TIMEOUT_MS = 300000; // 300 seconds (5 minutes) - effectively disabled for testing
  const AFK_ENABLED = false; // Set to true to re-enable AFK detection
  
  // Disconnect/Reconnect tracking
  const [disconnectCountdown, setDisconnectCountdown] = useState<number | null>(null);
  const disconnectTimerRef = useRef<number | null>(null);
  
  // Auto-exit after match ends (1 minute timeout)
  const [autoExitCountdown, setAutoExitCountdown] = useState<number | null>(null);
  const autoExitTimerRef = useRef<number | null>(null);
  const AUTO_EXIT_TIMEOUT_MS = 60000; // 60 seconds (1 minute)
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const matchTimer = useRef<number | null>(null);
  useEffect(() => { wrapperRef.current?.focus(); }, []);

  // Opponent (Left side) board state - using separate simple state
  const [oppStage, setOppStage] = useState<any[][]>(() => createStage());
  const [oppGameOver, setOppGameOver] = useState(false);
  const [netOppStage, setNetOppStage] = useState<any[][] | null>(null);
  const [oppHold, setOppHold] = useState<any>(null);
  const [oppNextFour, setOppNextFour] = useState<any[]>([]);
  const [garbageToSend, setGarbageToSend] = useState(0);

  const pendingGarbageRef = useRef(0);
  const pendingLockRef = useRef(false);
  useEffect(() => { pendingGarbageRef.current = pendingGarbageLeft; }, [pendingGarbageLeft]);

  // [THÊM MỚI] useEffect để báo cho server là client đã sẵn sàng
  useEffect(() => {
    // Chỉ chạy khi vào phòng từ lobby (có roomId từ URL)
    if (urlRoomId) {
        console.log(`[Client] Component mounted for room ${urlRoomId}. Emitting game:im_ready.`);
        socket.emit('game:im_ready', urlRoomId);
    }
  }, [urlRoomId]); // Chỉ chạy 1 lần khi urlRoomId tồn tại

  const cleanupWebRTC = useCallback((reason: string = 'manual-cleanup') => {
    if (closingRef.current) {
      console.log(`[WebRTC] Cleanup already in progress, skipping (${reason})`);
      return;
    }
    closingRef.current = true;
    console.log(`[WebRTC] Cleaning up (${reason})`);

    setIsRtcReady(false);

    if (dcRef.current) {
      try {
        dcRef.current.onopen = null;
        dcRef.current.onclose = null;
        dcRef.current.onerror = null;
        dcRef.current.onmessage = null;
        if (dcRef.current.readyState !== 'closed' && dcRef.current.readyState !== 'closing') {
          dcRef.current.close();
        }
      } catch (err) {
        console.warn('[WebRTC] Data channel cleanup error:', err);
      }
      dcRef.current = null;
    }

    if (pcRef.current) {
      try {
        pcRef.current.onicecandidate = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.ondatachannel = null;
        pcRef.current.onicegatheringstatechange = null;
        pcRef.current.onsignalingstatechange = null;
        if (pcRef.current.signalingState !== 'closed') {
          pcRef.current.close();
        }
      } catch (err) {
        console.warn('[WebRTC] Peer connection cleanup error:', err);
      }
      pcRef.current = null;
    }

    udpStatsRef.current = { sent: 0, received: 0, failed: udpStatsRef.current.failed };
    
    // Small delay before allowing new connections
    setTimeout(() => {
      closingRef.current = false;
      console.log('[WebRTC] Cleanup complete, ready for new connection');
    }, 100);
  }, [setIsRtcReady]);

  const applyGarbageRows = useCallback((count: number): Promise<StageType | null> => {
    if (count <= 0) return Promise.resolve(null);
    console.log(`[applyGarbageRows] Applying ${count} garbage rows with animation...`);
    
    // Set animation flag
    setIsApplyingGarbage(true);
    
    return new Promise((resolve) => {
      let currentRow = 0;
      let finalStage: StageType | null = null;
      
      const applyNextRow = () => {
        if (currentRow >= count) {
          console.log(`[applyGarbageRows] Animation complete! Total ${count} rows applied`);
          setIsApplyingGarbage(false); // Clear animation flag
          resolve(finalStage);
          return;
        }
        
        setStage(prev => {
          if (!prev.length) {
            finalStage = prev;
            return prev;
          }
          const width = prev[0].length;
          const cloned = prev.map(row => row.map(cell => [cell[0], cell[1]] as StageCell)) as StageType;
          
          // Add one garbage row
          const hole = Math.floor(Math.random() * width);
          cloned.shift(); // Remove top row
          cloned.push(createGarbageRow(width, hole)); // Add garbage row at bottom
          
          finalStage = cloned;
          console.log(`[applyGarbageRows] Row ${currentRow + 1}/${count} applied`);
          return cloned;
        });
        
        currentRow++;
        setTimeout(applyNextRow, 100); // 100ms delay between each row
      };
      
      applyNextRow();
    });
  }, [setStage]);

  // ========================================
  // ⚡ WEBRTC UDP HELPER FUNCTIONS
  // ========================================
  
  /**
   * Send data via UDP if ready, otherwise fallback to TCP
   */
  const sendViaUDP = useCallback((type: string, data: any) => {
    if (isRtcReady && dcRef.current?.readyState === 'open') {
      try {
        const msg = JSON.stringify({ type, ...data, ts: Date.now() });
        dcRef.current.send(msg);
        udpStatsRef.current.sent++;
        return true; // Success via UDP
      } catch (err) {
        console.warn('[UDP] Send failed, fallback to TCP:', err);
        udpStatsRef.current.failed++;
        return false; // Will fallback to TCP
      }
    }
    return false; // UDP not ready, use TCP
  }, [isRtcReady]);

  /**
   * Send garbage attack via UDP with TCP fallback
   */
  const sendGarbage = useCallback((lines: number) => {
    const sent = sendViaUDP('garbage', { lines });
    if (!sent && roomId) {
      // TCP fallback
      socket.emit('game:attack', roomId, { lines });
    }
  }, [sendViaUDP, roomId]);

  /**
   * Send board snapshot via UDP (periodic sync)
   */
  const sendSnapshot = useCallback(() => {
    const now = Date.now();
    if (now - lastSnapshotRef.current < 500) return; // Max 2 snapshots/sec
    
    lastSnapshotRef.current = now;
    const sent = sendViaUDP('snapshot', {
      matrix: cloneStageForNetwork(stage),
      hold,
      nextFour: nextFour.slice(0, 4),
      combo,
      b2b,
      pendingGarbage: pendingGarbageLeft,
    });
    
    if (!sent && roomId) {
      // TCP fallback - use existing game:state
      socket.emit('game:state', roomId, {
        matrix: cloneStageForNetwork(stage),
        hold,
        nextFour: nextFour.slice(0, 4),
        combo,
        b2b,
        pendingGarbage: pendingGarbageLeft,
      });
    }
  }, [sendViaUDP, stage, hold, nextFour, combo, b2b, pendingGarbageLeft, roomId]);

  /**
   * Handle incoming UDP messages
   */
  const handleUDPMessage = useCallback((data: string) => {
    try {
      const msg = JSON.parse(data);
      udpStatsRef.current.received++;
      
      switch (msg.type) {
        case 'input':
          // Opponent input received (for future predictive rendering)
          console.log('[UDP] Opponent input:', msg.action);
          break;
          
        case 'garbage':
          // Fast garbage notification
          console.log('[UDP] Garbage received:', msg.lines);
          setIncomingGarbage(prev => prev + msg.lines);
          break;
          
        case 'snapshot':
          // Full board state sync via UDP
          console.log('⚡ [UDP] Snapshot received:', {
            hasMatrix: !!msg.matrix,
            hasHold: msg.hold !== undefined,
            hasNextFour: !!msg.nextFour,
            pendingGarbage: msg.pendingGarbage
          });
          if (msg.matrix) {
            setOppStage(msg.matrix);
            console.log('⚡ [UDP] Updated opponent board from snapshot');
          }
          if (msg.hold !== undefined) setOppHold(msg.hold);
          if (msg.nextFour) setOppNextFour(msg.nextFour);
          if (msg.combo !== undefined || msg.b2b !== undefined) {
            // Update opponent combo/b2b display if you have it
          }
          if (msg.pendingGarbage !== undefined) {
            setOpponentIncomingGarbage(msg.pendingGarbage);
          }
          break;
          
        default:
          console.warn('[UDP] Unknown message type:', msg.type);
      }
    } catch (err) {
      console.error('[UDP] Parse error:', err);
    }
  }, []);

  // ========================================
  // ⚡ WEBRTC CONNECTION SETUP
  // ========================================

  const createPeerConnection = useCallback(() => {
    if (pcRef.current) {
      return pcRef.current;
    }

    console.log('[WebRTC] Creating new RTCPeerConnection');
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      iceCandidatePoolSize: 8,
      bundlePolicy: 'balanced',
    });

    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && roomId) {
        if (!isUdpCandidate(e.candidate)) {
          console.log('[WebRTC] Skipping non-UDP candidate');
          return;
        }
        socket.emit('webrtc:ice', { roomId, candidate: e.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      
      // Only cleanup on permanent failure, not temporary disconnection
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        console.warn('[WebRTC] Connection permanently failed/closed. Cleaning up.');
        cleanupWebRTC(`state-${pc.connectionState}`);
      } else if (pc.connectionState === 'disconnected') {
        console.warn('[WebRTC] Connection disconnected (may reconnect)...');
        // Don't cleanup immediately, give it time to reconnect
      } else if (pc.connectionState === 'connected') {
        console.log('✅ [WebRTC] Peer connection CONNECTED');
      }
    };

    return pc;
  }, [cleanupWebRTC, roomId]);
  
  const initWebRTC = useCallback(async (isHost: boolean) => {
    try {
      if (pcRef.current) {
        console.log('[WebRTC] PeerConnection already exists, skipping re-init');
        return;
      }
      
      if (closingRef.current) {
        console.log('[WebRTC] Cleanup in progress, waiting...');
        // Wait for cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log('[WebRTC] Initializing as', isHost ? 'HOST' : 'PEER');

      const pc = createPeerConnection();

      if (isHost) {
        // Host creates data channel
        const dc = pc.createDataChannel('tetris', {
          ordered: false, // Unordered for speed
          maxRetransmits: 0, // No retransmits for real-time data
        });
        dcRef.current = dc;

        dc.onopen = () => {
          console.log('✅ [WebRTC] UDP channel OPEN (host)');
          setIsRtcReady(true);
        };

        dc.onclose = () => {
          console.warn('⚠️ [WebRTC] UDP channel CLOSED (host)');
          setIsRtcReady(false);
          // Don't cleanup immediately, may be temporary
        };

        dc.onerror = (err) => {
          console.error('[WebRTC] Data channel error (host):', err);
        };

        dc.onmessage = (e) => handleUDPMessage(e.data);

        // Create offer
        console.log('[WebRTC] Creating offer...');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log('[WebRTC] Sending offer to room:', roomId);
        socket.emit('webrtc:offer', { roomId, offer });
        
      } else {
        // Peer waits for data channel
        pc.ondatachannel = (e) => {
          console.log('[WebRTC] Data channel received (peer)');
          const dc = e.channel;
          dcRef.current = dc;

          dc.onopen = () => {
            console.log('✅ [WebRTC] UDP channel OPEN (peer)');
            setIsRtcReady(true);
          };

          dc.onclose = () => {
            console.warn('⚠️ [WebRTC] UDP channel CLOSED (peer)');
            setIsRtcReady(false);
            // Don't cleanup immediately, may be temporary
          };

          dc.onerror = (err) => {
            console.error('[WebRTC] Data channel error (peer):', err);
          };

          dc.onmessage = (e) => handleUDPMessage(e.data);
        };
        
        console.log('[WebRTC] Waiting for offer from host...');
      }
      
    } catch (err) {
      console.error('[WebRTC] Init failed:', err);
      setIsRtcReady(false);
      cleanupWebRTC('init-error');
    }
  }, [createPeerConnection, handleUDPMessage, cleanupWebRTC, roomId]);

  // ========================================
  // 🎯 WEBRTC SIGNALING EVENT HANDLERS
  // ========================================
  
  useEffect(() => {
    const handleOffer = async ({ offer }: any) => {
      try {
        console.log('[WebRTC] 📥 Received offer, creating answer...');
        const pc = createPeerConnection();

        pc.ondatachannel = (e) => {
          console.log('[WebRTC] 📨 Data channel received (answerer)');
          dcRef.current = e.channel;
          
          dcRef.current.onopen = () => {
            console.log('✅ [WebRTC] UDP channel OPEN (answerer)');
            setIsRtcReady(true);
          };
          
          dcRef.current.onclose = () => {
            console.warn('⚠️ [WebRTC] UDP channel CLOSED (answerer)');
            setIsRtcReady(false);
          };
          
          dcRef.current.onerror = (err) => {
            console.error('[WebRTC] Data channel error (answerer):', err);
          };
          
          dcRef.current.onmessage = (event) => handleUDPMessage(event.data);
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log('[WebRTC] Remote description set');
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('[WebRTC] 📤 Sending answer to room:', roomId);
        socket.emit('webrtc:answer', { roomId, answer });
        
      } catch (err) {
        console.error('[WebRTC] ❌ Offer handling failed:', err);
        cleanupWebRTC('offer-error');
      }
    };

    const handleAnswer = async ({ answer }: any) => {
      try {
        console.log('[WebRTC] 📥 Received answer');
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          console.log('[WebRTC] ✅ Answer processed, connection should establish soon');
        } else {
          console.warn('[WebRTC] ⚠️ No peer connection to apply answer');
        }
      } catch (err) {
        console.error('[WebRTC] ❌ Answer handling failed:', err);
        cleanupWebRTC('answer-error');
      }
    };

    const handleICE = async ({ candidate }: any) => {
      try {
        if (pcRef.current && candidate) {
          if (!isUdpCandidate(candidate)) {
            console.log('[WebRTC] Ignoring non-UDP remote candidate');
            return;
          }
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[WebRTC] ✅ Added ICE candidate');
        }
      } catch (err) {
        console.error('[WebRTC] ⚠️ ICE candidate failed (non-fatal):', err);
        // Don't cleanup on ICE errors - they're often non-fatal
      }
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

  // ========================================
  // 🎮 TRIGGER WEBRTC ON GAME START
  // ========================================
  
  useEffect(() => {
    const handleGameStartForWebRTC = ({ opponent }: any) => {
      if (!opponent) {
        console.warn('[WebRTC] No opponent in game:start, skipping WebRTC init');
        return;
      }
      
      // This logic is now reliable because `opponent` is always a socket.id
      const isHost = (socket.id || '') < opponent;
      console.log('[WebRTC] 🎮 Game started!');
      console.log('[WebRTC] My socket.id:', socket.id);
      console.log('[WebRTC] Opponent socket.id:', opponent);
      console.log('[WebRTC] I am', isHost ? '🏠 HOST (will create offer)' : '📡 PEER (will receive offer)');

      // Only cleanup if there's an existing connection
      if (pcRef.current || dcRef.current) {
        console.log('[WebRTC] Cleaning up previous connection before starting new one');
        cleanupWebRTC('pre-game-start');
        
        // Wait for cleanup to complete, then init
        setTimeout(() => {
          console.log('[WebRTC] Starting new connection...');
          initWebRTC(isHost);
        }, 300);
      } else {
        // No existing connection, start immediately with small delay for both sides to be ready
        setTimeout(() => {
          console.log('[WebRTC] Starting fresh connection...');
          initWebRTC(isHost);
        }, 500);
      }
    };

    socket.on('game:start', handleGameStartForWebRTC);

    return () => {
      socket.off('game:start', handleGameStartForWebRTC);
    };
  }, [initWebRTC, cleanupWebRTC]);

  // ========================================
  // 📡 PERIODIC SNAPSHOT SENDER (UDP)
  // ========================================
  
  useEffect(() => {
    if (!roomId || gameOver || waiting) return;
    
    const interval = setInterval(() => {
      sendSnapshot();
    }, 500); // Send snapshot every 500ms via UDP

    return () => clearInterval(interval);
  }, [roomId, gameOver, waiting, sendSnapshot]);

  // ========================================
  // 🎯 END OF WEBRTC SETUP
  // ========================================

  // --- Lock Delay & Movement Helpers ---
  const clearInactivity = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  }, []);

  const clearCap = useCallback(() => {
    if (capTimeoutRef.current) {
      clearTimeout(capTimeoutRef.current);
      capTimeoutRef.current = null;
    }
  }, []);

  const doLock = useCallback(() => {
    if (isApplyingGarbage) {
      clearInactivity();
      clearCap();
      groundedSinceRef.current = null;
      lastGroundActionRef.current = null;
      capExpiredRef.current = false;
      setIsGrounded(false);
      return;
    }

    clearInactivity();
    clearCap();
    groundedSinceRef.current = null;
    lastGroundActionRef.current = null;
    capExpiredRef.current = false;
    setIsGrounded(false);
    setLocking(true);
  }, [clearInactivity, clearCap, isApplyingGarbage]);

  const startGroundTimers = useCallback(() => {
    if (isApplyingGarbage) {
      clearInactivity();
      clearCap();
      return;
    }

    if (capExpiredRef.current) {
      doLock();
      return;
    }

    clearInactivity();
    inactivityTimeoutRef.current = setTimeout(() => {
      doLock();
    }, INACTIVITY_LOCK_MS);

    if (!groundedSinceRef.current) {
      groundedSinceRef.current = Date.now();
      capTimeoutRef.current = setTimeout(() => {
        capExpiredRef.current = true;
        doLock();
      }, HARD_CAP_MS);
    }
  }, [doLock, clearInactivity, clearCap, isApplyingGarbage]);

  const onGroundAction = useCallback(() => {
    if (isApplyingGarbage) {
      clearInactivity();
      clearCap();
      return;
    }

    lastGroundActionRef.current = Date.now();
    clearInactivity();
    if (capExpiredRef.current) {
      doLock();
      return;
    }
    inactivityTimeoutRef.current = setTimeout(() => {
      doLock();
    }, INACTIVITY_LOCK_MS);
  }, [doLock, clearInactivity, clearCap, isApplyingGarbage]);

  useEffect(() => {
    if (isApplyingGarbage) {
      clearInactivity();
      clearCap();
      groundedSinceRef.current = null;
      lastGroundActionRef.current = null;
      capExpiredRef.current = false;
      setIsGrounded(false);
    }
  }, [isApplyingGarbage, clearInactivity, clearCap]);

  // Reset AFK timer on any user action
  const resetAFKTimer = useCallback(() => {
    if (!AFK_ENABLED) return; // Skip if AFK is disabled
    if (afkTimeoutRef.current) {
      clearTimeout(afkTimeoutRef.current);
    }
    if (!gameOver && !matchResult && countdown === null) {
      afkTimeoutRef.current = window.setTimeout(() => {
        // User is AFK - send topout with 'afk' reason
        console.log('⏰ AFK timeout - sending topout');
        if (roomId) {
          socket.emit('game:topout', roomId, 'afk');
        }
      }, AFK_TIMEOUT_MS);
    }
  }, [gameOver, matchResult, countdown, roomId]);

  // --- Core Game Logic ---
  const startGame = useCallback(() => {
    setStage(createStage());
    setDropTime(getFallSpeed(0));
    setGameOver(false);
    setRows(0);
    setLevel(0);
    setElapsedMs(0);
    setTimerOn(true);
    clearHold();
    setHasHeld(false);
    setLocking(false);
    setPendingGarbageLeft(0);
    pendingGarbageRef.current = 0;
    setGarbageToSend(0);
    setMatchResult(null);
    
    // Reset NEW garbage system
    setIncomingGarbage(0);
    setOpponentIncomingGarbage(0);
    setCombo(0);
    setB2b(0);
    
    // Reset movement state
    setMoveIntent(null);
    
    // Reset lock delay state
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    if (capTimeoutRef.current) clearTimeout(capTimeoutRef.current);
    inactivityTimeoutRef.current = null;
    capTimeoutRef.current = null;
    capExpiredRef.current = false;
    groundedSinceRef.current = null;
    lastGroundActionRef.current = null;
    setIsGrounded(false);

    setOppStage(createStage());
    setOppGameOver(false);
    setNetOppStage(null);
    
    // Ensure first piece spawns
    resetPlayer();
    setRotationState(0); // 🎮 Reset rotation state on spawn
    
    pieceCountRef.current = 0;
    if (roomId) {
      setTimeout(() => socket.emit('game:requestNext', roomId, 7), 300);
    }
    
    // Start AFK timer (only if enabled)
    if (AFK_ENABLED) {
      if (afkTimeoutRef.current) clearTimeout(afkTimeoutRef.current);
      afkTimeoutRef.current = window.setTimeout(() => {
        console.log('⏰ AFK timeout - sending topout');
        if (roomId) socket.emit('game:topout', roomId, 'afk');
      }, AFK_TIMEOUT_MS);
    }
  }, [roomId, clearHold, setLevel, setRows, setStage, resetPlayer, setMatchResult]);

  const startGameRef = useRef(startGame);
  useEffect(() => {
    startGameRef.current = startGame;
  });

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return;
  
    if (countdown <= 0) {
      startGameRef.current(); 
      setCountdown(null);
      return;
    }
  
    const timerId = setTimeout(() => {
      setCountdown(c => (c ? c - 1 : null));
    }, 1000);
  
    return () => clearTimeout(timerId);
  }, [countdown]);

  // --- Socket Listeners ---
  useEffect(() => {
    const stopMatchmaking = () => {
      if (matchTimer.current) {
        clearInterval(matchTimer.current);
        matchTimer.current = null;
      }
    };

    const run = async () => {
      // If we have roomId from URL (came from lobby), skip matchmaking
      if (urlRoomId) {
        console.log('[Versus] Joined from lobby, roomId:', urlRoomId);
        setRoomId(urlRoomId);
        // `waiting` remains true until 'game:start' is received
        
        // Get user info for meId
        try {
          const userStr = localStorage.getItem('tetris:user');
          if (userStr) {
            const user = JSON.parse(userStr);
            setMeId(user.accountId?.toString() || socket.id || 'unknown');
          } else {
            setMeId(socket.id || 'unknown');
          }
        } catch (err) {
          setMeId(socket.id || 'unknown');
        }
        return;
      }
      
      // Otherwise, start ranked matchmaking
      try {
        // Lấy accountId từ localStorage thay vì IP
        const userStr = localStorage.getItem('tetris:user');
        if (!userStr) {
          console.error('No user found in localStorage');
          setDebugInfo(prev => [...prev, 'ERROR: Not logged in']);
          return;
        }
        
        const user = JSON.parse(userStr);
        const accountId = user.accountId?.toString() || socket.id;
        
        setMeId(accountId);
        setDebugInfo(prev => [...prev, `Account ID: ${accountId} (${user.username})`]);
        
        const elo = 1000;
        socket.emit('ranked:enter', accountId, elo);
        socket.emit('ranked:match', accountId, elo);
        setDebugInfo(prev => [...prev, "Matchmaking started"]);
        
        matchTimer.current = window.setInterval(() => {
          socket.emit('ranked:match', accountId, elo);
        }, 2000);

      } catch (error) {
        console.error("Failed to start matchmaking:", error);
        setDebugInfo(prev => [...prev, `Error: ${error}`]);
      }
    };
    run();

    const onFound = (payload: any) => {
      stopMatchmaking();
      setRoomId(payload.roomId);
      setOpponentId(payload.opponent);
    };
    socket.on('ranked:found', onFound);

    // This listener now fires reliably for both ranked and custom games
    const onGameStart = (payload?: any) => {
      stopMatchmaking();
      // Shield: Only start countdown if we are actually waiting for one.
      if (waiting) {
        if (payload?.roomId) setRoomId(payload.roomId);
        if (payload?.opponent) setOpponentId(payload.opponent);
        if (payload?.next && Array.isArray(payload.next)) {
            setQueueSeed(payload.next);
            setOppNextFour(payload.next.slice(0, 4));
        }
        setNetOppStage(null);
        setWaiting(false);
        setCountdown(3);
      }
    };
    socket.on('game:start', onGameStart);

    const onGameNext = (arr: any) => {
      if (Array.isArray(arr) && arr.length) {
        pushQueue(arr as any); 
        setOppNextFour((prev: any[]) => [...prev.slice(arr.length), ...arr].slice(0, 4));
      }
    };
    socket.on('game:next', onGameNext);

    const onGameOver = (data: any) => {
      const winner = data?.winner ?? null;
      const reason = data?.reason;
      
      console.log('🏁 GAME OVER EVENT:', { winner, reason, myId: socket.id });
      
      setTimerOn(false);
      setDropTime(null);
      cleanupWebRTC('game-over');
      
      // Clear AFK timer
      if (afkTimeoutRef.current) {
        clearTimeout(afkTimeoutRef.current);
        afkTimeoutRef.current = null;
      }
      
      // Clear disconnect countdown
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      setDisconnectCountdown(null);
      
      if (winner === socket.id) {
        console.log('✅ YOU WIN! Reason:', reason);
        setOppGameOver(true);
        setMatchResult({ outcome: 'win', reason });
      } else if (winner) {
        console.log('❌ YOU LOSE! Reason:', reason);
        setGameOver(true);
        setMatchResult({ outcome: 'lose', reason });
      } else {
        console.log('🤝 DRAW! Reason:', reason);
        setGameOver(true);
        setOppGameOver(true);
        setMatchResult({ outcome: 'draw', reason });
      }
      
      // 🕐 Start 1-minute auto-exit countdown
      console.log('⏰ Starting 1-minute auto-exit countdown');
      setAutoExitCountdown(60);
      let remaining = 60;
      
      autoExitTimerRef.current = window.setInterval(() => {
        remaining--;
        setAutoExitCountdown(remaining);
        
        if (remaining <= 0) {
          // Time's up - force exit
          console.log('⏰ Auto-exit timeout - forcing exit');
          clearInterval(autoExitTimerRef.current!);
          autoExitTimerRef.current = null;
          setAutoExitCountdown(null);
          
          // Leave ranked queue and navigate
          if (meId) socket.emit('ranked:leave', meId);
          cleanupWebRTC('auto-exit');
          navigate('/');
        }
      }, 1000);
    };
    socket.on('game:over', onGameOver);

    // NEW: Incoming garbage notification (queued, not applied yet)
    const onIncomingGarbage = (data: { lines: number }) => {
      console.log('🔵 YOUR garbage bar updated:', data.lines);
      setIncomingGarbage(data.lines);
    };
    socket.on('game:incomingGarbage', onIncomingGarbage);

    // NEW: Garbage cancelled by counter-attack
    const onGarbageCancelled = (data: { cancelled: number; remaining: number }) => {
      console.log('🛡️ Garbage cancelled:', data.cancelled, 'remaining:', data.remaining);
      setIncomingGarbage(data.remaining);
    };
    socket.on('game:garbageCancelled', onGarbageCancelled);

    // NEW: Apply garbage (after delay from server)
    const onApplyGarbage = async (data: { lines: number }) => {
      console.log('💥 Applying garbage:', data.lines);
      if (data.lines > 0 && !gameOver) {
        // Apply garbage with animation (100ms per row)
        const updated = await applyGarbageRows(data.lines);

        // ✅ Xóa hàng rác chờ sau khi đã nhận
        setIncomingGarbage(0);

        if (updated && isGameOverFromBuffer(updated)) {
          console.log('⚠️ Game over from garbage!');
          setGameOver(true);
          setDropTime(null);
          setTimerOn(false);
          if (roomId) socket.emit('game:topout', roomId);
        }
      }
    };
    socket.on('game:applyGarbage', onApplyGarbage);

    // OLD: Keep for backward compatibility
    const onGarbage = async (g: number) => {
      console.log('🗑️ [LEGACY] Received garbage:', g);
      if (g > 0 && !gameOver) {
        const updated = await applyGarbageRows(g);
        if (updated && isGameOverFromBuffer(updated)) {
          setGameOver(true);
          setDropTime(null);
          setTimerOn(false);
          if (roomId) socket.emit('game:topout', roomId);
        }
      }
    };
    socket.on('game:garbage', onGarbage);
    
    const onGameState = (data: any) => {
      console.log('🔵 [game:state] Event received:', {
        hasMatrix: data && Array.isArray(data.matrix),
        hasHold: data && data.hold !== undefined,
        hasNext: data && Array.isArray(data.next),
        from: data?.from,
        roomId,
        waiting
      });
      
      if (data && Array.isArray(data.matrix)) {
        const incoming = (data.matrix as StageType).map(row =>
          Array.isArray(row) ? row.map(cell => {
            if (Array.isArray(cell) && cell.length >= 2) {
              return [cell[0], cell[1]] as StageCell;
            }
            return [0, 'clear'] as StageCell;
          }) : row
        ) as StageType;
        
        // Debug: Check for garbage in received board
        const garbageRows = incoming.filter(row => row.some(cell => cell[0] === 'garbage')).length;
        console.log('📥 Received opponent board - Garbage rows:', garbageRows);
        
        setOppStage(incoming);
        setNetOppStage(incoming);
      }
      if (data && data.hold !== undefined) {
        setOppHold(data.hold);
      }
      if (data && Array.isArray(data.next)) {
        setOppNextFour(data.next.slice(0, 4));
      }
      if (data && Array.isArray(data.nextFour)) {
        setOppNextFour(data.nextFour.slice(0, 4));
      }
    };
    socket.on('game:state', onGameState);

    // Player disconnect handler (opponent disconnected)
    const onPlayerDisconnect = (data: any) => {
      if (data?.playerId === opponentId) {
        console.log('🔌 Opponent disconnected, starting 5s countdown');
        // Start 5 second countdown
        setDisconnectCountdown(5);
        let remaining = 5;
        
        disconnectTimerRef.current = window.setInterval(() => {
          remaining--;
          setDisconnectCountdown(remaining);
          
          if (remaining <= 0) {
            // Time's up - opponent didn't reconnect
            clearInterval(disconnectTimerRef.current!);
            disconnectTimerRef.current = null;
            setDisconnectCountdown(null);
            setTimerOn(false);
            setDropTime(null);
            setOppGameOver(true);
            setMatchResult({ outcome: 'win', reason: 'Đối thủ đã ngắt kết nối' });
            
            // Clear AFK timer
            if (afkTimeoutRef.current) {
              clearTimeout(afkTimeoutRef.current);
              afkTimeoutRef.current = null;
            }
          }
        }, 1000);
      }
    };
    socket.on('player:disconnect', onPlayerDisconnect);

    // Player reconnect handler (opponent reconnected)
    const onPlayerReconnect = (data: any) => {
      if (data?.playerId === opponentId) {
        console.log('✅ Opponent reconnected, canceling countdown');
        // Cancel countdown
        if (disconnectTimerRef.current) {
          clearInterval(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }
        setDisconnectCountdown(null);
      }
    };
    socket.on('player:reconnect', onPlayerReconnect);

    // [THÊM MỚI] Lắng nghe sự kiện xác nhận đã gửi rác từ server
    const onAttackSent = (data: { amount: number }) => {
        if (data && typeof data.amount === 'number' && data.amount > 0) {
            setGarbageToSend(prev => prev + data.amount);
        }
    };
    socket.on('game:attack_sent', onAttackSent);


    return () => {
      stopMatchmaking();
      socket.off('ranked:found', onFound);
      socket.off('game:start', onGameStart);
      socket.off('game:next', onGameNext);
      socket.off('game:over', onGameOver);
      socket.off('game:incomingGarbage', onIncomingGarbage);
      socket.off('game:garbageCancelled', onGarbageCancelled);
      socket.off('game:applyGarbage', onApplyGarbage);
      socket.off('game:garbage', onGarbage);
      socket.off('game:state', onGameState);
      socket.off('player:disconnect', onPlayerDisconnect);
      socket.off('player:reconnect', onPlayerReconnect);
      socket.off('game:attack_sent', onAttackSent);
    };
  }, [
    meId, 
    waiting, 
    opponentId, 
    gameOver, 
    roomId, 
    applyGarbageRows, 
    isGameOverFromBuffer, 
    setGameOver, 
    setDropTime, 
    setTimerOn,
    setIncomingGarbage,
    cleanupWebRTC
  ]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (meId) socket.emit('ranked:leave', meId);
      if (afkTimeoutRef.current) clearTimeout(afkTimeoutRef.current);
      if (autoExitTimerRef.current) clearInterval(autoExitTimerRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      cleanupWebRTC('component-unmount');
    };
  }, [meId, cleanupWebRTC]);
  
  // ========================================
  // 📊 PING TRACKING
  // ========================================
  useEffect(() => {
    // Measure ping every 2 seconds
    pingIntervalRef.current = window.setInterval(() => {
      const timestamp = Date.now();
      socket.emit('ping', timestamp);
    }, 2000);

    const onPong = (timestamp?: number) => {
      if (timestamp) {
        const ping = Date.now() - timestamp;
        setMyPing(ping);
        // Send ping to server so it can broadcast to others
        socket.emit('client:ping', ping);
      }
    };
    socket.on('pong', onPong);

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      socket.off('pong', onPong);
    };
  }, []);
  
  // Update opponent ping from room updates
  useEffect(() => {
    const onRoomUpdate = (snapshot: any) => {
      if (snapshot && snapshot.players) {
        const opp = snapshot.players.find((p: any) => p.id !== meId && p.id !== socket.id);
        if (opp && typeof opp.ping === 'number') {
          setOppPing(opp.ping);
        }
      }
    };
    socket.on('room:update', onRoomUpdate);

    return () => {
      socket.off('room:update', onRoomUpdate);
    };
  }, [meId]);
  
  const pieceCountRef = useRef(0);

  const movePlayer = useCallback((dir: number) => {
    if (gameOver || countdown !== null || matchResult !== null || isApplyingGarbage) return false;
    if (!checkCollision(player, stage, { x: dir, y: 0 })) {
      updatePlayerPos({ x: dir, y: 0, collided: false });
      return true;
    }
    return false;
  }, [gameOver, countdown, matchResult, isApplyingGarbage, player, stage, updatePlayerPos]);

  const hardDrop = () => {
    if (gameOver || countdown !== null || matchResult !== null || isApplyingGarbage) return;
    let dropDistance = 0;
    while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) dropDistance += 1;
    updatePlayerPos({ x: 0, y: dropDistance, collided: true });
    setLocking(true);
  };

  // ========================================
  // 🎮 SRS ROTATION WITH WALL KICK
  // ========================================
  const playerRotateSRS = useCallback((direction: 1 | -1 | 2) => {
    if (gameOver || countdown !== null || matchResult !== null || isApplyingGarbage) return;
    if (player.type === 'O') return; // O doesn't rotate

    // Try rotation with SRS wall kick + floor kick
    const result = tryRotate(
      { ...player, type: player.type, rotationState },
      stage,
      direction,
      rotationState
    );

    if (result.success) {
      // Update player dengan matrix và vị trí mới
      setPlayer(prev => ({
        ...prev,
        tetromino: result.newMatrix,
        pos: { x: result.newX, y: result.newY },
      }));
      
      // Update rotation state
      setRotationState(result.newRotationState);
      
      console.log(`🔄 SRS Rotate ${direction === 1 ? 'CW' : direction === -1 ? 'CCW' : '180°'} - Kick #${result.kickIndex || 0}`);
    } else {
      console.log(`❌ Rotation blocked (no valid kick position)`);
    }
  }, [player, stage, rotationState, gameOver, countdown, matchResult, isApplyingGarbage, setPlayer, setRotationState]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (gameOver || countdown !== null || matchResult !== null || isApplyingGarbage) return;
    if ([32, 37, 38, 39, 40, 16, 67].includes(e.keyCode)) e.preventDefault();
    
    // Reset AFK timer on any key press
    resetAFKTimer();
  
    const { keyCode } = e;
    if (keyCode === 37 || keyCode === 39) { // Left / Right
      const dir = keyCode === 37 ? -1 : 1;
      if (e.repeat) return;
      
      // Start DAS intent
      setMoveIntent({ dir, startTime: Date.now(), dasCharged: false });
      
      // Immediate first move - only update ground action if actually moved AND grounded
      const moved = movePlayer(dir);
      if (moved && isGrounded) {
        onGroundAction();
      }
    } else if (keyCode === 40) { // Down
      if (!e.repeat) {
        setDropTime(MOVE_INTERVAL);
      }
    } else if (keyCode === 38 || keyCode === 88) { // Up arrow or X (Rotate CW)
      playerRotateSRS(1);
      if (isGrounded) {
        onGroundAction();
      }
    } else if (keyCode === 90 || keyCode === 17) { // Z or Ctrl (Rotate CCW)
      playerRotateSRS(-1);
      if (isGrounded) {
        onGroundAction();
      }
    } else if (ENABLE_180_ROTATION && keyCode === 65) { // A (Rotate 180°)
      playerRotateSRS(2);
      if (isGrounded) {
        onGroundAction();
      }
    } else if (keyCode === 32) { // Space (Hard Drop)
      hardDrop();
    } else if (keyCode === 67) { // C (Hold)
      if (!hasHeld && canHold) {
        holdSwap();
        setHasHeld(true);
        setRotationState(0); // 🎮 Reset rotation state on hold
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const { keyCode } = e;
    if (keyCode === 37 || keyCode === 39) { // Left / Right
      const dir = keyCode === 37 ? -1 : 1;
      if (moveIntent?.dir === dir) {
        setMoveIntent(null);
      }
    } else if (keyCode === 40) { // Down
      setDropTime(getFallSpeed(level));
    }
  };

  useInterval(() => { // Gravity
    if (gameOver || locking || countdown !== null || matchResult !== null || isApplyingGarbage) return;
    if (!checkCollision(player, stage, { x: 0, y: 1 })) {
      updatePlayerPos({ x: 0, y: 1, collided: false });
    } else {
      setLocking(true);
    }
  }, dropTime);

  // DAS Charging
  useInterval(() => {
    if (!moveIntent || moveIntent.dasCharged || gameOver || countdown !== null || matchResult !== null || isApplyingGarbage) return;
    const elapsed = Date.now() - moveIntent.startTime;
    if (elapsed >= DAS_DELAY) {
      setMoveIntent(prev => prev ? { ...prev, dasCharged: true } : null);
    }
  }, moveIntent && !moveIntent.dasCharged ? 16 : null);

  // ARR Movement
  useInterval(() => {
    if (!moveIntent || !moveIntent.dasCharged || gameOver || countdown !== null || matchResult !== null || isApplyingGarbage) return;
    const moved = movePlayer(moveIntent.dir);
    if (moved && isGrounded) {
      onGroundAction();
    }
  }, moveIntent?.dasCharged ? MOVE_INTERVAL : null);


  useEffect(() => {
    if (locking) {
      updatePlayerPos({x: 0, y: 0, collided: true});
    }
  }, [locking, updatePlayerPos]);
  
  useEffect(() => {
    if (rowsCleared > 0) {
      setRows(prev => {
        const next = prev + rowsCleared;
        setLevel(Math.floor(next / 10));
        return next;
      });
    }
  }, [rowsCleared, setRows, setLevel]);

  // Lock Delay Tracking
  useEffect(() => {
    if (gameOver || countdown !== null || matchResult !== null || locking || isApplyingGarbage) {
      setIsGrounded(false);
      clearInactivity();
      clearCap();
      groundedSinceRef.current = null;
      lastGroundActionRef.current = null;
      capExpiredRef.current = false;
      return;
    }

    const grounded = checkCollision(player, stage, { x: 0, y: 1 });
    setIsGrounded(grounded);

    if (grounded) {
      startGroundTimers();
    } else {
      clearInactivity();
      clearCap();
      groundedSinceRef.current = null;
      lastGroundActionRef.current = null;
      capExpiredRef.current = false;
    }
  }, [player, stage, gameOver, countdown, matchResult, locking, isApplyingGarbage, startGroundTimers, clearInactivity, clearCap]);

    useEffect(() => {
      if (!player.collided) return;
      pendingLockRef.current = true;
    }, [player.collided]);

    useEffect(() => {
    if (!pendingLockRef.current) return;

    pendingLockRef.current = false;
    setLocking(false);

    const lines = lastPlacement.cleared;
    const mergedStage = lastPlacement.mergedStage;
    const tspinType: TSpinType = getTSpinType(player as any, mergedStage as any, lines);
    const pc = lines > 0 && isPerfectClearBoard(stage);

    console.log('🔒 LOCK - Lines:', lines, '(rowsCleared:', rowsCleared, ') T-Spin:', tspinType, 'PC:', pc, 'Combo:', combo, 'B2B:', b2b);

    // --- LOGIC ĐÃ SỬA ---

    // 1. TÍNH TOÁN newCombo VÀ newB2b TRƯỚC TIÊN
    const isTetris = tspinType === 'none' && lines === 4;
    const isTSpinClear = tspinType !== 'none' && lines > 0;

    let newB2b = b2b;
    let newCombo = combo;

    if (lines > 0) {
        // Combo tăng lên với mỗi lần xóa dòng liên tiếp
        newCombo = combo + 1;
        // B2B tăng nếu là Tetris hoặc T-Spin, nếu không thì reset
        if (isTetris || isTSpinClear) {
            newB2b = b2b + 1;
        } else {
            newB2b = 0;
        }
    } else {
        // Reset combo nếu không xóa dòng nào
        newCombo = 0;
    }

    // 2. SỬ DỤNG CÁC GIÁ TRỊ MỚI ĐỂ TÍNH TOÁN GARBAGE
    if (lines > 0 && roomId) {
        // Truyền newCombo và newB2b vào hàm tính toán
        const garbageLines = calculateGarbageLines(lines, tspinType, pc, newCombo, newB2b);
        console.log('💣 Calculated garbage:', garbageLines, '(lines:', lines, 'newCombo:', newCombo, 'newB2b:', newB2b, ')');

        if (garbageLines > 0) {
            console.log('📤 Sending garbage via UDP/TCP:', garbageLines, 'lines');
            
            // ⚡ Send via UDP with TCP fallback
            sendGarbage(garbageLines);
            
            // Update opponent's incoming garbage (for visual display)
            setOpponentIncomingGarbage(prev => {
                const newValue = prev + garbageLines;
                console.log('🔴 Opponent garbage bar updated:', prev, '→', newValue);
                return newValue;
            });
            
            // Reset opponent garbage after server delay (~500ms)
            setTimeout(() => {
                setOpponentIncomingGarbage(prev => {
                    const newValue = Math.max(0, prev - garbageLines);
                    console.log('🔴 Opponent garbage bar reset:', prev, '→', newValue);
                    return newValue;
                });
            }, 500);
            
            // Lưu ý: State garbageToSend chỉ để hiển thị. Logic gửi đã xong.
            // setGarbageToSend(prev => prev + garbageLines); // Dòng này có thể không cần thiết nếu server xác nhận lại
        } else {
            console.log('⚠️ No garbage to send (calculated 0)');
        }
    }

    // 3. CẬP NHẬT STATE SAU KHI TÍNH TOÁN XONG
    console.log('📊 Updating state: combo', combo, '→', newCombo, '| b2b', b2b, '→', newB2b);
    setCombo(newCombo);
    setB2b(newB2b);

    // 4. TIẾP TỤC LOGIC GAME CÒN LẠI
    if (isGameOverFromBuffer(stage)) {
        console.log('💀 Board overflow detected! Sending topout...');
        setGameOver(true);
        setDropTime(null);
        setTimerOn(false);
        if (roomId) {
          console.log('📤 Sending game:topout (board overflow) to room:', roomId);
          socket.emit('game:topout', roomId);
        }
        return;
    }

    resetPlayer();
    setHasHeld(false);
    setRotationState(0); // 🎮 Reset rotation state for new piece
    setDropTime(getFallSpeed(level));
    pieceCountRef.current += 1;
    if (roomId && pieceCountRef.current % 7 === 0) {
        socket.emit('game:requestNext', roomId, 7);
    }
}, [lastPlacement, stage, roomId, level, combo, b2b, rowsCleared, resetPlayer, player]);


  // Send your state to opponent
  const lastSyncTime = useRef<number>(0);
  const lastSyncedStage = useRef<StageType | null>(null);
  
  // ========================================
  // 📡 LEGACY STATE SYNC (TCP Fallback)
  // Note: Periodic UDP snapshot handles this better
  // ========================================
  useEffect(() => {
    if (!roomId || waiting || gameOver || countdown !== null) return;
    
    // Skip if UDP is working (snapshot handles it)
    if (isRtcReady) {
      console.log('⚡ Skipping TCP sync - UDP active');
      return;
    }
    
    const stageChanged = JSON.stringify(lastSyncedStage.current) !== JSON.stringify(stage);
    if (!stageChanged) return;
    
    const now = Date.now();
    if (now - lastSyncTime.current < 100) return;
    lastSyncTime.current = now;
    lastSyncedStage.current = stage;
    
    const gameState = {
      matrix: cloneStageForNetwork(stage),
      hold,
      next: nextFour
    };
    
    // TCP fallback sync (only when UDP not available)
    console.log('📤 [game:state] Sending board via TCP:', { roomId, hasMatrix: !!gameState.matrix });
    socket.emit('game:state', roomId, gameState);
    
    const garbageCount = stage.filter(row => row.some(cell => cell[0] === 'garbage')).length;
    console.log('📤 TCP fallback sync - Stage has', garbageCount, 'garbage rows');
  }, [stage, hold, nextFour, roomId, waiting, gameOver, countdown, isRtcReady]);

  // Timer for elapsed time
  useEffect(() => {
    if (!timerOn) return;
    let raf = 0; 
    let last = performance.now();
    const tick = (now: number) => { 
      setElapsedMs((prev) => prev + (now - last)); 
      last = now; 
      raf = requestAnimationFrame(tick); 
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timerOn]);

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      style={{ 
        width: '100vw',
        height: '100vh',
        background: `url('/img/bg.jpg') center/cover, #000`,
        overflow: 'hidden',
        display: 'grid', 
        placeItems: 'center' 
      }}
    >
      <button
        onClick={() => {
          console.log('🚪 Exit button clicked:', { roomId, matchResult });
          if (roomId && matchResult === null) {
            console.log('📤 Sending game:topout (manual exit)');
            socket.emit('game:topout', roomId);
          }
          if (meId) socket.emit('ranked:leave', meId);
          if (autoExitTimerRef.current) {
            clearInterval(autoExitTimerRef.current);
            autoExitTimerRef.current = null;
          }
          cleanupWebRTC('manual-exit');
          navigate('/');
        }}
        style={{ position: 'fixed', top: 12, left: 12, zIndex: 999, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}
      >
        ← Thoát
      </button>
      
      {/* ⚡ UDP CONNECTION STATUS INDICATOR */}
      {!waiting && (
        <div
          style={{
            position: 'fixed',
            top: 12,
            right: 12,
            zIndex: 999,
            background: isRtcReady ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 184, 0, 0.15)',
            border: `1px solid ${isRtcReady ? 'rgba(46, 213, 115, 0.4)' : 'rgba(255, 184, 0, 0.4)'}`,
            color: isRtcReady ? '#2ed573' : '#ffb800',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          title={`Sent: ${udpStatsRef.current.sent} | Received: ${udpStatsRef.current.received} | Failed: ${udpStatsRef.current.failed}`}
        >
          <span style={{ fontSize: 14 }}>{isRtcReady ? '⚡' : '📶'}</span>
          {isRtcReady ? 'UDP Active' : 'TCP Mode'}
        </div>
      )}
      
      {matchResult && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 800,
            pointerEvents: 'none',
            color: '#fff',
            textAlign: 'center'
          }}
        >
          <div>
            <div style={{ fontSize: 56, fontWeight: 800, textShadow: '0 8px 30px rgba(0,0,0,0.5)', lineHeight: 1.2 }}>
              {matchResult.outcome === 'win' ? 'Bạn thắng!' : matchResult.outcome === 'lose' ? 'Bạn thua!' : 'Hòa trận!'}
            </div>
            {matchResult.reason && (
              <div style={{ marginTop: 12, fontSize: 18, opacity: 0.75 }}>
                Lý do: {matchResult.reason}
              </div>
            )}
            {autoExitCountdown !== null && (
              <div style={{ 
                marginTop: 24, 
                fontSize: 16, 
                opacity: 0.9,
                background: 'rgba(255, 107, 107, 0.2)',
                padding: '12px 24px',
                borderRadius: 8,
                border: '1px solid rgba(255, 107, 107, 0.4)'
              }}>
                ⏰ Tự động thoát sau: <span style={{ fontWeight: 700, fontSize: 20, color: autoExitCountdown <= 10 ? '#ff6b6b' : '#fff' }}>{autoExitCountdown}</span> giây
              </div>
            )}
          </div>
        </div>
      )}
      {waiting && !roomId ? (
        <div style={{ color: '#fff', fontSize: 20, textAlign: 'center', padding: 20 }}>
          <div>🔍 Đang tìm trận...</div>
          <div style={{ fontSize: 12, marginTop: 10, opacity: 0.7 }}>
            <div>SERVER_URL: {SERVER_URL}</div>
            <div>Socket connected: {socket.connected ? '✅ Yes' : '❌ No'}</div>
            <div>Me ID: {meId || 'Loading...'}</div>
            {debugInfo.length > 0 && debugInfo.map((info, i) => (
              <div key={i}>• {info}</div>
            ))}
          </div>
          <div style={{ marginTop: 20, fontSize: 14, color: '#aaa' }}>
            💡 Đang kết nối đến server và tìm đối thủ...
          </div>
        </div>
      ) : roomId && waiting ? (
        <div style={{ color: '#fff', fontSize: 20, textAlign: 'center', padding: 20 }}>
          <div>🎮 Đã tìm thấy trận!</div>
          <div style={{ fontSize: 14, marginTop: 10, color: '#aaa' }}>
            Đang chuẩn bị trận đấu với {opponentId}...
          </div>
        </div>
      ) : countdown !== null ? (
        // Show countdown during game start
        <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(1px)', color: '#fff', fontSize: 80, fontWeight: 800, textShadow: '0 6px 24px rgba(0,0,0,0.4)' }}>
          {countdown}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, alignItems: 'start', position: 'relative' }}>
          
          {/* Disconnect countdown notification */}
          {disconnectCountdown !== null && disconnectCountdown > 0 && (
            <div style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999,
              background: 'rgba(255, 107, 107, 0.95)',
              color: 'white',
              padding: '24px 32px',
              borderRadius: '12px',
              border: '3px solid #ff5252',
              boxShadow: '0 8px 32px rgba(255, 107, 107, 0.5)',
              textAlign: 'center',
              fontSize: '18px',
              fontWeight: 'bold'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️ Đối phương đã thoát trận hoặc mất kết nối</div>
              <div>Trận đấu sẽ kết thúc trong <span style={{ fontSize: '32px', color: '#fff200' }}>{disconnectCountdown}</span> giây</div>
            </div>
          )}

          {/* Left side: YOU (ĐÃ ĐỔI - Board của bạn bên TRÁI với viền xanh lá) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', alignItems: 'start', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1', color: '#4ecdc4', marginBottom: 4, fontWeight: 700, fontSize: '1.1rem' }}>
              {meId ? `🎮 Bạn: ${meId}` : '🎮 Bạn'}
            </div>
            <HoldPanel hold={hold as any} />
            
            {/* Stage with Garbage Queue Bar beside it */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ 
                border: '4px solid #4ecdc4', 
                borderRadius: '8px',
                boxShadow: '0 0 20px rgba(78, 205, 196, 0.5), inset 0 0 10px rgba(78, 205, 196, 0.1)',
                padding: '4px',
                background: 'rgba(78, 205, 196, 0.05)'
              }}>
                <Stage stage={stage} />
              </div>
              
              {/* Garbage Queue Bar - using the new component */}
              <GarbageQueueBar count={incomingGarbage} />
            </div>
            
            <div style={{ display: 'grid', gap: 12 }}>
              <NextPanel queue={nextFour as any} />
              <div style={{ background: 'rgba(20,20,22,0.35)', padding: 8, borderRadius: 10, color: '#fff' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>STATUS</div>
                <div>Rows: {rows}</div>
                <div>Level: {level}</div>
                <div>Time: {(elapsedMs/1000).toFixed(2)}s</div>
                <div>Combo: {combo}</div>
                <div>B2B: {b2b}</div>
                {typeof myPing === 'number' && (
                  <div style={{ color: myPing < 50 ? '#4ecdc4' : myPing < 100 ? '#ffb800' : '#ff6b6b' }}>
                    📶 Ping: {myPing}ms
                  </div>
                )}
                {isApplyingGarbage && (
                  <div style={{ 
                    color: '#ff6b6b', 
                    fontWeight: 'bold',
                    animation: 'pulse 0.5s ease-in-out infinite',
                    textShadow: '0 0 8px rgba(255, 107, 107, 0.8)'
                  }}>
                    ⚡ Applying...
                  </div>
                )}
                <div style={{ color: incomingGarbage > 0 ? '#ff6b6b' : '#888' }}>
                  ⚠️ Incoming: {incomingGarbage}
                </div>
                <div style={{ color: '#4ecdc4' }}>💣 Sent: {garbageToSend}</div>
                <div style={{ fontSize: '10px', color: '#888', marginTop: 4 }}>
                  Debug: Bar={incomingGarbage}
                </div>
              </div>
            </div>
          </div>

          {/* Right side: OPPONENT (ĐÃ ĐỔI - Board đối thủ bên PHẢI với viền đỏ) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', alignItems: 'start', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1', color: '#ff6b6b', marginBottom: 4, fontWeight: 700, fontSize: '1.1rem' }}>
              {opponentId ? `⚔️ Đối thủ: ${opponentId}` : '⚔️ Đối thủ'}
            </div>
            <HoldPanel hold={oppHold} />
            
            {/* Stage with Garbage Queue Bar beside it */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ 
                border: '4px solid #ff6b6b', 
                borderRadius: '8px',
                boxShadow: '0 0 20px rgba(255, 107, 107, 0.5), inset 0 0 10px rgba(255, 107, 107, 0.1)',
                padding: '4px',
                background: 'rgba(255, 107, 107, 0.05)'
              }}>
                <Stage stage={(netOppStage as any) ?? oppStage} />
              </div>
              
              {/* Opponent's Garbage Queue Bar */}
              <GarbageQueueBar count={opponentIncomingGarbage} />
            </div>
            
            <div style={{ display: 'grid', gap: 12 }}>
              {countdown === null && <NextPanel queue={oppNextFour as any} />}
              <div style={{ background: 'rgba(20,20,22,0.35)', padding: 8, borderRadius: 10, color: '#fff' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>OPP STATUS</div>
                <div>GameOver: {oppGameOver ? 'YES' : 'NO'}</div>
                <div>Hold: {oppHold ? oppHold.shape || 'None' : 'None'}</div>
                {typeof oppPing === 'number' && (
                  <div style={{ color: oppPing < 50 ? '#4ecdc4' : oppPing < 100 ? '#ffb800' : '#ff6b6b' }}>
                    📶 Ping: {oppPing}ms
                  </div>
                )}
                <div style={{ fontSize: '10px', color: '#888', marginTop: 4 }}>
                  Debug: Bar={opponentIncomingGarbage}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {matchResult && (
        <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.55)', color: '#fff', textAlign: 'center', zIndex: 998 }}>
          <div style={{ background: 'rgba(20,20,22,0.8)', padding: '32px 48px', borderRadius: 16, boxShadow: '0 12px 32px rgba(0,0,0,0.45)', minWidth: 320 }}>
            <div style={{ fontSize: 42, fontWeight: 800, marginBottom: 12 }}>
              {matchResult.outcome === 'win' ? '🎉 Bạn đã thắng!' : matchResult.outcome === 'lose' ? '😢 Bạn đã thua' : '🤝 Hòa trận'}
            </div>
            {matchResult.reason && (
              <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 16 }}>Lý do: {matchResult.reason}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button
                onClick={() => {
                  if (meId) socket.emit('ranked:leave', meId);
                  if (autoExitTimerRef.current) {
                    clearInterval(autoExitTimerRef.current);
                    autoExitTimerRef.current = null;
                  }
                  cleanupWebRTC('manual-exit');
                  navigate('/');
                }}
                style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
              >
                Trở về menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Versus;