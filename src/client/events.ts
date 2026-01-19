import type { Socket } from 'socket.io-client';

import { JOIN_GAME } from '../shared/events.js';
import type { GameStateData, JoinGamePayload, JoinGameResponse } from '../shared/types.js';

export function attachClientDebugLogging(socket: Socket): void {
  socket.on('connect', () => {
    console.log('[CLIENT] Socket connected:', socket.id);
  });

  socket.on('connect_error', (err: Error) => {
    console.error('[CLIENT] Socket connection error:', err.message);
  });

  socket.on('error', (err: unknown) => {
    console.error('[CLIENT] Socket error:', err);
  });
}

export function emitJoinGame(
  socket: Socket,
  gameData: JoinGamePayload
): Promise<JoinGameResponse> {
  console.log(
    '[CLIENT] JOIN_GAME event emitted, waiting for server response...'
  );

  return new Promise((resolve) => {
    socket.emit(JOIN_GAME, gameData, (response: unknown) => {
      const typedResponse = response as JoinGameResponse;
      console.log(
        '[CLIENT] Received JOIN_GAME response from server:',
        typedResponse
      );
      resolve(typedResponse);
    });
  });
}

export async function handleJoinGame(
  socket: Socket,
  payload: JoinGamePayload
): Promise<JoinGameResponse> {
  try {
    const response = await emitJoinGame(socket, payload);
    if (!response.success) {
      console.error('[CLIENT] JOIN_GAME failed:', response.error ?? 'Unknown');
    }
    return response;
  } catch (error) {
    console.error('[CLIENT] JOIN_GAME error:', error);
    throw error;
  }
}
