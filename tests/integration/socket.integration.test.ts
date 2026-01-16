import { jest } from '@jest/globals';
jest.unmock('socket.io-client');

import { io, Socket } from 'socket.io-client';
import { startServer, closeServer } from '../../server.js';
import { JOINED, LOBBY_STATE_UPDATE, JOIN_GAME, REJOIN } from '../../src/shared/events.js';
import type { JoinGamePayload } from '../../src/shared/types.js';
import { AddressInfo } from 'net';

let serverAddress: string;

// Increase timeout for server startup
jest.setTimeout(10000);

beforeAll(async () => {
  // Port 0 lets the OS assign a random free port
  const server = await startServer(0);
  const address = server.address();
  if (address && typeof address !== 'string') {
    serverAddress = `http://localhost:${address.port}`;
    console.log(`[TEST] Test server running at ${serverAddress}`);
  } else {
    throw new Error('Server address not found');
  }
});

afterAll(async () => {
  await closeServer();
});

describe('Socket.IO Integration Tests', () => {
  const clientSockets: Socket[] = [];

  function createClient(): Socket {
    const socket = io(serverAddress, {
      transports: ['websocket'], // Force websocket
      reconnection: false,
    });
    clientSockets.push(socket);
    return socket;
  }

  afterEach(() => {
    clientSockets.forEach((s) => s.disconnect());
    clientSockets.length = 0;
  });

  test('Test 1: Happy Path (Connection & Create Game)', (done) => {
    const client = createClient();
    const payload: JoinGamePayload = {
      playerName: 'HappyTester',
      numHumans: 2,
      numCPUs: 0,
    };

    let joinedReceived = false;

    client.on('connect', () => {
      client.emit(JOIN_GAME, payload);
    });

    client.on(JOINED, (data) => {
      try {
        // The JOINED event sends 'id' for the player ID
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('name', 'HappyTester');
        expect(data.roomId).toBeDefined();
        joinedReceived = true;
      } catch (e) {
        done(e);
      }
    });

    client.on(LOBBY_STATE_UPDATE, (state) => {
      try {
        if (!joinedReceived) return; // Wait for JOINED
        expect(state.players).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ name: 'HappyTester' }),
          ])
        );
        done();
      } catch (e) {
        done(e);
      }
    });

    // Catch errors
    client.on('error', (err) => done(err));
  });

  test('Test 2: Rejoin Flow (Network Persistence)', (done) => {
    const clientA = createClient();
    // We need to start the game so the player is persisted upon disconnect.
    // In Lobby, players are removed on disconnect.
    const payload: JoinGamePayload = {
      playerName: 'ClientA',
      numHumans: 1,
      numCPUs: 1,
    };

    let playerId: string;
    let roomId: string;
    let hasDisconnected = false;

    clientA.on('connect', () => {
      clientA.emit(JOIN_GAME, payload);
    });

    clientA.on(JOINED, (data) => {
      playerId = data.id;
      roomId = data.roomId;
    });

    // Wait for game start before disconnecting
    clientA.on(LOBBY_STATE_UPDATE, (state) => {
       if (state.started && !hasDisconnected) {
          hasDisconnected = true;
          clientA.disconnect();

          setTimeout(() => {
            // Connect Client A again
            const clientAReconnected = createClient();

            clientAReconnected.on('connect', () => {
               // Send as object { playerId, roomId } to match server expectation
               clientAReconnected.emit(REJOIN, { playerId, roomId });
            });

            clientAReconnected.on(LOBBY_STATE_UPDATE, (rejoinState) => {
              try {
                 const player = rejoinState.players.find((p: any) => p.id === playerId);
                 expect(player).toBeDefined();
                 expect(player?.name).toBe('ClientA');
                 expect(player?.disconnected).toBe(false);
                 done();
              } catch (e) {
                done(e);
              }
            });

            clientAReconnected.on('error', (err) => done(err));

          }, 200);
       }
    });
  });

  test('Test 3: Basic Error Serialization', (done) => {
    const client = createClient();
    const payload: JoinGamePayload = {
        playerName: 'ErrorTester',
        numHumans: 2,
        numCPUs: 0,
        roomId: 'NON_EXISTENT_ROOM_ID_9999'
    };

    client.on('connect', () => {
      client.emit(JOIN_GAME, payload, (response: any) => {
        try {
          expect(response).toHaveProperty('error');
          expect(response.error).toMatch(/Room not found/i);
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });
});
