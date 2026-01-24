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
    this.joinTab = page.locator('.lobby-tab-button[data-tab="join"]');
    this.humansPlusBtn = page.locator('#humans-plus');
    this.cpuPlusBtn = page.locator('#cpus-plus');
    this.startGameBtn = page.locator('#setup-deal-button');
    this.joinCodeInput = page.locator('#join-code-input');
    this.joinGameBtn = page.locator('#join-game-button');
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
    // Wait for the room code input to be visible in the modal
    const codeInput = this.page.locator('#game-id-input');
    await expect(codeInput).toBeVisible({ timeout: 5000 });
    return await codeInput.inputValue();
  }

  async joinGame(code: string) {
    await this.joinTab.click();
    await this.joinCodeInput.fill(code);
    await this.joinGameBtn.click();
  }
}
