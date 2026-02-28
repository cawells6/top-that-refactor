import { io, Socket } from 'socket.io-client';

import type { GameStateData } from '../../src/shared/types.js';
import type { ServerToClientEvents, ClientToServerEvents } from '../../src/shared/events.js';

/** Fully-typed client socket */
type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket;
let socketReady: Promise<void>;

function getSocketURL(port: string): string {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:${port}`;
}

async function initSocket(): Promise<TypedSocket> {
  const socketOptions = {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: 10, // Increase reconnection attempts
    timeout: 20000, // Increase connection timeout
  };

  // Production / deployed environments (Render, etc) should always connect via same-origin.
  // Note: The server's internal PORT is not externally reachable; the platform proxy terminates HTTPS.
  const isViteDevServer = window.location.port === '5173';
  if (!isViteDevServer) {
    console.log('🔌 [Client] Using same-origin socket connection.');
    return io(socketOptions) as TypedSocket;
  }

  try {
    const resp = await fetch('/current-port.txt', { cache: 'no-store' });
    if (resp.ok) {
      const port = (await resp.text()).trim();
      if (/^\\d+$/.test(port)) {
        console.log(
          `🔌 [Client] Vite Dev Mode: Connecting directly to backend at :${port}`
        );
        return io(getSocketURL(port), socketOptions) as TypedSocket;
      }
    }
  } catch (error) {
    console.warn(
      '📣 [Client] Could not fetch current-port.txt, using Vite proxy connection.',
      error
    );
  }

  // Vite fallback: rely on the configured proxy.
  console.log('🔌 [Client] Vite detected, using proxy socket connection.');
  return io(socketOptions) as TypedSocket;
}

socketReady = initSocket().then((s) => {
  socket = s;
  return;
});

let myId: string | null = null;
let currentRoom: string | null = null;
let pileTransition: boolean = false;
let specialEffectsQueue: any[] = [];
let processingEffects: boolean = false;
let desiredCpuCount = 0;
let isSpectator = false;
const stateHistory: any[] = [];
let stateIndex: number = -1;
let lastGameState: GameStateData | null = null;
let lastPlayedCards: any[] = [];

/** localStorage key and TTL for cross-tab rejoin persistence */
const SESSION_KEY = 'TOPTHAT_SESSION';
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

interface StoredSession {
  myId: string | null;
  currentRoom: string | null;
  desiredCpuCount: number;
  spectator: boolean;
  savedAt: number;
}

function loadSession(): void {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const data: StoredSession = JSON.parse(raw);
    if (Date.now() - data.savedAt > SESSION_TTL_MS) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    setMyId(data.myId);
    setCurrentRoom(data.currentRoom);
    desiredCpuCount = data.desiredCpuCount ?? 0;
    isSpectator = data.spectator ?? false;
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }
}

function saveSession(): void {
  const data: StoredSession = {
    myId,
    currentRoom,
    desiredCpuCount,
    spectator: isSpectator,
    savedAt: Date.now(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  setMyId(null);
  setCurrentRoom(null);
  desiredCpuCount = 0;
  isSpectator = false;
}

function setMyId(id: string | null): void {
  myId = id;
}
function setCurrentRoom(room: string | null): void {
  currentRoom = room;
}

function setDesiredCpuCount(count: number): void {
  desiredCpuCount = count;
  saveSession();
}

function getDesiredCpuCount(): number {
  return desiredCpuCount;
}
function setIsSpectator(value: boolean): void {
  isSpectator = value;
  saveSession();
}
function getIsSpectator(): boolean {
  return isSpectator;
}
function setPileTransition(value: boolean): void {
  pileTransition = value;
}
function setProcessingEffects(value: boolean): void {
  processingEffects = value;
}
function addSpecialEffect(effect: any): void {
  specialEffectsQueue.push(effect);
}
function clearSpecialEffects(): void {
  specialEffectsQueue = [];
}
function setStateIndex(index: number): void {
  stateIndex = index;
}
function setLastGameState(gameState: GameStateData | null): void {
  lastGameState = gameState;
}

function setLastPlayedCards(cards: any[]): void {
  lastPlayedCards = cards;
}

function getLastPlayedCards(): any[] {
  return lastPlayedCards;
}

function getLastGameState(): GameStateData | null {
  return lastGameState;
}

export {
  socket,
  socketReady,
  myId,
  currentRoom,
  pileTransition,
  specialEffectsQueue,
  processingEffects,
  desiredCpuCount,
  isSpectator,
  stateHistory,
  stateIndex,
  lastGameState,
  loadSession,
  saveSession,
  clearSession,
  setMyId,
  setCurrentRoom,
  setDesiredCpuCount,
  getDesiredCpuCount,
  setIsSpectator,
  getIsSpectator,
  setPileTransition,
  setProcessingEffects,
  addSpecialEffect,
  clearSpecialEffects,
  setStateIndex,
  setLastGameState,
  setLastPlayedCards,
  getLastPlayedCards,
  getLastGameState,
};
