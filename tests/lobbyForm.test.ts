// tests/lobbyForm.test.ts
/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { fireEvent } from '@testing-library/dom';

const mockEmit = jest.fn();
const mockOn = jest.fn();

// Mock the state module
// To avoid "Invalid variable access: document" in mock factory,
// we ensure `document` is accessed only when the mocked functions are called.
jest.mock('../public/scripts/state.js', () => {
  // This factory function runs *before* jsdom is fully set up for the test body.
  // So, `document` might not be available here directly.
  // We return functions that, when *called during the test*, will access the now-available `document`.
  return {
    socket: { emit: jest.fn(), on: jest.fn() }, // These will be overridden in beforeEach
    loadSession: jest.fn(),
    $: jest.fn((selector: string) => global.document ? global.document.querySelector(selector) : null),
    getCopyLinkBtn: jest.fn(() => global.document ? global.document.createElement('button') : null),
    getRulesButton: jest.fn(() => global.document ? global.document.createElement('button') : null),
    getRulesModal: jest.fn(() => global.document ? global.document.createElement('div') : null),
    getBackToLobbyButton: jest.fn(() => global.document ? global.document.createElement('button') : null),
  };
});

// Mock the shared events module
jest.mock('../src/shared/events', () => ({ // Path to events.ts (without extension)
  __esModule: true, // Use if events.ts is an ES module
  JOIN_GAME: 'join-game',
  START_GAME: 'start-game',
  // Add other events if public/scripts/events.js (script under test) uses them from shared/events
}));

// Import the actual constant for use in test assertions
import { JOIN_GAME } from '../src/shared/events'; // Import from the actual (now .ts) module

// Import the client-side script under test (AFTER mocks are set up)
// This file (public/scripts/events.js) has NOT been converted to TS yet.
import '../public/scripts/events.js'; // This remains .js for now as it's the System Under Test

// Import the mocked state to re-assign socket.emit for test assertions
import * as state from '../public/scripts/state.js'; // This remains .js for now

describe('Lobby Form Submission', () => {
  let lobbyForm: HTMLFormElement;
  let nameInput: HTMLInputElement;
  let numHumansInput: HTMLInputElement;
  let numCPUsInput: HTMLInputElement;
  let submitButton: HTMLButtonElement;
  let nameInputError: HTMLElement;
  let playerCountError: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <form id="lobby-form">
        <input type="text" id="name-input" />
        <div id="name-input-error" class="error-message hidden"></div>
        <input type="number" id="total-players-input" value="1" data-testid="total-players-input" />
        <input type="number" id="cpu-players-input" value="0" data-testid="cpu-players-input" />
        <button id="join-game-button" type="submit">Play Game</button>
        <div id="player-count-error" class="error-message hidden"></div>
      </form>
    `;
    lobbyForm = document.getElementById('lobby-form') as HTMLFormElement;
    nameInput = document.getElementById('name-input') as HTMLInputElement;
    numHumansInput = document.getElementById('total-players-input') as HTMLInputElement;
    numCPUsInput = document.getElementById('cpu-players-input') as HTMLInputElement;
    submitButton = document.getElementById('join-game-button') as HTMLButtonElement;
    nameInputError = document.getElementById('name-input-error') as HTMLElement;
    playerCountError = document.getElementById('player-count-error') as HTMLElement;

    // Re-assign our top-level mockEmit to the one inside the mocked state.socket
    // This allows us to check if the SUT (public/scripts/events.js) called state.socket.emit
    if (state.socket) { // Ensure state.socket exists from the mock
        (state.socket.emit as jest.Mock) = mockEmit;
        (state.socket.on as jest.Mock) = mockOn;
    }
    mockEmit.mockClear();
    mockOn.mockClear();

    // Trigger the event listeners setup in public/scripts/events.js
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  it('shows error if name is empty', () => {
    nameInput.value = '';
    fireEvent.submit(lobbyForm);
    expect(nameInputError).not.toHaveClass('hidden');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('shows error if name is too short (assuming min length 2 in client script)', () => {
    nameInput.value = 'A';
    fireEvent.submit(lobbyForm);
    expect(nameInputError).not.toHaveClass('hidden');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('shows error if total players (humans in this form) < 1', () => {
    nameInput.value = 'Chris';
    numHumansInput.value = '0';
    fireEvent.submit(lobbyForm);
    expect(playerCountError).not.toHaveClass('hidden');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('shows error if total players (humans + CPUs) < 2', () => {
    nameInput.value = 'Chris';
    numHumansInput.value = '1';
    numCPUsInput.value = '0';
    fireEvent.submit(lobbyForm);
    expect(playerCountError).not.toHaveClass('hidden');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('shows error if total players (humans + CPUs) > 4', () => {
    nameInput.value = 'Chris';
    numHumansInput.value = '3';
    numCPUsInput.value = '2'; // Total 5
    fireEvent.submit(lobbyForm);
    expect(playerCountError).not.toHaveClass('hidden');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('emits JOIN_GAME with correct data and disables button on valid input', () => {
    nameInput.value = 'ChrisP';
    numHumansInput.value = '1';
    numCPUsInput.value = '1';

    fireEvent.submit(lobbyForm);

    expect(nameInputError).toHaveClass('hidden');
    expect(playerCountError).toHaveClass('hidden');
    expect(mockEmit).toHaveBeenCalledWith(JOIN_GAME, {
      name: 'ChrisP',
      numHumans: 1,
      numCPUs: 1
    });
    expect(submitButton.disabled).toBe(true);
  });
});