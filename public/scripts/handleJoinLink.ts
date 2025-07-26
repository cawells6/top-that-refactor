// Pure join link handler for testability
import { emitJoinGame } from './acknowledgmentUtils.js';

export interface HandleJoinLinkDeps {
  setCurrentRoom: (room: string) => void;
  socket: any;
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
      emitJoinGame(socket, joinPayload, {
        onSuccess: (response) => {
          console.log('[handleJoinLink] Join successful:', response);
        },
        onError: (error) => {
          console.warn('[handleJoinLink] Join failed:', error);
          // Don't show user errors for automatic join attempts
        },
      });
    } catch {
      // Ignore errors from emitJoinGame
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}
