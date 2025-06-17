// Pure join link handler for testability
import { JOIN_GAME } from '../../src/shared/events.ts';

export interface HandleJoinLinkDeps {
  setCurrentRoom: (room: string) => void;
  socket: { emit: Function };
  window: Window;
  document: Document;
}

export function handleJoinLink({ setCurrentRoom, socket, window, document }: HandleJoinLinkDeps) {
  const urlParams = new URLSearchParams(window.location.search);
  const roomIdFromUrl = urlParams.get('room');
  const inSession = document.body.classList.contains('in-session');
  if (roomIdFromUrl && !inSession) {
    try {
      setCurrentRoom(roomIdFromUrl);
    } catch {
      // Ignore errors from setCurrentRoom
    }
    const joinPayload = {
      roomId: roomIdFromUrl,
      playerName: 'Guest',
      numHumans: 1,
      numCPUs: 0,
    };
    try {
      socket.emit(JOIN_GAME, joinPayload);
    } catch {
      // Ignore errors from socket.emit
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}
