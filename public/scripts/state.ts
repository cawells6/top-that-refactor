// public/scripts/state.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket;
export let socketReady: Promise<void>;

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
export { socket };

export let myId: string | null = null;
export let currentRoom: string | null = null;
export let pileTransition: boolean = false;
export let specialEffectsQueue: any[] = []; // Consider defining a type for effects
export let processingEffects: boolean = false;

export const stateHistory: any[] = []; // Consider defining a type for state history items
export let stateIndex: number = -1;

export function loadSession(): void {
  setMyId(sessionStorage.getItem('myId'));
  setCurrentRoom(sessionStorage.getItem('currentRoom'));
}

export function saveSession(): void {
  if (myId) sessionStorage.setItem('myId', myId);
  if (currentRoom) sessionStorage.setItem('currentRoom', currentRoom);
}

export function setMyId(id: string | null): void {
  myId = id;
}
export function setCurrentRoom(room: string | null): void {
  currentRoom = room;
}
export function setPileTransition(value: boolean): void {
  pileTransition = value;
}
export function setProcessingEffects(value: boolean): void {
  processingEffects = value;
}
export function addSpecialEffect(effect: any): void {
  specialEffectsQueue.push(effect);
}
export function clearSpecialEffects(): void {
  specialEffectsQueue = [];
}
export function setStateIndex(index: number): void {
  stateIndex = index;
}
