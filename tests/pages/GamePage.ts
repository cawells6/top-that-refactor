import { Page, Locator, expect } from '@playwright/test';
import type { Card, GameStateData } from '../../src/shared/types';

export class GamePage {
  readonly page: Page;
  readonly handRow: Locator;
  readonly playBtn: Locator;
  readonly takeBtn: Locator;
  readonly toast: Locator;
  readonly pileTop: Locator;
  readonly pileContainer: Locator;
  readonly pileCountBadge: Locator;
  readonly gameOverOverlay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.handRow = page.locator('#my-area .hand-row');
    this.playBtn = page.locator('#play-button');
    this.takeBtn = page.locator('#take-button');
    this.toast = page.locator('.toast');
    this.pileTop = page.locator('#pile-top-card');
    this.pileContainer = page.locator('.pile--play');
    this.pileCountBadge = page.locator('.pile--play .count-value');
    this.gameOverOverlay = page.locator('.victory-overlay');
  }

  async getHandCards(): Promise<Card[]> {
    // Hybrid approach: Get state from window
    return await this.page.evaluate(() => {
        const state = (window as any).state?.getLastGameState() as GameStateData | null;
        const myId = (window as any).state?.myId;
        if (!state || !myId) return [];
        const me = state.players.find(p => p.id === myId);
        return me?.hand || [];
    });
  }

  async getGameState(): Promise<GameStateData | null> {
      return await this.page.evaluate(() => {
          return (window as any).state?.getLastGameState() || null;
      });
  }

  async getMyId(): Promise<string | null> {
      return await this.page.evaluate(() => (window as any).state?.myId ?? null);
  }

  async getPileVisualCount(): Promise<number> {
    const text = await this.pileCountBadge.textContent();
    return parseInt(text || '0', 10);
  }

  async waitForStablePile(options: { timeoutMs?: number } = {}) {
    const timeoutMs = options.timeoutMs ?? 3000;

    await expect
      .poll(async () => {
        const state = await this.getGameState();
        if (!state) return false;

        const visualText = await this.pileCountBadge.textContent();
        const visualCount = parseInt(visualText || '0', 10);
        const logicalCount = state.pile ? state.pile.count : 0;

        return visualCount === logicalCount;
      }, { timeout: timeoutMs })
      .toBeTruthy();
  }

  async selectCards(indices: number[]) {
    for (const idx of indices) {
        // Find card by data-idx
        await this.handRow.locator(`.card-container .card-img[data-idx="${idx}"]`).click();
    }
  }

  async selectUpCard(index: number) {
    await this.page.locator(`.stack-row .card-container.up-card[data-idx="${index}"]`).click();
  }

  async selectDownCard(index: number) {
    await this.page.locator(`.stack-row .card-container.down-card[data-idx="${index}"]`).click();
  }

  async playCards() {
    await this.playBtn.click();
  }

  async takePile() {
    await this.takeBtn.click();
  }

  async isMyTurn(): Promise<boolean> {
      return await this.page.evaluate(() => {
          const state = (window as any).state?.getLastGameState() as GameStateData;
          const myId = (window as any).state?.myId;
          return state?.currentPlayerId === myId;
      });
  }

  async isGameOver(): Promise<boolean> {
      return await this.gameOverOverlay.isVisible();
  }

  async waitForGameStart() {
      // Wait for #game-table to be visible
      await expect(this.page.locator('#game-table')).toBeVisible({ timeout: 10000 });
  }
}
