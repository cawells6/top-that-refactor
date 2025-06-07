/** @jest-environment jsdom */
import '@testing-library/jest-dom';
// Importing but not using fireEvent yet - will be used in future tests
// fireEvent is not used yet but may be needed in future tests

const realLog = console.log;
const realError = console.error;

beforeEach(() => {
  console.log = () => {};
  console.error = () => {};
  jest.useFakeTimers();
});

afterAll(() => {
  console.log = realLog;
  console.error = realError;
});

afterEach(async () => {
  jest.runOnlyPendingTimers();
  jest.clearAllTimers();
  await Promise.resolve();
  jest.useRealTimers();
});

jest.mock(
  './state.js',
  () => ({
    socket: { emit: jest.fn(), on: jest.fn() },
    loadSession: jest.fn(),
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
  }),
  { virtual: true }
);

jest.mock('./socketService.js', () => ({ initializeSocketHandlers: jest.fn() }), {
  virtual: true,
});

import { handleRulesClick, hideRulesModalAndOverlay } from './events.js';

describe('Rules modal interactions', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    document.body.innerHTML = `
      <button id="setup-rules-button">RULES</button>
      <button id="setup-deal-button"></button>
      <div id="lobby-container"></div>
      <div id="modal-overlay" class="modal__overlay--hidden"></div>
      <div id="rules-modal" class="modal--hidden">
        <button class="modal__close-button"></button>
        <button id="expand-collapse-all-btn">Expand All</button>
        <details class="rules-section"><summary>One</summary><div></div></details>
        <details class="rules-section"><summary>Two</summary><div></div></details>
      </div>`;
  });

  it('opens and closes the rules modal', async () => {
    const rulesModal = document.getElementById('rules-modal') as HTMLElement;
    const overlay = document.getElementById('modal-overlay') as HTMLElement;
    const lobby = document.getElementById('lobby-container') as HTMLElement;

    expect(rulesModal).toHaveClass('modal--hidden');
    handleRulesClick();

    expect(rulesModal).not.toHaveClass('modal--hidden');
    expect(overlay).not.toHaveClass('modal__overlay--hidden');
    expect(lobby.style.display).toBe('none');

    hideRulesModalAndOverlay();

    expect(rulesModal).toHaveClass('modal--hidden');
    expect(overlay).toHaveClass('modal__overlay--hidden');
    expect(lobby.style.display).toBe('');
  });
});
