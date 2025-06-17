// tests/utils/domSetup.ts

/**
 * Sets up a minimal in-session lobby modal DOM structure for tests that require it.
 * Usage: Call setupModalDOM() in your test's beforeEach if your test or component expects the modal DOM.
 */
export function setupModalDOM() {
  document.body.innerHTML = `
    <div id="modal-overlay" class="modal__overlay modal__overlay--hidden"></div>
    <div class="modal modal--hidden in-session-lobby-modal" id="in-session-lobby-modal" tabindex="-1">
      <div class="in-session-lobby-container">
        <h3 id="in-session-lobby-title" class="section-title">Waiting for Players...</h3>
        <div class="name-input-section" id="guest-name-section">
          <input id="guest-player-name-input" type="text" />
        </div>
        <div id="players-container" class="players-container"></div>
        <div class="lobby-buttons-row">
          <button id="copy-link-button" class="header-btn" type="button">Copy Link</button>
          <button id="ready-up-button" class="header-btn" type="button">Let's Play</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Mocks the InSessionLobbyModal component for tests that intentionally omit DOM setup.
 * Usage: Call mockInSessionLobbyModal() before importing modules that require the modal, if you want to avoid DOM errors.
 */
export function mockInSessionLobbyModal() {
  jest.doMock(
    '../public/scripts/components/InSessionLobbyModal.js',
    () => ({ InSessionLobbyModal: jest.fn() }),
    { virtual: true }
  );
}
