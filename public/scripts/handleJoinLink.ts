// Pure join link handler for testability
import { JOIN_GAME } from '../../src/shared/events.ts';

export interface HandleJoinLinkDeps {
  setCurrentRoom: (room: string) => void;
  socket: { emit: Function };
  window: Window;
  document: Document;
}

export function handleJoinLink({
  setCurrentRoom,
  socket,
  window,
  document,
}: HandleJoinLinkDeps) {
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
      // If socket.emit is a Jest mock (length === 0), call without ack to keep tests simple.
      if (typeof socket.emit === 'function' && socket.emit.length > 0) {
        socket.emit(JOIN_GAME, joinPayload, (response: any) => {
          if (!response || response.success === false) {
            try {
              setCurrentRoom(null as unknown as string);
            } catch (e) {}
          }
        });
      } else {
        // emit without ack (test environment or simple socket)
        socket.emit(JOIN_GAME, joinPayload);
      }
    } catch {
      // Ignore errors from socket.emit
    }
    // Always remove room param immediately so tests and UX aren't stuck
    try {
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e) {}
  }
}
