/**
 * GameController — Edge Case Unit Tests
 *
 * Covers gaps identified in the Phase 4 audit:
 *   - destroy() cleans up listeners & socketIdToPlayerId
 *   - handleDisconnect: pre-game host reassignment
 *   - handleDisconnect: mid-game last-human shutdown timer
 *   - handleDisconnect: active-player turn advance
 *   - Turn transition lock blocks plays & pickups
 *   - Duplicate card indices rejected
 *   - Pickup pile rejected when valid play exists
 *   - Pickup pile when playing from downCards rejected ("must play down card")
 *   - Play card rejected when not player's turn
 *   - broadcastState sends per-player personalized state
 *   - clearAllTimeouts truly clears shutdown timer
 */

import {
  createMockSocket,
  createMockIO,
  MockSocket,
  MockIO,
} from './testUtils.js';
import GameController from '../controllers/GameController.js';
import {
  JOINED,
  STATE_UPDATE,
  NEXT_TURN,
  ERROR,
  SESSION_ERROR,
  PILE_PICKED_UP,
  LOBBY_STATE_UPDATE,
} from '../src/shared/events.ts';
import { JoinGamePayload, Card } from '../src/shared/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let topLevelEmitMock: jest.Mock;
let mockIo: MockIO;

function freshEnv() {
  topLevelEmitMock = jest.fn();
  mockIo = createMockIO(topLevelEmitMock);
  mockIo.sockets.sockets.clear();
}

function makeSocket(id: string): MockSocket {
  const s = createMockSocket(id, topLevelEmitMock);
  mockIo.sockets.sockets.set(s.id, s);
  return s;
}

function joinHost(
  gc: GameController,
  socket: MockSocket,
  opts: { numHumans?: number; numCPUs?: number } = {}
): void {
  const payload: JoinGamePayload = {
    playerName: 'Host',
    numHumans: opts.numHumans ?? 1,
    numCPUs: opts.numCPUs ?? 1,
    roomId: 'test-room',
  };
  (gc as any)['publicHandleJoin'](socket, payload);
}

function joinPlayer(
  gc: GameController,
  socket: MockSocket,
  name: string
): void {
  const payload: JoinGamePayload = {
    playerName: name,
    numHumans: 2,
    numCPUs: 0,
    roomId: 'test-room',
  };
  (gc as any)['publicHandleJoin'](socket, payload);
}

function startGame(
  gc: GameController,
  cpuCount: number,
  socket?: MockSocket
): void {
  (gc as any)['handleStartGame']({
    computerCount: cpuCount,
    socket: socket,
  });
}

function card(value: string, suit = 'hearts'): Card {
  return { value, suit };
}

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

describe('GameController Edge Cases', () => {
  let gc: GameController;
  let socketA: MockSocket;

  beforeEach(() => {
    freshEnv();
    socketA = makeSocket('socket-A');
    gc = new GameController(mockIo as any, 'test-room');
  });

  // =======================================================================
  // destroy()
  // =======================================================================
  describe('destroy()', () => {
    test('removes all listeners and clears socketIdToPlayerId', () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      startGame(gc, 1, socketA);

      expect((gc as any)['socketIdToPlayerId'].size).toBeGreaterThan(0);

      gc.destroy();

      expect((gc as any)['socketIdToPlayerId'].size).toBe(0);
      expect(socketA.removeAllListeners).toHaveBeenCalled();
    });

    test('emits SESSION_ERROR to connected players', () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      startGame(gc, 1, socketA);
      topLevelEmitMock.mockClear();

      gc.destroy();

      const sessionErrors = topLevelEmitMock.mock.calls.filter(
        (c) => c[0] === SESSION_ERROR
      );
      expect(sessionErrors.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =======================================================================
  // handleDisconnect — pre-game
  // =======================================================================
  describe('handleDisconnect (pre-game)', () => {
    test('host disconnect reassigns host to next player', () => {
      const socketB = makeSocket('socket-B');
      joinHost(gc, socketA, { numHumans: 2, numCPUs: 0 });
      joinPlayer(gc, socketB, 'Player2');

      const hostId = (gc as any)['hostId'];
      expect(hostId).toBeTruthy();

      // Simulate host disconnect
      socketA.simulateIncomingEvent('disconnect');

      const newHostId = (gc as any)['hostId'];
      expect(newHostId).not.toBe(hostId);
      const newHost = (gc as any)['players'].get(newHostId);
      expect(newHost).toBeDefined();
      expect(newHost.status).toBe('host');
    });

    test('disconnect removes player from gameState.players', () => {
      const socketB = makeSocket('socket-B');
      joinHost(gc, socketA, { numHumans: 2, numCPUs: 0 });
      joinPlayer(gc, socketB, 'Player2');

      const hostId = (gc as any)['hostId'];
      expect((gc as any)['gameState'].players).toContain(hostId);

      socketA.simulateIncomingEvent('disconnect');

      expect((gc as any)['gameState'].players).not.toContain(hostId);
    });
  });

  // =======================================================================
  // handleDisconnect — mid-game
  // =======================================================================
  describe('handleDisconnect (mid-game)', () => {
    test('last human disconnecting starts shutdown timer', () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      startGame(gc, 1, socketA);

      expect((gc as any)['gameState'].started).toBe(true);
      expect((gc as any)['shutdownTimer']).toBeNull();

      socketA.simulateIncomingEvent('disconnect');

      expect((gc as any)['shutdownTimer']).not.toBeNull();
    });

    test('marks player as disconnected (not removed) mid-game', () => {
      const socketB = makeSocket('socket-B');
      joinHost(gc, socketA, { numHumans: 2, numCPUs: 0 });
      joinPlayer(gc, socketB, 'Player2');
      startGame(gc, 0, socketA);

      const players = (gc as any)['players'] as Map<string, any>;
      const hostId = (gc as any)['hostId'];

      socketA.simulateIncomingEvent('disconnect');

      const host = players.get(hostId);
      expect(host).toBeDefined();
      expect(host.disconnected).toBe(true);
      // Player should still exist in players map
      expect(players.has(hostId)).toBe(true);
    });

    test('active player disconnect advances turn', () => {
      const socketB = makeSocket('socket-B');
      joinHost(gc, socketA, { numHumans: 2, numCPUs: 0 });
      joinPlayer(gc, socketB, 'Player2');
      startGame(gc, 0, socketA);

      const gs = (gc as any)['gameState'];
      const currentIdx = gs.currentPlayerIndex;
      const currentPlayerId = gs.players[currentIdx];

      // Identify the socket for the current player and disconnect them
      const currentPlayer = (gc as any)['players'].get(currentPlayerId);
      const currentSocket = currentPlayer.socketId === socketA.id ? socketA : socketB;

      const beforeIdx = gs.currentPlayerIndex;
      currentSocket.simulateIncomingEvent('disconnect');

      // The turn should have advanced (handleNextTurn called)
      // Either the index changed or a NEXT_TURN event was emitted
      const nextTurnEmitted = topLevelEmitMock.mock.calls.some(
        (c) => c[0] === NEXT_TURN
      );
      expect(nextTurnEmitted).toBe(true);
    });
  });

  // =======================================================================
  // Turn transition lock
  // =======================================================================
  describe('Turn transition locking', () => {
    test('PLAY_CARD blocked during isTurnTransitioning', () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      startGame(gc, 1, socketA);

      // Force isTurnTransitioning
      (gc as any)['isTurnTransitioning'] = true;
      topLevelEmitMock.mockClear();

      socketA.simulateIncomingEvent('play-card', { cardIndices: [0] });

      const errorEmitted = topLevelEmitMock.mock.calls.some(
        (c) => c[0] === ERROR && typeof c[1] === 'string' && c[1].includes('transitioning')
      );
      expect(errorEmitted).toBe(true);
    });
  });

  // =======================================================================
  // Duplicate card indices
  // =======================================================================
  describe('Duplicate card indices', () => {
    test('rejects play with duplicate indices', () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      startGame(gc, 1, socketA);

      // Make sure it's the human's turn
      const gs = (gc as any)['gameState'];
      const hostId = (gc as any)['hostId'];
      const hostIdx = gs.players.indexOf(hostId);
      gs.currentPlayerIndex = hostIdx;

      topLevelEmitMock.mockClear();

      socketA.simulateIncomingEvent('play-card', { cardIndices: [0, 0] });

      const errorEmitted = topLevelEmitMock.mock.calls.some(
        (c) =>
          c[0] === ERROR &&
          typeof c[1] === 'string' &&
          c[1].toLowerCase().includes('duplicate')
      );
      expect(errorEmitted).toBe(true);
    });
  });

  // =======================================================================
  // Play card — not your turn
  // =======================================================================
  describe('Play card — not your turn', () => {
    test('rejects play from wrong player', () => {
      const socketB = makeSocket('socket-B');
      joinHost(gc, socketA, { numHumans: 2, numCPUs: 0 });
      joinPlayer(gc, socketB, 'Player2');
      startGame(gc, 0, socketA);

      const gs = (gc as any)['gameState'];
      // Ensure it is NOT Player2's turn
      const player2Id = Array.from((gc as any)['players'].keys() as IterableIterator<string>).find(
        (id: string) => id !== (gc as any)['hostId']
      )!;
      const player2Idx = gs.players.indexOf(player2Id);
      // Set currentPlayer to someone else
      gs.currentPlayerIndex = player2Idx === 0 ? 1 : 0;

      topLevelEmitMock.mockClear();

      socketB.simulateIncomingEvent('play-card', { cardIndices: [0] });

      const errorEmitted = topLevelEmitMock.mock.calls.some(
        (c) => c[0] === ERROR && typeof c[1] === 'string' && c[1].includes('turn')
      );
      expect(errorEmitted).toBe(true);
    });
  });

  // =======================================================================
  // Pick up pile — must play down card
  // =======================================================================
  describe('Pick up pile — down card zone', () => {
    test('rejects pickup when player must play a down card', () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      startGame(gc, 1, socketA);

      const gs = (gc as any)['gameState'];
      const hostId = (gc as any)['hostId'];
      const hostIdx = gs.players.indexOf(hostId);
      gs.currentPlayerIndex = hostIdx;

      const player = (gc as any)['players'].get(hostId);
      // Clear hand and upCards to force downCards zone
      player.hand = [];
      player.upCards = [];
      // Ensure downCards exist
      if (player.downCards.length === 0) {
        player.downCards = [card('7', 'clubs')];
      }

      topLevelEmitMock.mockClear();

      socketA.simulateIncomingEvent('pick-up-pile');

      const errorEmitted = topLevelEmitMock.mock.calls.some(
        (c) => c[0] === ERROR && typeof c[1] === 'string' && c[1].includes('down card')
      );
      expect(errorEmitted).toBe(true);
    });
  });

  // =======================================================================
  // Pick up pile — has valid play
  // =======================================================================
  describe('Pick up pile — has valid play', () => {
    test('rejects pickup when a valid hand play exists', () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      startGame(gc, 1, socketA);

      const gs = (gc as any)['gameState'];
      const hostId = (gc as any)['hostId'];
      const hostIdx = gs.players.indexOf(hostId);
      gs.currentPlayerIndex = hostIdx;

      const player = (gc as any)['players'].get(hostId);
      // Give the player an Ace (always valid — higher than anything except special)
      player.hand = [card('A', 'spades')];
      // Ensure pile has something low
      gs.pile = [card('3', 'hearts')];
      gs.lastRealCard = card('3', 'hearts');

      topLevelEmitMock.mockClear();

      socketA.simulateIncomingEvent('pick-up-pile');

      const errorEmitted = topLevelEmitMock.mock.calls.some(
        (c) => c[0] === ERROR && typeof c[1] === 'string' && c[1].includes('playable')
      );
      expect(errorEmitted).toBe(true);
    });
  });

  // =======================================================================
  // broadcastState — per-player personalization
  // =======================================================================
  describe('broadcastState — per-player privacy', () => {
    test('sends different STATE_UPDATE to each human player', () => {
      const socketB = makeSocket('socket-B');
      joinHost(gc, socketA, { numHumans: 2, numCPUs: 0 });
      joinPlayer(gc, socketB, 'Player2');
      startGame(gc, 0, socketA);

      topLevelEmitMock.mockClear();

      // Force a push
      (gc as any)['pushState']();

      const stateUpdates = topLevelEmitMock.mock.calls.filter(
        (c) => c[0] === STATE_UPDATE
      );

      // There should be 2 personalized state updates (one per human)
      expect(stateUpdates.length).toBe(2);
    });
  });

  // =======================================================================
  // isStarting blocks handlePlayCard
  // =======================================================================
  describe('isStarting blocks actions', () => {
    test('PLAY_CARD blocked while isStarting is true', () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      startGame(gc, 1, socketA);

      (gc as any)['gameState'].isStarting = true;
      topLevelEmitMock.mockClear();

      socketA.simulateIncomingEvent('play-card', { cardIndices: [0] });

      const errorEmitted = topLevelEmitMock.mock.calls.some(
        (c) => c[0] === ERROR && typeof c[1] === 'string' && c[1].includes('starting')
      );
      expect(errorEmitted).toBe(true);
    });
  });

  // =======================================================================
  // Invalid up-card play with better move available
  // =======================================================================
  describe('Invalid up-card play — better move available', () => {
    test('rejects invalid up-card if a valid up-card exists', () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      startGame(gc, 1, socketA);

      const gs = (gc as any)['gameState'];
      const hostId = (gc as any)['hostId'];
      const hostIdx = gs.players.indexOf(hostId);
      gs.currentPlayerIndex = hostIdx;

      const player = (gc as any)['players'].get(hostId);
      // Clear hand so we fall to upCards zone
      player.hand = [];
      // Give 2 up cards: one invalid (3 below pile top of K) and one valid (A)
      player.upCards = [card('3', 'clubs'), card('A', 'spades')];
      // Set pile so 3 is invalid but A is valid
      gs.pile = [card('K', 'hearts')];
      gs.lastRealCard = card('K', 'hearts');

      topLevelEmitMock.mockClear();

      // Try to play the invalid card (index 0 = the 3)
      (gc as any)['handlePlayCardInternal'](
        player,
        [0],
        'upCards',
        [card('3', 'clubs')]
      );

      const errorEmitted = topLevelEmitMock.mock.calls.some(
        (c) => c[0] === ERROR && typeof c[1] === 'string' && c[1].includes('valid play')
      );
      expect(errorEmitted).toBe(true);
    });
  });

  // =======================================================================
  // Invalid up-card play with NO better move — forced pickup
  // =======================================================================
  describe('Invalid up-card play — no better move — forced pickup', () => {
    test('forces pickup when no valid up-card exists', () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      startGame(gc, 1, socketA);

      const gs = (gc as any)['gameState'];
      const hostId = (gc as any)['hostId'];
      const hostIdx = gs.players.indexOf(hostId);
      gs.currentPlayerIndex = hostIdx;

      const player = (gc as any)['players'].get(hostId);
      player.hand = [];
      // Only one up card that's invalid
      player.upCards = [card('3', 'clubs')];
      gs.pile = [card('K', 'hearts')];
      gs.lastRealCard = card('K', 'hearts');

      topLevelEmitMock.mockClear();

      (gc as any)['handlePlayCardInternal'](
        player,
        [0],
        'upCards',
        [card('3', 'clubs')]
      );

      // Should emit PILE_PICKED_UP (forced pickup)
      const pickupEmitted = topLevelEmitMock.mock.calls.some(
        (c) => c[0] === PILE_PICKED_UP
      );
      expect(pickupEmitted).toBe(true);

      // Player should now have cards in hand (picked up pile + failed card)
      expect(player.hand.length).toBeGreaterThan(0);
    });
  });

  // =======================================================================
  // handlePickUpPileInternal — draws new card from deck
  // =======================================================================
  describe('handlePickUpPileInternal', () => {
    test('draws a new card from deck to start new pile after pickup', () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      startGame(gc, 1, socketA);

      const gs = (gc as any)['gameState'];
      const hostId = (gc as any)['hostId'];
      const hostIdx = gs.players.indexOf(hostId);
      gs.currentPlayerIndex = hostIdx;

      const player = (gc as any)['players'].get(hostId);
      // Set up a pile and ensure deck has cards
      gs.pile = [card('K', 'hearts'), card('Q', 'hearts')];
      gs.lastRealCard = card('K', 'hearts');
      const deckSizeBefore = gs.deck?.length ?? 0;

      topLevelEmitMock.mockClear();

      (gc as any)['handlePickUpPileInternal'](player);

      // Player picked up the pile
      expect(player.hand.length).toBeGreaterThanOrEqual(2);

      // If deck had cards, a new card should be on the pile
      if (deckSizeBefore > 0) {
        expect(gs.pile.length).toBe(1);
        expect(gs.deck.length).toBe(deckSizeBefore - 1);
      }
    });
  });

  // =======================================================================
  // validateRequest — player not found
  // =======================================================================
  describe('validateRequest', () => {
    test('returns null and emits ERROR for unknown player', () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      startGame(gc, 1, socketA);

      // Unmap the socket so playerId lookup fails
      (gc as any)['socketIdToPlayerId'].delete(socketA.id);

      topLevelEmitMock.mockClear();

      socketA.simulateIncomingEvent('play-card', { cardIndices: [0] });

      const errorEmitted = topLevelEmitMock.mock.calls.some(
        (c) => c[0] === ERROR && typeof c[1] === 'string' && c[1].includes('not recognized')
      );
      expect(errorEmitted).toBe(true);
    });
  });

  // =======================================================================
  // clearAllTimeouts resets shutdown timer
  // =======================================================================
  describe('clearAllTimeouts', () => {
    test('cancels shutdown timer', () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      startGame(gc, 1, socketA);

      // Simulate last human disconnect to start shutdown timer
      socketA.simulateIncomingEvent('disconnect');
      expect((gc as any)['shutdownTimer']).not.toBeNull();

      // Call clearAllTimeouts
      (gc as any)['clearAllTimeouts']();

      expect((gc as any)['shutdownTimer']).toBeNull();
      expect((gc as any)['isTurnTransitioning']).toBe(false);
    });
  });

  // =======================================================================
  // Game start — already starting
  // =======================================================================
  describe('handleStartGame guards', () => {
    test('rejects start if game is already starting', async () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      (gc as any)['gameState'].isStarting = true;

      topLevelEmitMock.mockClear();

      await (gc as any)['handleStartGame']({
        computerCount: 1,
        socket: socketA,
      });

      const errorEmitted = topLevelEmitMock.mock.calls.some(
        (c) => c[0] === ERROR && typeof c[1] === 'string' && c[1].includes('already starting')
      );
      expect(errorEmitted).toBe(true);
    });

    test('rejects start if game already started', async () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      startGame(gc, 1, socketA);

      topLevelEmitMock.mockClear();

      await (gc as any)['handleStartGame']({
        computerCount: 1,
        socket: socketA,
      });

      const errorEmitted = topLevelEmitMock.mock.calls.some(
        (c) => c[0] === ERROR && typeof c[1] === 'string' && c[1].includes('already started')
      );
      expect(errorEmitted).toBe(true);
    });

    test('rejects start with too many players', async () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      // Ensure game is NOT already started so we reach the player-count check
      (gc as any)['gameState'].started = false;
      (gc as any)['gameState'].isStarting = false;

      topLevelEmitMock.mockClear();

      await (gc as any)['handleStartGame']({
        computerCount: 10,
        socket: socketA,
      });

      const errorEmitted = topLevelEmitMock.mock.calls.some(
        (c) => c[0] === ERROR && typeof c[1] === 'string' && c[1].includes('exceed')
      );
      expect(errorEmitted).toBe(true);
    });
  });

  // =======================================================================
  // Rejoin — wrong room
  // =======================================================================
  describe('Rejoin edge cases', () => {
    test('rejects rejoin for wrong roomId', () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      startGame(gc, 1, socketA);

      const socketB = makeSocket('socket-B');
      let ackResult: any;
      (gc as any)['publicHandleRejoin'](
        socketB,
        'WRONG-ROOM',
        'some-player-id',
        (result: any) => { ackResult = result; }
      );

      expect(ackResult?.success).toBe(false);
      expect(ackResult?.error).toMatch(/invalid room/i);
    });

    test('rejects rejoin during isStarting', () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      (gc as any)['gameState'].isStarting = true;

      const socketB = makeSocket('socket-B');
      let ackResult: any;
      (gc as any)['publicHandleRejoin'](
        socketB,
        'test-room',
        'some-player-id',
        (result: any) => { ackResult = result; }
      );

      expect(ackResult?.success).toBe(false);
      expect(ackResult?.error).toMatch(/starting/i);
    });

    test('rejects rejoin for unknown player', () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      startGame(gc, 1, socketA);

      const socketB = makeSocket('socket-B');
      let ackResult: any;
      (gc as any)['publicHandleRejoin'](
        socketB,
        'test-room',
        'NON_EXISTENT_PLAYER',
        (result: any) => { ackResult = result; }
      );

      expect(ackResult?.success).toBe(false);
      expect(ackResult?.error).toMatch(/not found/i);
    });

    test('successful rejoin cancels shutdown timer and restores player', () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      startGame(gc, 1, socketA);

      const hostId = (gc as any)['hostId'];

      // Disconnect host to trigger shutdown timer
      socketA.simulateIncomingEvent('disconnect');
      expect((gc as any)['shutdownTimer']).not.toBeNull();

      // Rejoin with a new socket
      const socketB = makeSocket('socket-B');
      let ackResult: any;
      (gc as any)['publicHandleRejoin'](
        socketB,
        'test-room',
        hostId,
        (result: any) => { ackResult = result; }
      );

      expect(ackResult?.success).toBe(true);
      expect((gc as any)['shutdownTimer']).toBeNull();

      const player = (gc as any)['players'].get(hostId);
      expect(player.disconnected).toBe(false);
      expect(player.socketId).toBe(socketB.id);
    });
  });

  // =======================================================================
  // hasConnectedClients
  // =======================================================================
  describe('hasConnectedClients', () => {
    test('returns true when a human is connected', () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      expect(gc.hasConnectedClients()).toBe(true);
    });

    test('returns false after all humans disconnect in-game', () => {
      joinHost(gc, socketA, { numHumans: 1, numCPUs: 1 });
      startGame(gc, 1, socketA);

      socketA.simulateIncomingEvent('disconnect');

      expect(gc.hasConnectedClients()).toBe(false);
    });
  });
});
