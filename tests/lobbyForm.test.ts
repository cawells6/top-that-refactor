// tests/lobbyForm.test.ts
/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { fireEvent } from '@testing-library/dom';

// Import the actual constants for use in test assertions
import { initializePageEventListeners } from '../public/scripts/events.js'; // Stays .js for now
import * as state from '../public/scripts/state.js'; // Stays .js for now
import { JOIN_GAME } from '../src/shared/events.js'; // Import from the actual (now .ts) module
// Import the client-side script under test (AFTER mocks are set up)
// This file (public/scripts/events.js) has NOT been converted to TS yet.

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
    saveSession: jest.fn(),
    $: jest.fn((selector: string) =>
      global.document ? global.document.querySelector(selector) : null
    ),
    getCopyLinkBtn: jest.fn(() =>
      global.document ? global.document.createElement('button') : null
    ),
    getRulesButton: jest.fn(() =>
      global.document ? global.document.createElement('button') : null
    ),
    getRulesModal: jest.fn(() => (global.document ? global.document.createElement('div') : null)),
    getBackToLobbyButton: jest.fn(() =>
      global.document ? global.document.createElement('button') : null
    ),
    setDesiredCpuCount: jest.fn(),
    getDesiredCpuCount: jest.fn(() => 0),
  };
});

// Mock the shared events module
jest.mock('../src/shared/events', () => ({
  // Path to events.ts (without extension)
  __esModule: true, // Use if events.ts is an ES module
  JOIN_GAME: 'join-game',
  START_GAME: 'start-game',
  // Add other events if public/scripts/events.js (script under test) uses them from shared/events
}));

describe('Lobby Form Submission', () => {
  let nameInput: HTMLInputElement;
  let numHumansInput: HTMLInputElement;
  let numCPUsInput: HTMLInputElement;
  let submitButton: HTMLButtonElement;
  let nameInputError: HTMLElement;
  let playerCountError: HTMLElement;

  beforeEach(async () => {
    jest.useFakeTimers();
    document.body.innerHTML = `
      <form id="lobby-form">
        <input type="text" id="player-name-input" />
        <div>
          <button id="humans-minus" type="button">-</button>
          <input type="number" id="total-players-input" value="1" />
          <button id="humans-plus" type="button">+</button>
        </div>
        <div>
          <button id="cpus-minus" type="button">-</button>
          <input type="number" id="cpu-players-input" value="0" />
          <button id="cpus-plus" type="button">+</button>
        </div>
        <span id="total-count"></span>
        <div id="lobby-validation-message"><div class="message-box-content"><p></p></div></div>
        <div class="lobby-buttons-row">
          <button id="setup-rules-button" type="button">RULES</button>
          <button id="setup-deal-button" type="button">LET'S PLAY</button>
        </div>
      </form>
    `;
    nameInput = document.getElementById('player-name-input') as HTMLInputElement;
    numHumansInput = document.getElementById('total-players-input') as HTMLInputElement;
    numCPUsInput = document.getElementById('cpu-players-input') as HTMLInputElement;
    submitButton = document.getElementById('setup-deal-button') as HTMLButtonElement;
    nameInputError = document.querySelector('#lobby-validation-message p') as HTMLElement;
    playerCountError = document.querySelector('#lobby-validation-message p') as HTMLElement;

    // Re-assign our top-level mockEmit to the one inside the mocked state.socket
    if (state.socket) {
      (state.socket.emit as jest.Mock) = mockEmit;
      (state.socket.on as jest.Mock) = mockOn;
    }
    mockEmit.mockClear();
    mockOn.mockClear();

    // Initialize event listeners after DOM is ready
    await initializePageEventListeners();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('shows error if name is empty', () => {
    nameInput.value = '';
    fireEvent.click(submitButton);
    const msgBox = document.querySelector('.message-box-content') as HTMLElement;
    expect(msgBox).toHaveClass('active');
    expect(nameInputError.textContent).toMatch(/valid name/i);
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('shows error if name is too short (min length 2)', () => {
    nameInput.value = 'A';
    fireEvent.click(submitButton);
    const msgBox = document.querySelector('.message-box-content') as HTMLElement;
    expect(msgBox).toHaveClass('active');
    expect(nameInputError.textContent).toMatch(/at least 2/);
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('shows error if total players (humans + CPUs) < 2', () => {
    nameInput.value = 'Chris';
    numHumansInput.value = '1';
    numCPUsInput.value = '0';
    fireEvent.click(submitButton);
    const msgBox = document.querySelector('.message-box-content') as HTMLElement;
    expect(msgBox).toHaveClass('active');
    expect(playerCountError.textContent).toMatch(/minimum of 2/i);
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('shows error if total players (humans + CPUs) > 4', () => {
    nameInput.value = 'Chris';
    numHumansInput.value = '3';
    numCPUsInput.value = '2'; // Total 5
    fireEvent.click(submitButton);
    const msgBox = document.querySelector('.message-box-content') as HTMLElement;
    expect(msgBox).toHaveClass('active');
    expect(playerCountError.textContent).toMatch(/maximum of 4/i);
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('emits JOIN_GAME with correct data and disables button on valid input', () => {
    nameInput.value = 'ChrisP';
    numHumansInput.value = '1';
    numCPUsInput.value = '1';

    fireEvent.click(submitButton);

    const msgBox = document.querySelector('.message-box-content') as HTMLElement;
    expect(msgBox.classList.contains('active')).toBe(false);
    expect(mockEmit).toHaveBeenCalledWith(JOIN_GAME, {
      name: 'ChrisP',
      numHumans: 1,
      numCPUs: 1,
    });
    expect(submitButton.disabled).toBe(true);
  });
});
