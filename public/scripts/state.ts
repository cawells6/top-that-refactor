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

  // Production / deployed environments (Render, etc) should always connect via same-origin.
  // Note: The server's internal PORT is not externally reachable; the platform proxy terminates HTTPS.
  const isViteDevServer = window.location.port === '5173';
  if (!isViteDevServer) {
    console.log('🔌 [Client] Using same-origin socket connection.');
    return io(socketOptions);
  }

  try {
    const resp = await fetch('/current-port.txt', { cache: 'no-store' });
    if (resp.ok) {
      const port = (await resp.text()).trim();
      if (/^\\d+$/.test(port)) {
        console.log(
          `🔌 [Client] Vite Dev Mode: Connecting directly to backend at :${port}`
        );
        return io(getSocketURL(port), socketOptions);
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
