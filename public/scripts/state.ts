import { io, Socket } from 'socket.io-client';
import { GameStateData } from '../../src/shared/types.js';

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

  // Special handling for Vite development server
  // When running on port 5173 (Vite's default), connect directly to port 3000
  if (window.location.port === '5173') {
    console.log(
      '🔌 [Client] Detected Vite dev server, connecting directly to game server on port 3000'
    );
    return io('http://localhost:3000', socketOptions);
  }

  // For production or other cases, try to use current-port.txt for dynamic server detection
  try {
    const resp = await fetch('/current-port.txt', { cache: 'no-store' });
    if (resp.ok) {
      const port = (await resp.text()).trim();
      console.log(`🔌 [Client] Using detected server port: ${port}`);

      // If the port matches the current location, use default (relative) connection
      if (window.location.port === port) {
        return io(socketOptions);
      }
      return io(getSocketURL(port), socketOptions);
    }
  } catch (error) {
    console.warn('📣 [Client] Failed to fetch current-port.txt:', error);
  }

  // Fallback: connect to same origin
  console.log('🔌 [Client] Using fallback connection to same origin');
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
const stateHistory: any[] = [];
let stateIndex: number = -1;
let lastGameState: GameStateData | null = null;

function loadSession(): void {
  setMyId(sessionStorage.getItem('myId'));
  setCurrentRoom(sessionStorage.getItem('currentRoom'));
  const cpuStr = sessionStorage.getItem('desiredCpuCount');
  if (cpuStr) desiredCpuCount = parseInt(cpuStr, 10) || 0;
}

function saveSession(): void {
  if (myId) sessionStorage.setItem('myId', myId);
  if (currentRoom) sessionStorage.setItem('currentRoom', currentRoom);
  sessionStorage.setItem('desiredCpuCount', desiredCpuCount.toString());
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

export {
  socket,
  socketReady,
  myId,
  currentRoom,
  pileTransition,
  specialEffectsQueue,
  processingEffects,
  desiredCpuCount,
  stateHistory,
  stateIndex,
  lastGameState,
  loadSession,
  saveSession,
  setMyId,
  setCurrentRoom,
  setDesiredCpuCount,
  getDesiredCpuCount,
  setPileTransition,
  setProcessingEffects,
  addSpecialEffect,
  clearSpecialEffects,
  setStateIndex,
  setLastGameState,
};
