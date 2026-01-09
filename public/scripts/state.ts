import { io, Socket } from 'socket.io-client';

import type { GameStateData } from '../../src/shared/types.js';

let socket: Socket;
let socketReady: Promise<void>;

function getSocketURL(port: string): string {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:${port}`;
}

async function initSocket(): Promise<Socket> {
  const socketOptions = {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: 10, // Increase reconnection attempts
    timeout: 20000, // Increase connection timeout
  };

  // Dynamic Connection Strategy:
  // 1. Try to fetch /current-port.txt (served by server/Vite) to get the REAL backend port.
  // 2. If successful, connect directly to http://${hostname}:${port}. This works for IP/Mobile and Localhost.
  // 3. If unsuccessful (fetch fails), fall back to io() which uses the window.location (relying on Proxy).

  try {
    const resp = await fetch('/current-port.txt', { cache: 'no-store' });
    if (resp.ok) {
      const port = (await resp.text()).trim();
      console.log(`🔌 [Client] Detected server port via file: ${port}`);

      if (window.location.port === '5173') {
        console.log(`🔌 [Client] Vite Dev Mode: Connecting directly to backend at :${port}`);
        return io(getSocketURL(port), socketOptions);
      }

      // If we are serving from the backend (port matches), relative is fine.
      if (window.location.port === port) {
        return io(socketOptions);
      }

      return io(getSocketURL(port), socketOptions);
    }
  } catch (error) {
    console.warn('📣 [Client] Could not fetch current-port.txt, falling back to default/proxy strategy.', error);
  }

  // Fallback / Default Strategy
  // If we are on Vite (5173) and couldn't get the port, rely on the Proxy (ws://localhost:3000)
  if (window.location.port === '5173') {
     console.log('🔌 [Client] Vite detected (no port file), using Proxy connection.');
     return io(socketOptions);
  }

  console.log('🔌 [Client] Using default same-origin connection.');
  return io(socketOptions);
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

function loadSession(): void {
  setMyId(sessionStorage.getItem('myId'));
  setCurrentRoom(sessionStorage.getItem('currentRoom'));
  const cpuStr = sessionStorage.getItem('desiredCpuCount');
  if (cpuStr) desiredCpuCount = parseInt(cpuStr, 10) || 0;
  isSpectator = sessionStorage.getItem('spectator') === '1';
}

function saveSession(): void {
  if (myId) sessionStorage.setItem('myId', myId);
  if (currentRoom) sessionStorage.setItem('currentRoom', currentRoom);
  sessionStorage.setItem('desiredCpuCount', desiredCpuCount.toString());
  if (isSpectator) {
    sessionStorage.setItem('spectator', '1');
  } else {
    sessionStorage.removeItem('spectator');
  }
}

function setMyId(id: string | null): void {
  myId = id;
}
function setCurrentRoom(room: string | null): void {
  currentRoom = room;
}

function setDesiredCpuCount(count: number): void {
  desiredCpuCount = count;
  sessionStorage.setItem('desiredCpuCount', count.toString());
}

function getDesiredCpuCount(): number {
  return desiredCpuCount;
}
function setIsSpectator(value: boolean): void {
  isSpectator = value;
  if (isSpectator) {
    sessionStorage.setItem('spectator', '1');
  } else {
    sessionStorage.removeItem('spectator');
  }
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
