// public/scripts/components/MainLobbyModal.ts
import { Modal } from './Modal.js';
import * as uiManager from '../uiManager.js';

export class MainLobbyModal extends Modal {
  private playersContainer: HTMLElement;
  private copyLinkBtn: HTMLButtonElement;
  private guestNameInput: HTMLInputElement;

  constructor() {
    const modalElement = document.getElementById('main-lobby-modal');
    if (!modalElement) {
      throw new Error(
        'MainLobbyModal element not found in the DOM. Ensure it is present in index.html.'
      );
    }
    super(modalElement);

    // Initialize DOM element references
    this.playersContainer =
      this.modalElement.querySelector('#players-container')!;
    this.copyLinkBtn = this.modalElement.querySelector('#copy-link-button')!;
    this.guestNameInput = this.modalElement.querySelector(
      '#guest-player-name-input'
    )!;

    // Set consistent width that will match the in-session lobby
    this.setModalWidth(500);

    // Apply professional styling to the modal
    this.applyProfessionalStyling();

    // Add this to the constructor or an appropriate initialization method:
    const letsPlayHeading = this.modalElement.querySelector(
      'h2, h3, .modal-title, .section-title'
    );
    if (letsPlayHeading) {
      // Apply the same exact styling as in the in-session lobby
      letsPlayHeading.setAttribute(
        'style',
        'letter-spacing: -1px; ' +
          'font-family: inherit; ' +
          'font-size: 18px; ' +
          'font-weight: 500; ' +
          'color: #333333; ' +
          'margin-bottom: 16px; ' +
          'text-align: center;'
      );
    }
  }

  // Override Modal.show to hide the main lobby and reveal the game table
  override show(): void {
    // Display the game board and hide lobby elements
    uiManager.showGameTable();
    super.show();
  }

  private applyProfessionalStyling(): void {
    // Fix the "Awaiting Players" heading styling to match other text
    const heading = this.modalElement.querySelector('h2, h3, .modal-title');
    if (heading) {
      heading.textContent = 'AWAITING PLAYERS';

      // Remove any existing classes that might add shading or gradients
      heading.className = '';

      // Apply clean, consistent styling to match player names
      heading.setAttribute(
        'style',
        'letter-spacing: -1px; ' +
          'font-family: inherit; ' +
          'font-weight: normal; ' +
          'font-size: 16px; ' +
          'color: #333; ' +
          'margin-bottom: 16px; ' +
          'text-shadow: none; ' +
          'background: none;'
      );
    }

    // Add shadow and adjust padding
    const modalContent = this.modalElement.querySelector(
      '.modal-content, .card'
    );
    if (modalContent) {
      modalContent.className += ' shadow-lg';
      modalContent.setAttribute(
        'style',
        'padding: 1.5rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);'
      );
    }

    // Reduce player names container size by half
    if (this.playersContainer) {
      this.playersContainer.setAttribute(
        'style',
        'max-height: 120px; overflow-y: auto; margin: 0 auto; width: 50%; max-width: 200px;'
      );
    }

    // Adjust spacing above buttons and increase margin for copy link button
    const buttonRow = this.modalElement.querySelector(
      '.lobby-buttons-row, .button-container'
    );
    if (buttonRow) {
      buttonRow.className += ' mt-4';
      buttonRow.setAttribute('style', 'margin-top: 24px;');
    }

    // Add more space around the copy link button
    if (this.copyLinkBtn) {
      this.copyLinkBtn.setAttribute(
        'style',
        'margin-top: 16px; font-weight: 600;'
      );
    }

    // Apply consistent font weights to other buttons
    const buttons = this.modalElement.querySelectorAll(
      'button:not(#copy-link-button)'
    );
    buttons.forEach((button) => {
      button.setAttribute('style', 'font-weight: 600;');
    });

    // Center align the input container and make input field half-width
    const inputContainer = this.guestNameInput?.parentElement;
    if (inputContainer) {
      inputContainer.className += ' flex justify-center items-center';
      inputContainer.setAttribute(
        'style',
        'display: flex; justify-content: center; align-items: center;'
      );
    }

    // Make the input field half as wide
    if (this.guestNameInput) {
      this.guestNameInput.setAttribute(
        'style',
        'width: 50%; max-width: 200px; margin: 0 auto;'
      );
    }
  }

  // Add this method to ensure consistent sizing across modals
  private setModalWidth(width: number): void {
    // Apply width to the modal element directly
    this.modalElement.style.maxWidth = `${width}px`;
    this.modalElement.style.width = '90%';

    // Also set width on inner container if it exists (for consistent inner spacing)
    const container = this.modalElement.querySelector('.lobby-modal-container');
    if (container instanceof HTMLElement) {
      container.style.width = '100%';
      container.style.maxWidth = `${width - 40}px`; // Account for padding
    }

    // Add class to ensure CSS can target this modal type specifically
    this.modalElement.classList.add('session-modal');
  }
}
