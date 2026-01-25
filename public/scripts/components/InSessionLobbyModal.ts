// public/scripts/components/InSessionLobbyModal.ts
import { LOBBY_STATE_UPDATE, PLAYER_READY } from '@shared/events.ts';
import { InSessionLobbyState } from '@shared/types.ts';
import { ROYALTY_AVATARS } from '@shared/avatars.ts';

import * as state from '../state.js';
import { showToast } from '../uiHelpers.js';
import * as uiManager from '../uiManager.js';

function isImageAvatar(value: string): boolean {
  return (
    /\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(value) ||
    value.startsWith('/assets/')
  );
}

function renderAvatarVisual(avatarValue: string): HTMLElement {
  if (isImageAvatar(avatarValue)) {
    const img = document.createElement('img');
    img.className = 'image-avatar';
    img.src = avatarValue;
    img.alt = 'avatar';
    img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  }

  const emojiDiv = document.createElement('div');
  emojiDiv.className = 'emoji-avatar';
  emojiDiv.textContent = avatarValue;
  return emojiDiv;
}

export class InSessionLobbyModal {
  private modalElement: HTMLElement;
  private playersContainer: HTMLElement;
  private copyLinkBtn: HTMLButtonElement;
  private readyUpButton: HTMLButtonElement;
  private guestNameInput: HTMLInputElement;
  private previousLobbyTab: 'host' | 'join' | null = null;
  private currentRoomId: string = '';
  private previousPlayers: Map<string, { name: string; isComputer?: boolean }> =
    new Map();
  private handleCopyLink = this.copyLink.bind(this);
  private handleReadyUp = this.readyUp.bind(this);

  constructor() {
    this.modalElement = document.getElementById('in-session-lobby-modal')!;
    if (!this.modalElement)
      throw new Error('InSessionLobbyModal element not found in the DOM.');

    this.playersContainer =
      this.modalElement.querySelector('#players-container')!;
    this.copyLinkBtn = this.modalElement.querySelector('#copy-link-button')!;
    this.readyUpButton = this.modalElement.querySelector('#ready-up-button')!;
    this.guestNameInput = this.modalElement.querySelector(
      '#guest-player-name-input'
    )!;

    this.initialize();
  }

  private showModal(): void {
    document.body.classList.add('showing-in-session');
    const lobbyForm = document.getElementById('lobby-form');
    const panels = Array.from(
      document.querySelectorAll<HTMLElement>('.lobby-tab-panel')
    );
    const activePanel = panels.find((panel) =>
      panel.classList.contains('is-active')
    );
    const activeTab = activePanel?.dataset.tabPanel;
    if (activeTab === 'host' || activeTab === 'join') {
      this.previousLobbyTab = activeTab;
    }
    panels.forEach((panel) => panel.classList.remove('is-active'));
    this.modalElement.classList.remove('hidden');
    this.modalElement.classList.remove('modal--hidden');
    this.modalElement.classList.add('is-active');
    if (lobbyForm) {
      lobbyForm.setAttribute('data-lobby-tab', 'waiting');
    }
  }

  private hideModal(): void {
    document.body.classList.remove('showing-in-session');
    const lobbyForm = document.getElementById('lobby-form');
    const panels = Array.from(
      document.querySelectorAll<HTMLElement>('.lobby-tab-panel')
    );
    panels.forEach((panel) => panel.classList.remove('is-active'));
    const restoreTab = this.previousLobbyTab || 'host';
    const restorePanel = panels.find(
      (panel) => panel.dataset.tabPanel === restoreTab
    );
    if (restorePanel) restorePanel.classList.add('is-active');
    if (lobbyForm) {
      lobbyForm.setAttribute('data-lobby-tab', restoreTab);
    }
    this.previousLobbyTab = null;
  }

  private async initialize(): Promise<void> {
    await state.socketReady;
    this.setupSocketListeners();
    this.addEventListeners();
  }

  private setupSocketListeners(): void {
    if (!state.socket) {
      console.error('[InSessionLobbyModal] Socket not available');
      uiManager.showError(
        'Unable to connect to game server. Please refresh the page.'
      );
      return;
    }

    state.socket.on(LOBBY_STATE_UPDATE, (lobbyState: InSessionLobbyState) => {
      console.log(
        '[InSessionLobbyModal] Received LOBBY_STATE_UPDATE:',
        lobbyState
      );
      this.render(lobbyState);
      const shouldShowModal = !lobbyState.started;

      if (lobbyState.started) {
        console.log(
          '[InSessionLobbyModal] Game started, calling showGameTable()'
        );
        uiManager.showGameTable();
        this.hideModal();
        // Rendering is now handled by the STATE_UPDATE event
      } else if (shouldShowModal) {
        console.log('[InSessionLobbyModal] Game not started, showing modal');
        this.showModal();
      } else {
        this.hideModal();
      }
    });

    state.socket.on('disconnect', () => {
      console.warn('[InSessionLobbyModal] Socket disconnected');
      uiManager.showError('Connection lost. Please refresh.');
      this.readyUpButton.disabled = true;
      this.guestNameInput.disabled = true;
    });
  }

  private addEventListeners(): void {
    this.copyLinkBtn.addEventListener('click', this.handleCopyLink);
    this.readyUpButton.addEventListener('click', this.handleReadyUp);
  }

  private copyLink(): void {
    const roomId = this.currentRoomId || state.currentRoom || '';
    if (!roomId) {
      showToast('Room code not available yet.', 'error');
      return;
    }
    // Copy only the room code (short form) to match join flow expectations
    const code = roomId.toUpperCase();
    navigator.clipboard
      .writeText(code)
      .then(() => showToast(`Room Code Copied: ${code}`, 'success'))
      .catch(() => showToast('Failed to copy code.', 'error'));
  }

  private readyUp(): void {
    const playerName = this.guestNameInput.value.trim();
    if (playerName) {
      if (state.socket?.connected === false) {
        showToast('Not connected to server. Please try again.', 'error');
        return;
      }
      if (this.readyUpButton.disabled) return; // Prevent double emit
      console.log('[CLIENT] Emitting PLAYER_READY with', playerName);
      state.socket?.emit(PLAYER_READY, playerName);
      this.readyUpButton.disabled = true;
      this.guestNameInput.disabled = true;
    } else {
      showToast('Please enter your name!', 'error');
    }
  }

  public render(lobbyState: InSessionLobbyState): void {
    this.currentRoomId = lobbyState.roomId;

    // Update the session modal heading to be all caps
    const title = this.modalElement.querySelector('#in-session-lobby-title');
    if (title) {
      title.textContent = 'WAITING FOR PLAYERS...';
    }

    const gameCodeInput = this.modalElement.querySelector(
      '#game-id-input'
    ) as HTMLInputElement | null;
    if (gameCodeInput) {
      gameCodeInput.value = lobbyState.roomId.toUpperCase();
    }

    if (this.previousPlayers.size > 0) {
      this.previousPlayers.forEach((player, playerId) => {
        if (!lobbyState.players.some((p) => p.id === playerId)) {
          if (!player.isComputer) {
            const name = player.name?.trim() || 'A player';
            showToast(`${name} left the room.`, 'info');
          }
        }
      });
    }

    this.previousPlayers = new Map(
      lobbyState.players.map((player) => [
        player.id,
        { name: player.name, isComputer: player.isComputer },
      ])
    );

    // Render expected slots in a grid so players see how many are expected.
    const expectedHumans =
      typeof lobbyState.expectedHumanCount === 'number'
        ? lobbyState.expectedHumanCount
        : lobbyState.players.filter((p) => !p.isComputer).length;
    const expectedCpus =
      typeof lobbyState.expectedCpuCount === 'number'
        ? lobbyState.expectedCpuCount
        : lobbyState.players.filter((p) => p.isComputer).length;
    const expectedTotal = Math.max(1, expectedHumans + expectedCpus);

    const humans = lobbyState.players.filter((p) => !p.isComputer);
    const cpus = lobbyState.players.filter((p) => p.isComputer);
    const orderedPlayers = [...humans, ...cpus];

    this.playersContainer.innerHTML = '';
    this.playersContainer.setAttribute('role', 'list');
    this.playersContainer.setAttribute('aria-label', 'Players in lobby');

    for (let i = 0; i < expectedTotal; i++) {
      const player = orderedPlayers[i] || null;
      const slot = document.createElement('div');
      slot.className = 'waiting-slot';
      slot.setAttribute('role', 'listitem');
      if (!player) slot.classList.add('is-placeholder');

      const frame = document.createElement('div');
      const isCpuSlot = i >= expectedHumans;

      // Mirror the lobby silhouettes as closely as possible:
      // - Humans: placeholders show "?" until a player has an avatar
      // - CPUs: use the new avatar pool for placeholders (no old robot.svg)
      let avatarValue: string | null = null;
      if (player?.avatar) {
        avatarValue = player.avatar;
      } else if (isCpuSlot && ROYALTY_AVATARS.length > 0) {
        avatarValue = ROYALTY_AVATARS[i % ROYALTY_AVATARS.length].icon;
      }

      if (avatarValue) {
        frame.className = `player-silhouette ${isCpuSlot ? 'cpu' : 'human'}`;
        frame.appendChild(renderAvatarVisual(avatarValue));
      } else {
        frame.className = `player-silhouette ${isCpuSlot ? 'cpu' : 'human'} placeholder`;
        frame.textContent = '?';
      }

      const nameEl = document.createElement('div');
      nameEl.className = 'waiting-slot-name';

      if (player) {
        let name = player.name;
        if (player.id === state.myId) name += ' (You)';
        nameEl.textContent = name;
      } else {
        // Keep placeholders minimal, matching the main lobby (no big "OPEN/BOT" labels)
        nameEl.textContent = '';
      }

      slot.appendChild(frame);
      slot.appendChild(nameEl);
      this.playersContainer.appendChild(slot);
    }

    const localPlayer = lobbyState.players.find((p) => p.id === state.myId);
    const hasKnownName =
      !!localPlayer?.name &&
      localPlayer.name.trim().length > 0 &&
      localPlayer.name.trim().toLowerCase() !== 'guest';

    if (
      localPlayer &&
      (localPlayer.status === 'host' ||
        localPlayer.status === 'ready' ||
        localPlayer.isSpectator)
    ) {
      this.guestNameInput.style.display = 'none';
      this.readyUpButton.style.display = 'none';
    } else {
      this.readyUpButton.style.display = '';
      this.readyUpButton.disabled = false;

      if (hasKnownName) {
        this.guestNameInput.value = localPlayer?.name || '';
        this.guestNameInput.style.display = 'none';
      } else {
        this.guestNameInput.style.display = '';
        this.guestNameInput.disabled = false;
        this.guestNameInput.value = '';
        this.guestNameInput.focus();
      }

      const label = this.readyUpButton.disabled
        ? 'STARTING...'
        : "LET'S PLAY";
      const upperLabel = label.toUpperCase();
      const textMain = this.readyUpButton.querySelector('.text-main');
      const textShadow = this.readyUpButton.querySelector('.text-shadow');
      if (textMain && textShadow) {
        textMain.textContent = upperLabel;
        textShadow.textContent = upperLabel;
      } else {
        this.readyUpButton.textContent = upperLabel;
      }
    }
  }

  public destroy(): void {
    if (state.socket) {
      state.socket.off(LOBBY_STATE_UPDATE);
      state.socket.off('disconnect');
    }
    this.copyLinkBtn.removeEventListener('click', this.handleCopyLink);
    this.readyUpButton.removeEventListener('click', this.handleReadyUp);
  }
}
