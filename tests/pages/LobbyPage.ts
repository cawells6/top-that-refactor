import { Page, Locator, expect } from '@playwright/test';

export class LobbyPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly hostTab: Locator;
  readonly joinTab: Locator;
  readonly humansPlusBtn: Locator;
  readonly cpuPlusBtn: Locator;
  readonly startGameBtn: Locator;
  readonly joinCodeInput: Locator;
  readonly joinGameBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.locator('#player-name-input');
    this.hostTab = page.locator('.lobby-tab-button[data-tab="host"]');
    this.joinTab = page.locator('#nav-join-friend-button');
    this.humansPlusBtn = page.locator('#humans-plus');
    this.cpuPlusBtn = page.locator('#cpus-plus');
    this.startGameBtn = page.locator('#host-play-button');
    this.joinCodeInput = page.locator('#join-code-input');
    this.joinGameBtn = page.locator('#join-enter-button');
  }

  async goto() {
    await this.page.goto('/');
    // Wait for the lobby to be visible (body has class showing-lobby)
    // Actually uiManager adds showing-lobby to body.
    await expect(this.page.locator('#lobby-container')).toBeVisible();
  }

  async setName(name: string) {
    await this.nameInput.fill(name);
  }

  async addHuman() {
    await this.humansPlusBtn.click();
  }

  async addCpu() {
    await this.cpuPlusBtn.click();
  }

  async startGame() {
    await this.startGameBtn.click();
  }

  async getRoomCode(): Promise<string> {
    // Waiting panel renders the room code as text (not an input).
    const codeEl = this.page.locator('#waiting-room-code');
    await expect(codeEl).toBeVisible({ timeout: 5000 });

    // Wait for it to be populated (not the placeholder dashes).
    await expect(codeEl).not.toHaveText(/^-+$/);

    const raw = (await codeEl.textContent()) || '';
    return raw.trim();
  }

  async joinGame(code: string) {
    await this.joinTab.click();
    await this.joinCodeInput.fill(code);
    await this.joinGameBtn.click();
  }
}
