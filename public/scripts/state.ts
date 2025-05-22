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
  try {
    const resp = await fetch('/current-port.txt', { cache: 'no-store' });
    if (resp.ok) {
      const port = (await resp.text()).trim();
      // If the port matches the current location, use default (relative) connection
      if (window.location.port === port) {
        return io({
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 10000,
        });
      }
      return io(getSocketURL(port), {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
      });
    }
  } catch {
    // Ignore and fallback
  }
  // Fallback: connect to same origin
  return io({
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });
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
