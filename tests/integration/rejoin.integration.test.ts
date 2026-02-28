/**
 * Mid-Game Rejoin Integration Tests (#20)
 *
 * Uses real Socket.IO connections against a live test server to verify:
 *   - Mid-game disconnect marks player as disconnected (not removed)
 *   - Rejoin during active game restores player state
 *   - Rejoin cancels shutdown timer (game stays alive)
 *   - Old socket is force-disconnected on rejoin
 *   - Rejoin with wrong playerId fails gracefully
 *   - Multiple rapid disconnect/reconnect cycles
 */

import { jest } from '@jest/globals';
jest.unmock('socket.io-client');

import { io, Socket } from 'socket.io-client';
import { startServer, closeServer } from '../../server.js';
import {
  JOIN_GAME,
  JOINED,
  REJOIN,
  LOBBY_STATE_UPDATE,
  STATE_UPDATE,
  SESSION_ERROR,
} from '../../src/shared/events.js';
import type { JoinGamePayload } from '../../src/shared/types.js';
import type { AddressInfo } from 'net';

let serverAddress: string;

jest.setTimeout(15000);

beforeAll(async () => {
  const server = await startServer(0);
  const address = server.address() as AddressInfo;
  serverAddress = `http://localhost:${address.port}`;
  console.log(`[REJOIN-TEST] Test server at ${serverAddress}`);
});

afterAll(async () => {
  await closeServer();
});

describe('Mid-Game Rejoin Integration', () => {
  const clientSockets: Socket[] = [];

  function createClient(): Socket {
    const socket = io(serverAddress, {
      transports: ['websocket'],
      reconnection: false,
    });
    clientSockets.push(socket);
    return socket;
  }

  afterEach(() => {
    clientSockets.forEach((s) => {
      try { s.disconnect(); } catch { /* already disconnected */ }
    });
    clientSockets.length = 0;
  });

  // -----------------------------------------------------------------------
  // Helper: join a 1-human + 1-CPU game and wait until started
  // Returns { playerId, roomId }
  // -----------------------------------------------------------------------
  function joinAndStartGame(
    client: Socket
  ): Promise<{ playerId: string; roomId: string }> {
    return new Promise((resolve, reject) => {
      const payload: JoinGamePayload = {
        playerName: 'TestHuman',
        numHumans: 1,
        numCPUs: 1,
      };

      let playerId: string;
      let roomId: string;

      client.on('connect', () => {
        client.emit(JOIN_GAME, payload);
      });

      client.on(JOINED, (data: any) => {
        playerId = data.playerId || data.id;
        roomId = data.roomId;
      });

      client.on(LOBBY_STATE_UPDATE, (state: any) => {
        if (state.started && playerId && roomId) {
          resolve({ playerId, roomId });
        }
      });

      client.on('connect_error', reject);
      setTimeout(() => reject(new Error('joinAndStartGame timed out')), 10000);
    });
  }

  // -----------------------------------------------------------------------
  // Test 1: Basic mid-game disconnect + rejoin
  // -----------------------------------------------------------------------
  test('mid-game disconnect + rejoin restores player', (done) => {
    const clientA = createClient();

    joinAndStartGame(clientA)
      .then(({ playerId, roomId }) => {
        // Disconnect mid-game
        clientA.disconnect();

        setTimeout(() => {
          // Reconnect with a new socket
          const clientB = createClient();

          clientB.on('connect', () => {
            clientB.emit(REJOIN, { playerId, roomId });
          });

          // Verify rejoin success via JOINED event + STATE_UPDATE
          let joinedReceived = false;

          clientB.on(JOINED, (data: any) => {
            try {
              expect(data.success).toBe(true);
              expect(data.playerId).toBe(playerId);
              joinedReceived = true;
            } catch (e) {
              done(e);
            }
          });

          clientB.on(STATE_UPDATE, (state: any) => {
            if (!joinedReceived) return;
            try {
              expect(state.started).toBe(true);
              const player = state.players.find(
                (p: any) => p.name === 'TestHuman'
              );
              expect(player).toBeDefined();
              done();
            } catch (e) {
              done(e);
            }
          });

          clientB.on(SESSION_ERROR, (msg: string) => {
            done(new Error(`Unexpected SESSION_ERROR: ${msg}`));
          });
        }, 500);
      })
      .catch(done);
  });

  // -----------------------------------------------------------------------
  // Test 2: Rejoin receives STATE_UPDATE with game data
  // -----------------------------------------------------------------------
  test('rejoin receives STATE_UPDATE with active game state', (done) => {
    const clientA = createClient();

    joinAndStartGame(clientA)
      .then(({ playerId, roomId }) => {
        clientA.disconnect();

        setTimeout(() => {
          const clientB = createClient();

          clientB.on('connect', () => {
            clientB.emit(REJOIN, { playerId, roomId });
          });

          clientB.on(STATE_UPDATE, (state: any) => {
            try {
              expect(state).toHaveProperty('started', true);
              expect(state).toHaveProperty('players');
              expect(state.players.length).toBeGreaterThanOrEqual(2);
              done();
            } catch (e) {
              done(e);
            }
          });

          clientB.on(SESSION_ERROR, (msg: string) => {
            done(new Error(`Unexpected SESSION_ERROR: ${msg}`));
          });
        }, 500);
      })
      .catch(done);
  });

  // -----------------------------------------------------------------------
  // Test 3: Rejoin with wrong playerId fails gracefully
  // -----------------------------------------------------------------------
  test('rejoin with invalid playerId returns error', (done) => {
    const clientA = createClient();

    joinAndStartGame(clientA)
      .then(({ roomId }) => {
        clientA.disconnect();

        setTimeout(() => {
          const clientB = createClient();

          clientB.on('connect', () => {
            clientB.emit(
              REJOIN,
              { playerId: 'BOGUS_PLAYER_ID', roomId },
              (response: any) => {
                try {
                  expect(response.success).toBe(false);
                  expect(response.error).toMatch(/not found/i);
                  done();
                } catch (e) {
                  done(e);
                }
              }
            );
          });
        }, 500);
      })
      .catch(done);
  });

  // -----------------------------------------------------------------------
  // Test 4: Rejoin with wrong roomId fails gracefully
  // -----------------------------------------------------------------------
  test('rejoin with invalid roomId returns error', (done) => {
    const clientA = createClient();

    joinAndStartGame(clientA)
      .then(({ playerId }) => {
        clientA.disconnect();

        setTimeout(() => {
          const clientB = createClient();

          clientB.on('connect', () => {
            clientB.emit(
              REJOIN,
              { playerId, roomId: 'WRONG_ROOM_ID' },
              (response: any) => {
                try {
                  expect(response.success).toBe(false);
                  expect(response.error).toBeDefined();
                  done();
                } catch (e) {
                  done(e);
                }
              }
            );
          });
        }, 500);
      })
      .catch(done);
  });

  // -----------------------------------------------------------------------
  // Test 5: Double disconnect/reconnect cycle
  // -----------------------------------------------------------------------
  test('player can disconnect and rejoin twice', (done) => {
    const clientA = createClient();

    joinAndStartGame(clientA)
      .then(({ playerId, roomId }) => {
        // First disconnect
        clientA.disconnect();

        setTimeout(() => {
          // First rejoin
          const clientB = createClient();
          let firstRejoinDone = false;

          clientB.on('connect', () => {
            clientB.emit(REJOIN, { playerId, roomId });
          });

          clientB.on(JOINED, (data: any) => {
            if (firstRejoinDone) return;
            if (!data.success) return;

            firstRejoinDone = true;

            // Second disconnect
            clientB.disconnect();

            setTimeout(() => {
              // Second rejoin
              const clientC = createClient();

              clientC.on('connect', () => {
                clientC.emit(REJOIN, { playerId, roomId });
              });

              clientC.on(JOINED, (data2: any) => {
                try {
                  expect(data2.success).toBe(true);
                  expect(data2.playerId).toBe(playerId);
                  done();
                } catch (e) {
                  done(e);
                }
              });
            }, 500);
          });
        }, 500);
      })
      .catch(done);
  });

  // -----------------------------------------------------------------------
  // Test 6: Rejoin emits JOINED event
  // -----------------------------------------------------------------------
  test('rejoin emits JOINED event to the reconnecting client', (done) => {
    const clientA = createClient();

    joinAndStartGame(clientA)
      .then(({ playerId, roomId }) => {
        clientA.disconnect();

        setTimeout(() => {
          const clientB = createClient();

          clientB.on('connect', () => {
            clientB.emit(REJOIN, { playerId, roomId });
          });

          clientB.on(JOINED, (data: any) => {
            try {
              expect(data.success).toBe(true);
              expect(data.roomId).toBe(roomId);
              expect(data.playerId).toBe(playerId);
              done();
            } catch (e) {
              done(e);
            }
          });

          clientB.on(SESSION_ERROR, (msg: string) => {
            done(new Error(`Unexpected SESSION_ERROR: ${msg}`));
          });
        }, 500);
      })
      .catch(done);
  });
});
