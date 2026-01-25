// tests/utils/domSetup.ts

/**
 * Sets up a minimal in-session lobby modal DOM structure for tests that require it.
 * Usage: Call setupModalDOM() in your test's beforeEach if your test or component expects the modal DOM.
 */
export function setupModalDOM() {
  document.body.innerHTML = `
    <div id="modal-overlay" class="modal__overlay modal__overlay--hidden"></div>
    <div class="lobby lobby--hidden" id="lobby-container">
      <div id="lobby-outer-card" class="lobby-modal-container">
        <div id="lobby-inner-content" class="game-setup-content">
          <form id="lobby-form">
            <div class="lobby-tab-panel lobby-tab-panel--host is-active" data-tab-panel="host"></div>
            <div class="lobby-tab-panel lobby-tab-panel--join" data-tab-panel="join"></div>
            <div class="lobby-tab-panel lobby-tab-panel--waiting" data-tab-panel="waiting" id="in-session-lobby-modal" tabindex="-1">
              <div class="host-selection-rectangle host-selection-rectangle--join">
                <div class="player-section waiting-code-section">
                  <h3 id="in-session-lobby-title" class="section-title">Waiting for Players...</h3>
                  <div class="name-input-section" id="guest-name-section">
                    <input id="guest-player-name-input" type="text" />
                  </div>
                  <div class="players-box">
                    <div id="players-container" class="players-container waiting-slots"></div>
                  </div>
                </div>

                <div class="lobby-actions lobby-actions--waiting">
                  <button id="waiting-back-button" class="lobby-tab-button lobby-nav-button waiting-back-btn" type="button" data-tab="join">BACK</button>

                  <button id="ready-up-button" class="lets-play-btn play-button-container" type="button" aria-label="Let's Play">
                    <div class="deep-shadow" aria-hidden="true"></div>
                    <div class="pulsing-glow" aria-hidden="true"></div>
                    <div class="outer-gold-ring" aria-hidden="true">
                      <div class="button-base">
                        <div class="gloss-sweep"></div>
                        <div class="top-highlight"></div>
                        <div class="text-container">
                          <span class="text-shadow">LET'S PLAY</span>
                          <span class="text-main">LET'S PLAY</span>
                        </div>
                        <div class="bottom-shadow"></div>
                      </div>
                    </div>
                  </button>

                  <button id="copy-link-button" class="lobby-nav-button secondary-btn waiting-copy-btn" type="button">
                    <span class="waiting-copy-label">COPY</span>
                    <span class="waiting-copy-code" id="waiting-room-code">------</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
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
