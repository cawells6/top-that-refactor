// public/scripts/components/InSessionLobbyModal.ts
import { LOBBY_STATE_UPDATE, START_GAME } from '@shared/events.ts';
import { InSessionLobbyState } from '@shared/types.ts';

import { Modal } from './Modal.js';
import * as state from '../state.js';
import * as uiManager from '../uiManager.js';

export class InSessionLobbyModal extends Modal {
  constructor() {
    const content = InSessionLobbyModal.createContent();
    super(content, { className: 'in-session-lobby-modal' });
    this.setupSocketListeners();
    this.addEventListeners();
  }

  private static createContent(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'in-session-lobby-container';
    // Mobile detection and Web Share API check
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent
    );
    const shareBtnHtml =
      typeof navigator.share === 'function' && isMobile
        ? '<button id="share-link-btn" class="btn copy-link-btn">Share</button>'
        : '';
    container.innerHTML = `
    <div class="players-section">
      <h3 class="players-section-title">Players</h3>
      <div id="players-container" class="players-container"></div>
    </div>
    <div class="lobby-actions-row">
      <input id="lobby-room-code" class="game-id-input" type="text" readonly maxlength="6" style="width:90px;max-width:100px;text-align:center;letter-spacing:0.15em;font-size:1.1em;" />
      <button id="copy-link-btn" class="btn copy-link-btn">Copy Link</button>
      ${shareBtnHtml}
      <button id="start-game-btn" class="btn lets-play-btn" disabled>Let's Play</button>
    </div>
  `;
    return container;
  }

  private setupSocketListeners(): void {
    if (!state.socket) return;
    state.socket.on(LOBBY_STATE_UPDATE, (lobbyState: InSessionLobbyState) => {
      console.log('[CLIENT] Received LOBBY_STATE_UPDATE:', lobbyState);
      this.render(lobbyState);
    });
  }

  private addEventListeners(): void {
    setTimeout(() => {
      const copyLinkBtn = document.getElementById('copy-link-btn');
      const shareBtn = document.getElementById('share-link-btn');
      const startGameBtn = document.getElementById('start-game-btn');
      const gameIdInput = document.getElementById('lobby-room-code') as HTMLInputElement | null;

      copyLinkBtn?.addEventListener('click', () => {
        if (gameIdInput?.value) {
          // Use the current window location for the Vite dev server link
          const link = `${window.location.origin}?room=${gameIdInput.value}`;
          navigator.clipboard.writeText(link);
          if (copyLinkBtn instanceof HTMLButtonElement) {
            const original = copyLinkBtn.textContent;
            copyLinkBtn.textContent = 'Copied!';
            setTimeout(() => {
              copyLinkBtn.textContent = original;
            }, 2000);
          }
        }
      });

      shareBtn?.addEventListener('click', async () => {
        if (gameIdInput?.value && typeof navigator.share === 'function') {
          const link = `${window.location.origin}?room=${gameIdInput.value}`;
          try {
            await navigator.share({
              title: 'Join my Top That! game',
              text: 'Join my game of Top That! Use this link:',
              url: link,
            });
          } catch {
            alert('Share failed or was cancelled.');
          }
        }
      });

      startGameBtn?.addEventListener('click', () => {
        if (state.socket) state.socket.emit(START_GAME);
      });
    }, 0);
  }

  private render(lobbyState: InSessionLobbyState): void {
    // Ensure modal is in the DOM before querying its elements
    this.show();
    uiManager.showGameTable();

    // No host label/crown at the top
    // Render players (no host label in player list)
    const playersContainer = document.getElementById('players-container');
    if (playersContainer) {
      playersContainer.innerHTML = '';
      lobbyState.players.forEach((player) => {
        const playerEl = document.createElement('div');
        const statusClass = player.status.toLowerCase();
        playerEl.className = `player-item ${statusClass}`;
        playerEl.innerHTML = `
        <span class="player-name">${player.name}${player.id === state.socket?.id ? ' (You)' : ''}</span>
        <span class="player-status">${player.status}</span>
      `;
        playersContainer.appendChild(playerEl);
      });
    }
    // Set room code and update URL
    const gameIdInput = document.getElementById('lobby-room-code') as HTMLInputElement | null;
    if (gameIdInput) {
      gameIdInput.value = lobbyState.roomId;
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      if (urlRoom !== lobbyState.roomId) {
        window.history.replaceState({}, '', `?room=${lobbyState.roomId}`);
      }
    }
    // Enable start button only for host
    const startGameBtn = document.getElementById('start-game-btn') as HTMLButtonElement | null;
    if (startGameBtn) {
      startGameBtn.disabled = state.myId !== lobbyState.hostId;
    }
  }
}
