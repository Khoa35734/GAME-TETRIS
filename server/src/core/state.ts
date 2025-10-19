import { TType } from '../game/pieceGenerator';
import { Room } from './types';

// Legacy rooms (in-memory)
export const rooms = new Map<string, Room>();

// Track accountId to socket.id mapping
export const accountToSocket = new Map<string, string>();

// Track IP to live socket ids (legacy)
export const ipToSockets = new Map<string, Set<string>>();

// Redis-based match generators
export const matchGenerators = new Map<string, Generator<TType, any, any>>();

// Ping tracking
export const playerPings = new Map<string, { ping: number; lastUpdate: number }>();

// Online users (userId -> socketId)
export const onlineUsers = new Map<number, string>();
// Presence tracking
export type PresenceStatus = 'online' | 'offline' | 'in_game';
export type Presence = { status: PresenceStatus; mode?: 'single' | 'multi'; since: number };
export const userPresence = new Map<number, Presence>();


// Players ready for game start
export const playersReadyForGame = new Map<string, Set<string>>();