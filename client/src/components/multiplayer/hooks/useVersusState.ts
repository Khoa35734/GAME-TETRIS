import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import socket, { SERVER_URL } from '../../../socket';
import { useReliableUDP, type UDPMessage } from '../../../hooks/useReliableUDP';

import { checkCollision, createStage, isGameOverFromBuffer, getTSpinType } from '../../../game/gamehelper';
import { usePlayer } from '../../../hooks/usePlayer';
import { useStage } from '../../../hooks/useStage';
import { useGameStatus } from '../../../hooks/useGameStatus';
import { useInterval } from '../../../hooks/useInterval';
import { tryRotate } from '../../../game/srsRotation';
import { saveGameSession } from '../../../services/leaderboardService';
import { getUserId } from '../../../services/tokenStore';

// Import từ các file mới tách ra
import * as C from '../game/constants';
import * as U from '../game/utils';
import type { StageType, StageCell, TSpinType, MatchSummary } from '../game/types';

/**
 * Đây là "God Hook" chứa toàn bộ logic state, game, và network cho Versus.tsx.
 * Bạn có thể chia nhỏ hook này thành các hook nhỏ hơn (useLockDelay, useGarbage, useWebRTC...)
 * từ file này.
 */
export const useVersusState = (urlRoomId: string | undefined) => {
  const navigate = useNavigate();
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
  const udpStatsRef = useRef({ sent: 0, received: 0, failed: 0, parseErrors: 0 });
  
  // Your board state
  const [player, updatePlayerPos, resetPlayer, , hold, canHold, nextFour, holdSwap, clearHold, setQueueSeed, pushQueue, setPlayer] = usePlayer();
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

  const [playerName, setPlayerName] = useState<string>('');
  const [opponentName, setOpponentName] = useState<string>('');
  
  // Series (Best of X) State
  const [playerRole, setPlayerRole] = useState<'player1' | 'player2' | null>(null);
  const [seriesBestOf, setSeriesBestOf] = useState<number>(3);
  const [seriesWinsRequired, setSeriesWinsRequired] = useState<number>(U.getWinsRequired(3));
  const [seriesScore, setSeriesScore] = useState<{ me: number; opponent: number }>({ me: 0, opponent: 0 });
  const [seriesCurrentGame, setSeriesCurrentGame] = useState<number>(1);
  const seriesBestOfRef = useRef(seriesBestOf);
  const seriesWinsRequiredRef = useRef(seriesWinsRequired);
  const playerRoleRef = useRef<'player1' | 'player2' | null>(playerRole);
  const seriesCurrentGameRef = useRef(seriesCurrentGame);
  
  // Seed role from localStorage early to avoid null during first results
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tetris:playerRole');
      if (stored === 'player1' || stored === 'player2') {
        if (!playerRoleRef.current) {
          setPlayerRole(stored);
          playerRoleRef.current = stored;
          console.log('[Versus] Restored playerRole from storage:', stored);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    let resolvedId: string | null = null;
    let resolvedName = '';
    try {
      const userStr = localStorage.getItem('tetris:user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.accountId) resolvedId = String(user.accountId);
        if (user?.username) resolvedName = String(user.username);
      }
    } catch (err) { /* ... */ }
    if (!resolvedId) resolvedId = socket.id || `guest_${Date.now().toString(36)}`;
    setMeId(resolvedId);
    if (resolvedName) setPlayerName(resolvedName);
    console.log(`[Versus] Initial Identity: meId=${resolvedId}, playerName=${resolvedName}`);
  }, []);
  
  useEffect(() => {
    seriesBestOfRef.current = seriesBestOf;
    setSeriesWinsRequired(prev => {
      const computed = U.getWinsRequired(seriesBestOf);
      return prev === computed ? prev : computed;
    });
  }, [seriesBestOf]);
  
  useEffect(() => {
    seriesWinsRequiredRef.current = seriesWinsRequired;
  }, [seriesWinsRequired]);
  
  useEffect(() => {
    playerRoleRef.current = playerRole;
  }, [playerRole]);
  
  useEffect(() => {
    seriesCurrentGameRef.current = seriesCurrentGame;
  }, [seriesCurrentGame]);
  
  const applySeriesScore = useCallback((score: any) => {
    if (!score) {
      setSeriesScore({ me: 0, opponent: 0 });
      return;
    }
    if (typeof score.player === 'number' || typeof score.opponent === 'number') {
      setSeriesScore({
        me: Number(score.player) || 0,
        opponent: Number(score.opponent) || 0,
      });
      return;
    }
    const player1Wins = Number(score.player1Wins ?? score.player1 ?? 0) || 0;
    const player2Wins = Number(score.player2Wins ?? score.player2 ?? 0) || 0;
    const role = playerRoleRef.current;
    if (role === 'player2') {
      setSeriesScore({ me: player2Wins, opponent: player1Wins });
    } else if (role === 'player1') {
      setSeriesScore({ me: player1Wins, opponent: player2Wins });
    } else {
      setSeriesScore({ me: player1Wins, opponent: player2Wins });
    }
  }, []);
  
  // Game over animation state
  const [myFillWhiteProgress, setMyFillWhiteProgress] = useState(0); // 0-100%
  const [oppFillWhiteProgress, setOppFillWhiteProgress] = useState(0); // 0-100%
  const myFillWhiteAnimationRef = useRef<number | null>(null);
  const oppFillWhiteAnimationRef = useRef<number | null>(null);
  
  // Game stats for result overlay
  const [myStats, setMyStats] = useState({ rows: 0, level: 1, score: 0 });
  const [oppStats, _setOppStats] = useState({ rows: 0, level: 1, score: 0 });
  
  // 📊 Live game performance stats (PPS, APM)
  const [piecesPlaced, setPiecesPlaced] = useState(0);
  const [attacksSent, setAttacksSent] = useState(0);
  
  // Ping tracking
  const [myPing, setMyPing] = useState<number | null>(null);
  const [oppPing, setOppPing] = useState<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  
  // Rotation state
  const [rotationState, setRotationState] = useState<0 | 1 | 2 | 3>(0);
  
  // Garbage, Combo, B2B
  const [incomingGarbage, setIncomingGarbage] = useState(0);
  const [opponentIncomingGarbage, setOpponentIncomingGarbage] = useState(0);
  const [isApplyingGarbage, setIsApplyingGarbage] = useState(false);
  const [combo, setCombo] = useState(0);
  const [b2b, setB2b] = useState(0);
  
  // Movement state
  const [moveIntent, setMoveIntent] = useState<{ dir: number; startTime: number; dasCharged: boolean } | null>(null);
  const [_isSpaceHeld, setIsSpaceHeld] = useState(false);
  const lastHardDropTimeRef = useRef<number>(0);
  
  // Lock delay state
  const [isGrounded, setIsGrounded] = useState(false);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const capTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const capExpiredRef = useRef<boolean>(false);
  const groundedSinceRef = useRef<number | null>(null);
  const lastGroundActionRef = useRef<number | null>(null);
  
  // AFK Detection
  const afkTimeoutRef = useRef<number | null>(null);
  
  // Disconnect/Reconnect tracking
  const [disconnectCountdown, setDisconnectCountdown] = useState<number | null>(null);
  const disconnectTimerRef = useRef<number | null>(null);
  
  // Auto-exit after match ends
  const [autoExitCountdown, setAutoExitCountdown] = useState<number | null>(null);
  const autoExitTimerRef = useRef<number | null>(null);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const matchTimer = useRef<number | null>(null);
  useEffect(() => { wrapperRef.current?.focus(); }, []);

  // Opponent board state
  const [oppStage, setOppStage] = useState<any[][]>(() => createStage());
  const [oppGameOver, setOppGameOver] = useState(false);
  const [netOppStage, setNetOppStage] = useState<any[][] | null>(null);
  const [oppHold, setOppHold] = useState<any>(null);
  const [oppNextFour, setOppNextFour] = useState<any[]>([]);
  const [garbageToSend, setGarbageToSend] = useState(0);

  const pendingGarbageRef = useRef(0);
  const pendingLockRef = useRef(false);
  useEffect(() => { pendingGarbageRef.current = pendingGarbageLeft; }, [pendingGarbageLeft]);
  const readyEmittedRef = useRef(false);

   const cleanupWebRTC = useCallback((reason = 'manual') => {
    console.log(`[WebRTC] Cleanup: ${reason}`);
    setIsRtcReady(false);
    if (dcRef.current) {
      try { dcRef.current.close(); } catch {}
      dcRef.current = null;
    }
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }
  }, []);

  const applyGarbageRows = useCallback((count: number): Promise<StageType | null> => {
    if (count <= 0) return Promise.resolve(null);
    console.log(`[applyGarbageRows] Applying ${count} garbage rows...`);
    
    setIsApplyingGarbage(true);
    
    return new Promise((resolve) => {
      let currentRow = 0;
      let finalStage: StageType | null = null;
      let collisionDetected = false;
      
      const applyNextRow = () => {
        if (collisionDetected) {
          console.log(`[applyGarbageRows] ⚠️ Stopping early due to collision`);
          setIsApplyingGarbage(false);
          updatePlayerPos({ x: 0, y: 0, collided: true });
          resolve(finalStage);
          return;
        }
        
        if (currentRow >= count) {
          console.log(`[applyGarbageRows] Animation complete! Total ${count} rows`);
          setIsApplyingGarbage(false);
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
          
          const hole = Math.floor(Math.random() * width);
          cloned.shift(); // Remove top row
          cloned.push(U.createGarbageRow(width, hole)); // Add garbage row
          
          if (checkCollision(player, cloned, { x: 0, y: 0 })) {
            console.log(`[applyGarbageRows] ⚠️ COLLISION DETECTED on row ${currentRow + 1}/${count}!`);
            collisionDetected = true;
          }
          
          finalStage = cloned;
          return cloned;
        });
        
        currentRow++;
        
        if (collisionDetected) {
          applyNextRow();
        } else {
          setTimeout(applyNextRow, 100); // 100ms delay
        }
      };
      
      applyNextRow();
    });
  }, [setStage, player, updatePlayerPos]);

  // ========================================
  // ⚡ WEBRTC UDP / RELIABLE UDP HOOK
  // ========================================
  
  const onUDPMessage = useCallback((msg: UDPMessage) => {
    switch (msg.type) {
      case 'input':
        console.log('🎮 [UDP] Opponent input:', msg.payload);
        break;
      case 'garbage':
        setIncomingGarbage(prev => prev + (msg.payload?.lines || 0));
        break;
      case 'snapshot':
        if (msg.payload?.matrix) {
          setOppStage(msg.payload.matrix);
          setNetOppStage(msg.payload.matrix);
        }
        if (msg.payload?.hold) setOppHold(msg.payload.hold);
        break;
      case 'topout':
        console.log('🏁 Opponent topout:', msg.payload?.reason);
        setOppGameOver(true);
        setMatchResult({ outcome: 'win', reason: msg.payload?.reason || 'Opponent topout' });
        break;
      default:
        console.warn('⚠️ Unknown UDP msg type:', msg.type, msg);
        break;
    }
  }, []);

  const { sendUDP } = useReliableUDP({
    dc: dcRef.current,
    onMessage: onUDPMessage,
    resendLimit: 3,
    resendInterval: 200,
  });

  const sendGarbage = useCallback(
    (lines: number) => {
      const sent = sendUDP('garbage', { lines }, true);
      if (!sent && roomId) {
        socket.emit('game:attack', roomId, { lines });
      }
    },
    [sendUDP, roomId]
  );

  const sendInput = useCallback((action: string, _data?: any) => {
    sendUDP('input', { action }, false); // không cần reliable
  }, [sendUDP]);

 const sendTopout = useCallback(
    (reason?: string) => {
      const sent = sendUDP('topout', { reason }, true);
      if (!sent && roomId) socket.emit('game:topout', roomId, reason);
      setGameOver(true);
      setMatchResult({ outcome: 'lose', reason: reason || 'Topout' });
    },
    [sendUDP, roomId]
  );

  const sendSnapshot = useCallback(() => {
    const snapshot = {
      matrix: U.cloneStageForNetwork(stage),
      hold: hold,
      lines: incomingGarbage, 
    };
    const sent = sendUDP('snapshot', snapshot, true);
    if (!sent && roomId) {
      socket.emit('game:state', roomId, snapshot);
    }
  }, [stage, hold, incomingGarbage, sendUDP, roomId]);

  const handleUDPMessage = useCallback((raw: string) => {
    try {
      const msg = JSON.parse(raw) as UDPMessage;
      udpStatsRef.current.received++;
      onUDPMessage(msg);
    } catch (err) {
      udpStatsRef.current.parseErrors++;
      console.error('❌ [UDP] Parse error:', err, 'Data:', raw);
    }
  }, [onUDPMessage]);

  // ========================================
  // ⚡ WEBRTC CONNECTION SETUP
  // ========================================

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pc.onicecandidate = e => {
      if (e.candidate && roomId) {
        socket.emit('webrtc:ice', { roomId, candidate: e.candidate });
      }
    };
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] state:', pc.connectionState);
      if (pc.connectionState === 'connected') setIsRtcReady(true);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed')
        cleanupWebRTC(pc.connectionState);
    };
    return pc;
  }, [cleanupWebRTC, roomId]);
  
  const initWebRTC = useCallback(
    async (isHost: boolean) => {
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
    },
    [createPeerConnection, handleUDPMessage, roomId]
  );

  // ========================================
  // 🎯 WEBRTC SIGNALING (Socket Listeners)
  // ========================================
  
  useEffect(() => {
    const handleOffer = async ({ offer }: any) => {
      try {
        console.log('📥 [WebRTC] Received offer, creating answer...');
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
        
      } catch (err) {
        console.error('❌ [WebRTC] Offer handling failed:', err);
        cleanupWebRTC('offer-error');
      }
    };

    const handleAnswer = async ({ answer }: any) => {
      try {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error('[WebRTC] ❌ Answer handling failed:', err);
        cleanupWebRTC('answer-error');
      }
    };

    const handleICE = async ({ candidate }: any) => {
      try {
        if (pcRef.current && candidate) {
          if (!U.isUdpCandidate(candidate)) {
            return;
          }
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('[WebRTC] ⚠️ ICE candidate failed:', err);
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
  // 🎮 GAME LIFECYCLE (Socket Listeners)
  // ========================================
  
  useEffect(() => {
    const handleGameStartForWebRTC = ({ opponent }: any) => {
      if (!opponent) {
        return;
      }
      const isHost = (socket.id || '') < opponent;
      console.log('✅ [WebRTC] Game started! I am', isHost ? '🏠 HOST' : '📡 PEER');

      if (pcRef.current || dcRef.current) {
        console.log('🔄 [WebRTC] Cleaning up previous connection...');
        cleanupWebRTC('pre-game-start');
        setTimeout(() => initWebRTC(isHost), 300);
      } else {
        setTimeout(() => initWebRTC(isHost), 500);
      }
    };
    socket.on('game:start', handleGameStartForWebRTC);

    return () => {
      socket.off('game:start', handleGameStartForWebRTC);
    };
  }, [initWebRTC, cleanupWebRTC, roomId]); // Thêm roomId

  // ========================================
  // 📡 PERIODIC SNAPSHOT SENDER (UDP)
  // ========================================
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (isRtcReady) sendSnapshot();
    }, 500);
    return () => clearInterval(interval);
  }, [isRtcReady, sendSnapshot]);

  // ========================================
  // 🎬 FILL WHITE ANIMATION (Game Over Effect)
  // ========================================
  useEffect(() => {
    return () => {
      if (myFillWhiteAnimationRef.current) cancelAnimationFrame(myFillWhiteAnimationRef.current);
      if (oppFillWhiteAnimationRef.current) cancelAnimationFrame(oppFillWhiteAnimationRef.current);
    };
  }, []);

  // ========================================
  // ⏱️ LOCK DELAY LOGIC
  // ========================================
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
    }, C.INACTIVITY_LOCK_MS);

    if (!groundedSinceRef.current) {
      groundedSinceRef.current = Date.now();
      capTimeoutRef.current = setTimeout(() => {
        capExpiredRef.current = true;
        doLock();
      }, C.HARD_CAP_MS);
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
    }, C.INACTIVITY_LOCK_MS);
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

  // ========================================
  // ⏰ AFK TIMER
  // ========================================
  const resetAFKTimer = useCallback(() => {
    if (!C.AFK_ENABLED) return;
    if (afkTimeoutRef.current) {
      clearTimeout(afkTimeoutRef.current);
    }
    if (!gameOver && !matchResult && countdown === null) {
      afkTimeoutRef.current = window.setTimeout(() => {
        console.log('⏰ AFK timeout - sending topout');
        if (roomId) {
          sendTopout('afk');
        }
      }, C.AFK_TIMEOUT_MS);
    }
  }, [gameOver, matchResult, countdown, roomId, sendTopout]);

  // ========================================
  // 🚀 CORE GAME LOGIC (START, MOVEMENT)
  // ========================================
  const startGame = useCallback(() => {
    setStage(createStage());
    setDropTime(U.getFallSpeed(0));
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
    
    setIncomingGarbage(0);
    setOpponentIncomingGarbage(0);
    setCombo(0);
    setB2b(0);
    
    // 📊 Reset performance stats
    setPiecesPlaced(0);
    setAttacksSent(0);
    
    setMoveIntent(null);
    
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
    
    resetPlayer();
    setRotationState(0);
    
    pieceCountRef.current = 0;
    if (roomId) {
      setTimeout(() => socket.emit('game:requestNext', roomId, 7), 300);
    }
    
    if (C.AFK_ENABLED) {
      if (afkTimeoutRef.current) clearTimeout(afkTimeoutRef.current);
      afkTimeoutRef.current = window.setTimeout(() => {
        console.log('⏰ AFK timeout - sending topout');
        if (roomId) {
          sendTopout('afk');
        }
      }, C.AFK_TIMEOUT_MS);
    }
  }, [roomId, clearHold, setLevel, setRows, setStage, resetPlayer, sendTopout]);

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

  // ========================================
  // 📡 SOCKET: MATCHMAKING & CORE GAME EVENTS
  // ========================================
  useEffect(() => {
    const stopMatchmaking = () => {
      if (matchTimer.current) {
        clearInterval(matchTimer.current);
        matchTimer.current = null;
      }
    };

    const run = async () => {
      if (urlRoomId) {
        console.log('[Versus] Joined from lobby, roomId:', urlRoomId);
        setRoomId(urlRoomId);
        try {
          const userStr = localStorage.getItem('tetris:user');
          if (userStr) {
            const user = JSON.parse(userStr);
            const resolvedId = user.accountId?.toString() || socket.id || 'unknown';
            const resolvedName = (user.username || resolvedId).trim();
            setMeId(resolvedId);
            setPlayerName(resolvedName);
          } else {
            const fallbackId = socket.id || 'unknown';
            setMeId(fallbackId);
            setPlayerName(fallbackId);
          }
        } catch (err) {
          const fallbackId = socket.id || 'unknown';
          setMeId(fallbackId);
          setPlayerName(fallbackId);
        }
        return;
      }
      
      try {
        const userStr = localStorage.getItem('tetris:user');
        if (!userStr) {
          console.error('No user found in localStorage');
          setDebugInfo(prev => [...prev, 'ERROR: Not logged in']);
          return;
        }
        const user = JSON.parse(userStr);
        const accountId = user.accountId?.toString() || socket.id;
        const resolvedName = (user.username || accountId).trim();
        
        setMeId(accountId);
        setPlayerName(resolvedName);
        setDebugInfo(prev => [...prev, `Account ID: ${accountId} (${resolvedName})`]);
        
        const elo = 1000;
        socket.emit('ranked:enter', accountId, elo);
        socket.emit('ranked:match', accountId, elo);
        setDebugInfo(prev => [...prev, "Matchmaking started"]);
        
        matchTimer.current = window.setInterval(() => {
          socket.emit('ranked:match', accountId, elo);
        }, 2000);

      } catch (error) {
        console.error("Failed to start matchmaking:", error);
        setDebugInfo(prev => [...prev, `Error: ${String(error)}`]);
      }
    };
    run();

    const onFound = (payload: any) => {
      stopMatchmaking();
      setRoomId(payload.roomId);
      setOpponentId(payload.opponent);
      if (payload?.opponent?.username) {
        setOpponentName(String(payload.opponent.username));
      } else if (typeof payload?.opponentUsername === 'string') {
        setOpponentName(payload.opponentUsername);
      } else if (payload?.opponent) {
        setOpponentName(String(payload.opponent));
      }
    };
    socket.on('ranked:found', onFound);

    const onGameStart = (payload?: any) => {
      console.log('🎮 [Versus] game:start event received!', payload);
      stopMatchmaking();

      if (waiting) {
        if (payload?.roomId) setRoomId(payload.roomId);

        let myInfo: { id: number, name: string } | null = null;
        let opponentInfo: { id: number, name: string } | null = null;

        if (payload?.player1 && payload?.player2 && meId) {
            // Convert meId to number for comparison if needed
            const myAccountId = parseInt(String(meId), 10);
            
            if (payload.player1.id === myAccountId || String(payload.player1.id) === meId) {
                myInfo = payload.player1;
                opponentInfo = payload.player2;
            } else if (payload.player2.id === myAccountId || String(payload.player2.id) === meId) {
                myInfo = payload.player2;
                opponentInfo = payload.player1;
            } else {
                 console.error("[Versus] Could not identify player!", { meId, myAccountId, p1: payload.player1.id, p2: payload.player2.id });
            }
            
            if (myInfo?.name) {
              setPlayerName(myInfo.name);
              console.log('[Versus] ✅ My name:', myInfo.name);
            }
            if (opponentInfo?.name) {
                setOpponentId(String(opponentInfo.id));
                setOpponentName(opponentInfo.name);
                console.log('[Versus] ✅ Opponent name:', opponentInfo.name);
            }
        } else {
          console.warn("[Versus] game:start payload missing player details.");
          if (payload?.opponent) {
            setOpponentId(String(payload.opponent));
            setOpponentName(`Opponent_${String(payload.opponent).slice(0,4)}`);
          }
        }

        if (payload?.next && Array.isArray(payload.next)) {
            setQueueSeed(payload.next);
        }
        setNetOppStage(null);
        setWaiting(false);
        setCountdown(3);
        startGameRef.current();
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
      
      if (afkTimeoutRef.current) clearTimeout(afkTimeoutRef.current);
      if (disconnectTimerRef.current) clearInterval(disconnectTimerRef.current);
      setDisconnectCountdown(null);
      
      setMyStats({ rows, level, score: rows * 100 });
      
      const promises: Promise<void>[] = [];
      const runAnim = (target: 'me' | 'opp') => new Promise<void>((resolve) => {
        const setter = target === 'me' ? setMyFillWhiteProgress : setOppFillWhiteProgress;
        setter(0);
        const start = Date.now();
        const dur = 1000;
        const step = () => {
          const p = Math.min(((Date.now() - start) / dur) * 100, 100);
          setter(p);
          if (p < 100) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(step);
      });

      if (winner === socket.id) {
        setOppGameOver(true);
        setNetOppStage(null);
        promises.push(runAnim('opp'));
        Promise.all(promises).then(() => setMatchResult({ outcome: 'win', reason }));
      } else if (winner) {
        setGameOver(true);
        promises.push(runAnim('me'));
        Promise.all(promises).then(() => setMatchResult({ outcome: 'lose', reason }));
      } else {
        setGameOver(true);
        setOppGameOver(true);
        setNetOppStage(null);
        promises.push(runAnim('me'));
        promises.push(runAnim('opp'));
        Promise.all(promises).then(() => setMatchResult({ outcome: 'draw', reason }));
      }
      
      console.log('⏰ Starting 1-minute auto-exit countdown');
      setAutoExitCountdown(60);
      let remaining = 60;
      
      autoExitTimerRef.current = window.setInterval(() => {
        remaining--;
        setAutoExitCountdown(remaining);
        
        if (remaining <= 0) {
          console.log('⏰ Auto-exit timeout - forcing exit');
          clearInterval(autoExitTimerRef.current!);
          autoExitTimerRef.current = null;
          setAutoExitCountdown(null);
          
          if (meId) socket.emit('ranked:leave', meId);
          cleanupWebRTC('auto-exit');
          navigate('/?mode=1');
        }
      }, 1000);
    };
    socket.on('game:over', onGameOver);

    const onIncomingGarbage = (data: { lines: number }) => {
      setIncomingGarbage(data.lines);
    };
    socket.on('game:incomingGarbage', onIncomingGarbage);

    const onGarbageCancelled = (data: { cancelled: number; remaining: number }) => {
      setIncomingGarbage(data.remaining);
    };
    socket.on('game:garbageCancelled', onGarbageCancelled);

    const onApplyGarbage = async (data: { lines: number }) => {
      console.log('💥 Applying garbage:', data.lines);
      if (data.lines > 0 && !gameOver) {
        const updated = await applyGarbageRows(data.lines);
        setIncomingGarbage(0);

        if (updated && !gameOver) {
          if (checkCollision(player, updated, { x: 0, y: 0 })) {
            console.log('⚠️ Player position overlaps with garbage, adjusting...');
            let adjustY = 1;
            while (checkCollision(player, updated, { x: 0, y: adjustY }) && adjustY < 10) {
              adjustY++;
            }
            if (!checkCollision(player, updated, { x: 0, y: adjustY })) {
              updatePlayerPos({ x: 0, y: adjustY, collided: false });
            } else {
              setLocking(true);
            }
          }
        }

        if (updated && isGameOverFromBuffer(updated)) {
          setGameOver(true);
          setDropTime(null);
          setTimerOn(false);
          if (roomId) {
            sendTopout('garbage');
          }
        }
      }
    };
    socket.on('game:applyGarbage', onApplyGarbage);

    const onGarbage = async (g: number) => {
      console.log('🗑️ [LEGACY] Received garbage:', g);
      if (g > 0 && !gameOver) {
        const updated = await applyGarbageRows(g);
        if (updated && !gameOver) {
          if (checkCollision(player, updated, { x: 0, y: 0 })) {
            let adjustY = 1;
            while (checkCollision(player, updated, { x: 0, y: adjustY }) && adjustY < 10) adjustY++;
            if (!checkCollision(player, updated, { x: 0, y: adjustY })) {
              updatePlayerPos({ x: 0, y: adjustY, collided: false });
            } else {
              setLocking(true);
            }
          }
        }
        if (updated && isGameOverFromBuffer(updated)) {
          setGameOver(true);
          setDropTime(null);
          setTimerOn(false);
          if (roomId) {
            sendTopout('garbage');
          }
        }
      }
    };
    socket.on('game:garbage', onGarbage);
    
    const onGameState = (data: any) => {
      if (data && Array.isArray(data.matrix)) {
        setOppStage(data.matrix as StageType);
        setNetOppStage(data.matrix as StageType);
      }
      if (data && data.hold !== undefined) setOppHold(data.hold);
      if (data && Array.isArray(data.next)) setOppNextFour(data.next.slice(0, 4));
      if (data && Array.isArray(data.nextFour)) setOppNextFour(data.nextFour.slice(0, 4));
    };
    socket.on('game:state', onGameState);

    const onPlayerDisconnect = (data: any) => {
      if (data?.playerId === opponentId) {
        console.log('🔌 Opponent disconnected, starting 5s countdown');
        setDisconnectCountdown(5);
        let remaining = 5;
        
        disconnectTimerRef.current = window.setInterval(() => {
          remaining--;
          setDisconnectCountdown(remaining);
          
          if (remaining <= 0) {
            clearInterval(disconnectTimerRef.current!);
            disconnectTimerRef.current = null;
            setDisconnectCountdown(null);
            setTimerOn(false);
            setDropTime(null);
            setOppGameOver(true);
            setMatchResult({ outcome: 'win', reason: 'Đối thủ đã ngắt kết nối' });
            if (afkTimeoutRef.current) clearTimeout(afkTimeoutRef.current);
          }
        }, 1000);
      }
    };
    socket.on('player:disconnect', onPlayerDisconnect);

    const onPlayerReconnect = (data: any) => {
      if (data?.playerId === opponentId) {
        console.log('✅ Opponent reconnected, canceling countdown');
        if (disconnectTimerRef.current) {
          clearInterval(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }
        setDisconnectCountdown(null);
        setOppGameOver(true);
        setMatchResult({ outcome: 'win', reason: 'Opponent disconnected' });
      }
    };
    socket.on('player:reconnect', onPlayerReconnect);

    const onAttackSent = (data: { amount: number }) => {
        if (data && typeof data.amount === 'number' && data.amount > 0) {
            setGarbageToSend(prev => prev + data.amount);
        }
    };
    socket.on('game:attack_sent', onAttackSent);
    
    if (roomId && !readyEmittedRef.current) {
      console.log(`[Client] Emitting game:im_ready for room ${roomId}`);
      socket.emit('game:im_ready', roomId);
      readyEmittedRef.current = true;
    }

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
    meId, waiting, opponentId, gameOver, roomId, urlRoomId, 
    applyGarbageRows, cleanupWebRTC, navigate, player, updatePlayerPos, sendTopout
  ]);

  // ========================================
  // 📡 SOCKET: SERIES (BEST OF X) EVENTS
  // ========================================
  useEffect(() => {
    const handleMatchmakingStart = (payload: any) => {
      if (!payload) return;
      if (payload.playerRole) setPlayerRole(payload.playerRole);
      if (payload.player?.username) setPlayerName(String(payload.player.username));
      if (payload.opponent?.username) setOpponentName(String(payload.opponent.username));
      else if (payload.opponent?.accountId) setOpponentName(`User${payload.opponent.accountId}`);
      else if (payload.opponent) setOpponentName(payload.opponent);
      if (payload.roomId) setRoomId(prev => prev ?? payload.roomId);

      const bestOfRaw = payload?.series?.bestOf ?? seriesBestOfRef.current;
      const normalizedBestOf = U.normalizeBestOf(bestOfRaw);
      setSeriesBestOf(normalizedBestOf);

      const winsRequired = payload?.series?.winsRequired ?? U.getWinsRequired(normalizedBestOf);
      setSeriesWinsRequired(winsRequired);

      setSeriesCurrentGame(payload?.series?.currentGame ?? 1);
      applySeriesScore(payload?.series?.score);
    };
    socket.on('matchmaking:start', handleMatchmakingStart);

    return () => {
      socket.off('matchmaking:start', handleMatchmakingStart);
    };
  }, [applySeriesScore, setRoomId]);

  useEffect(() => {
    const resolveBestOf = (raw?: number) => U.normalizeBestOf(raw ?? seriesBestOfRef.current);

    const handleMatchStart = (payload: any) => {
      if (!payload) return;
      if (payload.player1?.socketId && payload.player2?.socketId) {
        if (socket.id === payload.player1.socketId) {
          setPlayerRole('player1');
          if (payload.player1.username) setPlayerName(String(payload.player1.username));
          if (payload.player2.username) setOpponentName(String(payload.player2.username));
        } else if (socket.id === payload.player2.socketId) {
          setPlayerRole('player2');
          if (payload.player2.username) setPlayerName(String(payload.player2.username));
          if (payload.player1.username) setOpponentName(String(payload.player1.username));
        }
      }

      const normalizedBestOf = resolveBestOf(payload.bestOf);
      setSeriesBestOf(normalizedBestOf);
      setSeriesWinsRequired(payload?.winsRequired ?? U.getWinsRequired(normalizedBestOf));
      setSeriesCurrentGame(payload?.currentGame ?? 1);
      applySeriesScore(payload.score);
    };

    const handleGameResult = (payload: any) => {
      if (payload?.score) applySeriesScore(payload.score);
      if (typeof payload?.nextGame === 'number') setSeriesCurrentGame(payload.nextGame);
    };

    const handleNextGameStart = (payload: any) => {
      if (payload?.score) applySeriesScore(payload.score);
      if (typeof payload?.gameNumber === 'number') setSeriesCurrentGame(payload.gameNumber);
    };

    const handleMatchEnd = async (payload: any) => {
      console.log('[BO3] Match ended:', payload);
      
      if (payload?.score) applySeriesScore(payload.score);
      if (Array.isArray(payload.games)) setSeriesCurrentGame(payload.games.length);
      
      if (payload?.winner === 'player1' || payload?.winner === 'player2') {
        const role = playerRoleRef.current;
        if (role) {
          const didWin = payload.winner === role;
          
          if (didWin) {
            setMatchResult(prev => prev ?? { outcome: 'win', reason: 'Match end' });
            setOppGameOver(true);
          } else {
            setMatchResult(prev => prev ?? { outcome: 'lose', reason: 'Match end' });
            setGameOver(true);
          }

          // 🎯 LƯU KẾT QUẢ VÀO DATABASE
          try {
            const myUserId = getUserId();
            const oppUserId = payload.opponentUserId; // Server sẽ gửi
            const sessionUuid = payload.sessionUuid || crypto.randomUUID(); // Server sẽ gửi hoặc tạo mới
            const score = payload.score || { player1: 0, player2: 0 };
            const player1Score = role === 'player1' ? score.player1 : score.player2;
            const player2Score = role === 'player1' ? score.player2 : score.player1;
            const totalGames = (payload.games || []).length;
            const durationSeconds = Math.floor(elapsedMs / 1000);
            
            if (myUserId && oppUserId) {
              console.log('[BO3] Saving ranked match to DB:', {
                sessionUuid,
                player1Id: myUserId,
                player2Id: oppUserId,
                winnerId: didWin ? myUserId : oppUserId,
                player1Score,
                player2Score,
                totalGames,
                durationSeconds
              });

              await saveGameSession({
                sessionUuid,
                gameMode: 'ranked',
                matchType: 'BO3',
                player1Id: myUserId,
                player2Id: oppUserId,
                winnerId: didWin ? myUserId : oppUserId,
                player1Score,
                player2Score,
                totalGames,
                durationSeconds,
                status: 'completed'
              });

              console.log('[BO3] ✅ Match result saved to database!');
            } else {
              console.warn('[BO3] ⚠️ Cannot save match - missing user IDs:', { myUserId, oppUserId });
            }
          } catch (error) {
            console.error('[BO3] ❌ Failed to save match result:', error);
          }
        }
      }
    };

    socket.on('bo3:match-start', handleMatchStart);
    socket.on('bo3:game-result', handleGameResult);
    socket.on('bo3:next-game-start', handleNextGameStart);
    socket.on('bo3:match-end', handleMatchEnd);

    return () => {
      socket.off('bo3:match-start', handleMatchStart);
      socket.off('bo3:game-result', handleGameResult);
      socket.off('bo3:next-game-start', handleNextGameStart);
      socket.off('bo3:match-end', handleMatchEnd);
    };
  }, [applySeriesScore]);

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
    pingIntervalRef.current = window.setInterval(() => {
      socket.emit('ping', Date.now());
    }, 2000);

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

  // ========================================
  // ⌨️ PLAYER INPUT & MOVEMENT
  // ========================================
  const movePlayer = useCallback((dir: number) => {
    if (gameOver || countdown !== null || matchResult !== null) return false;
    if (!checkCollision(player, stage, { x: dir, y: 0 })) {
      updatePlayerPos({ x: dir, y: 0, collided: false });
      return true;
    }
    return false;
  }, [gameOver, countdown, matchResult, player, stage, updatePlayerPos]);

  const movePlayerToSide = useCallback((dir: number) => {
    if (gameOver || countdown !== null || matchResult !== null) return;
    let distance = 0;
    while (!checkCollision(player, stage, { x: dir * (distance + 1), y: 0 })) distance += 1;
    if (distance > 0) {
      updatePlayerPos({ x: dir * distance, y: 0, collided: false });
    }
  }, [gameOver, countdown, matchResult, player, stage, updatePlayerPos]);

  const hardDrop = () => {
    if (gameOver || countdown !== null || matchResult !== null || isApplyingGarbage) return;
    let dropDistance = 0;
    while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) dropDistance += 1;
    updatePlayerPos({ x: 0, y: dropDistance, collided: true });
    setLocking(true);
  };

  const playerRotateSRS = useCallback((direction: 1 | -1 | 2) => {
    if (gameOver || countdown !== null || matchResult !== null) return;
    if (player.type === 'O') return;

    const result = tryRotate(
      { ...player, type: player.type, rotationState },
      stage,
      direction,
      rotationState
    );

    if (result.success) {
      setPlayer(prev => ({
        ...prev,
        tetromino: result.newMatrix,
        pos: { x: result.newX, y: result.newY },
      }));
      setRotationState(result.newRotationState);
    }
  }, [player, stage, rotationState, gameOver, countdown, matchResult, setPlayer, setRotationState]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (gameOver || countdown !== null || matchResult !== null) return;
    if ([32, 37, 38, 39, 40, 16, 67].includes(e.keyCode)) {
      e.preventDefault();
      e.stopPropagation();
    }
    resetAFKTimer();
  
    const { keyCode } = e;
    if (keyCode === 37 || keyCode === 39) { // Left / Right
      const dir = keyCode === 37 ? -1 : 1;
      if (!moveIntent || moveIntent.dir !== dir) {
        sendInput('move', { direction: dir });
        const moved = movePlayer(dir);
        setMoveIntent({ dir, startTime: Date.now(), dasCharged: false });
        if (moved && isGrounded) onGroundAction();
      }
    } else if (keyCode === 40) { // Down
      if (!checkCollision(player, stage, { x: 0, y: 1 })) {
        updatePlayerPos({ x: 0, y: 1, collided: false });
      } else {
        startGroundTimers();
      }
    } else if (keyCode === 38 || keyCode === 88) { // Rotate CW
      if (!locking) {
        sendInput('rotate', { direction: 1 });
        playerRotateSRS(1);
        if (checkCollision(player, stage, { x: 0, y: 1 })) onGroundAction();
      }
    } else if (keyCode === 90 || keyCode === 17) { // Rotate CCW
      if (!locking) {
        sendInput('rotate', { direction: -1 });
        playerRotateSRS(-1);
        if (checkCollision(player, stage, { x: 0, y: 1 })) onGroundAction();
      }
    } else if (C.ENABLE_180_ROTATION && keyCode === 65) { // Rotate 180°
      if (!locking) {
        sendInput('rotate', { direction: 2 });
        playerRotateSRS(2);
        if (checkCollision(player, stage, { x: 0, y: 1 })) onGroundAction();
      }
    } else if (keyCode === 32) { // Hard Drop
      if (!e.repeat) {
        sendInput('hard_drop');
        hardDrop();
        lastHardDropTimeRef.current = Date.now();
        setIsSpaceHeld(true);
      } else {
        const now = Date.now();
        if (now - lastHardDropTimeRef.current >= C.HARD_DROP_SPAM_INTERVAL) {
          sendInput('hard_drop');
          hardDrop();
          lastHardDropTimeRef.current = now;
        }
      }
    } else if (keyCode === 67) { // Hold
      if (!hasHeld && canHold) {
        sendInput('hold');
        holdSwap();
        setHasHeld(true);
        setRotationState(0);
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (gameOver || countdown !== null || matchResult !== null) return;
    const { keyCode } = e;
    if (keyCode === 37 || keyCode === 39) { // Left / Right
      setMoveIntent(null);
    } else if (keyCode === 40) { // Down
      setDropTime(isGrounded ? null : U.getFallSpeed(level));
    } else if (keyCode === 32) { // Space release
      setIsSpaceHeld(false);
    }
  };

  // ========================================
  // ⚙️ GAME INTERVALS (Gravity, DAS, ARR)
  // ========================================
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
    if (!moveIntent || locking || gameOver || countdown !== null || matchResult !== null) return;
    const { dir, startTime, dasCharged } = moveIntent;
    const now = Date.now();
    if (now - startTime > C.DAS_DELAY && !dasCharged) {
      if (C.MOVE_INTERVAL === 0) movePlayerToSide(dir);
      setMoveIntent(prev => prev ? { ...prev, dasCharged: true } : null);
    }
  }, C.MOVE_INTERVAL > 0 ? C.MOVE_INTERVAL : 16);

  // ARR Movement
  useInterval(() => {
    if (!moveIntent || !moveIntent.dasCharged || C.MOVE_INTERVAL === 0 || locking || gameOver || countdown !== null || matchResult !== null) return;
    const moved = movePlayer(moveIntent.dir);
    if (moved && isGrounded) onGroundAction();
  }, C.MOVE_INTERVAL > 0 ? C.MOVE_INTERVAL : null);

  // ========================================
  // ⛓️ GAME LOGIC CHAIN (useEffect)
  // ========================================
  
  // Khi `locking` (từ gravity hoặc hard drop) -> set `collided`
  useEffect(() => {
    if (locking) {
      updatePlayerPos({x: 0, y: 0, collided: true});
    }
  }, [locking, updatePlayerPos]);
  
  // Khi `rowsCleared` (từ useStage) -> update `rows` và `level`
  useEffect(() => {
    if (rowsCleared > 0) {
      setRows(prev => {
        const next = prev + rowsCleared;
        setLevel(Math.floor(next / 10));
        return next;
      });
    }
  }, [rowsCleared, setRows, setLevel]);

  // Khi `player` hoặc `stage` thay đổi -> check `isGrounded` -> trigger `lock timers`
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

  // Khi `player.collided` (từ useStage) -> set cờ `pendingLockRef`
  useEffect(() => {
    if (!player.collided) return;
    pendingLockRef.current = true;
  }, [player.collided]);

  // Khi `lastPlacement` (từ useStage) và `pendingLockRef` -> XỬ LÝ LOCK
  useEffect(() => {
    if (!pendingLockRef.current) return;
    pendingLockRef.current = false;
    setLocking(false);

    const lines = lastPlacement.cleared;
    const mergedStage = lastPlacement.mergedStage;
    const tspinType: TSpinType = getTSpinType(player as any, mergedStage as any, lines);
    const pc = lines > 0 && U.isPerfectClearBoard(stage);

    // 1. Tính toán Combo và B2B
    const isTetris = tspinType === 'none' && lines === 4;
    const isTSpinClear = tspinType !== 'none' && lines > 0;
    let newB2b = b2b;
    let newCombo = combo;
    if (lines > 0) {
        newCombo = combo + 1;
        if (isTetris || isTSpinClear) {
            newB2b = b2b + 1;
        } else {
            newB2b = 0;
        }
    } else {
        newCombo = 0;
    }

    // 2. Tính toán và gửi Garbage
    if (lines > 0 && roomId) {
        const garbageLines = U.calculateGarbageLines(lines, tspinType, pc, newCombo, newB2b);
        if (garbageLines > 0) {
            sendGarbage(garbageLines);
            setAttacksSent(prev => prev + garbageLines); // 📊 Track attacks
            setOpponentIncomingGarbage(prev => prev + garbageLines);
            setTimeout(() => {
                setOpponentIncomingGarbage(prev => Math.max(0, prev - garbageLines));
            }, 500);
        }
    }

    // 3. Cập nhật state
    setCombo(newCombo);
    setB2b(newB2b);
    
    // 📊 Increment pieces placed counter
    setPiecesPlaced(prev => prev + 1);

    // 4. Check Game Over
    if (isGameOverFromBuffer(stage)) {
        setGameOver(true);
        setDropTime(null);
        setTimerOn(false);
        if (roomId) sendTopout('topout');
        return;
    }

    // 5. Reset cho khối tiếp theo
    resetPlayer();
    setHasHeld(false);
    setRotationState(0);
    setDropTime(U.getFallSpeed(level));
    pieceCountRef.current += 1;
    if (roomId && pieceCountRef.current % 7 === 0) {
        socket.emit('game:requestNext', roomId, 7);
    }
  }, [lastPlacement, stage, roomId, level, combo, b2b, rowsCleared, resetPlayer, player, sendGarbage, sendTopout]); // Thêm dependencies

  // Khi `player` thay đổi (khối mới) -> check `spawn block-out`
  useEffect(() => {
    if (
      player.pos.y === 0 && !player.collided && !locking &&
      countdown === null && !gameOver
    ) {
      if (checkCollision(player, stage, { x: 0, y: 0 })) {
        setGameOver(true);
        setDropTime(null);
        setTimerOn(false);
        if (roomId) sendTopout('spawn_blockout');
      }
    }
  }, [player, stage, locking, countdown, gameOver, roomId, sendTopout]);

  // ========================================
  // 📡 LEGACY STATE SYNC (TCP Fallback)
  // ========================================
  const lastSyncTime = useRef<number>(0);
  const lastSyncedStage = useRef<StageType | null>(null);
  
  useEffect(() => {
    if (!roomId || waiting || gameOver || countdown !== null || isRtcReady) return;
    
    const stageChanged = JSON.stringify(lastSyncedStage.current) !== JSON.stringify(stage);
    if (!stageChanged) return;
    
    const now = Date.now();
    if (now - lastSyncTime.current < 100) return;
    lastSyncTime.current = now;
    lastSyncedStage.current = stage;
    
    const gameState = {
      matrix: U.cloneStageForNetwork(stage),
      hold,
      next: nextFour
    };
    
    socket.emit('game:state', roomId, gameState);
  }, [stage, hold, nextFour, roomId, waiting, gameOver, countdown, isRtcReady]);

  // ========================================
  // ⏱️ ELAPSED TIME (Timer)
  // ========================================
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
  
  // ========================================
  // 🎁 RETURN ALL STATE & HANDLERS FOR UI
  // ========================================
  return {
    // Refs
    wrapperRef,
    udpStatsRef,
    autoExitTimerRef, // UI cần để clear khi nhấn nút Thoát
    
    // Event Handlers
    handleKeyDown,
    handleKeyUp,
    
    // State
    waiting,
    roomId,
    meId,
    debugInfo,
    isRtcReady,
    matchResult,
    autoExitCountdown,
    countdown,
    disconnectCountdown,
    
    // My Info
    playerName,
    player,
    stage,
    hold,
    nextFour,
    myFillWhiteProgress,
    incomingGarbage,
    rows,
    level,
    elapsedMs,
    combo,
    b2b,
    myPing,
    isApplyingGarbage,
    garbageToSend,
    myStats,
    
    // 📊 Live performance stats
    piecesPlaced,
    attacksSent,
    
    // Opponent Info
    opponentName,
    opponentId,
    oppStage,
    netOppStage,
    oppHold,
    oppNextFour,
    oppFillWhiteProgress,
    opponentIncomingGarbage,
    oppGameOver,
    oppPing,
    oppStats,
    
    // Series Info
    seriesScore,
    seriesBestOf,
    seriesWinsRequired,
    seriesCurrentGame,
    
    // Functions
    sendTopout,
    cleanupWebRTC,
    navigate,
    SERVER_URL,
    socket, // Cần cho nút Thoát
  };
};
