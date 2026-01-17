import { Page, Locator, expect } from '@playwright/test';
import type { Card, GameStateData } from '../../src/shared/types';

export class GamePage {
  readonly page: Page;
  readonly handRow: Locator;
  readonly playBtn: Locator;
  readonly takeBtn: Locator;
  readonly toast: Locator;
  readonly pileTop: Locator;
  readonly gameOverOverlay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.handRow = page.locator('#my-area .hand-row');
    this.playBtn = page.locator('#play-button');
    this.takeBtn = page.locator('#take-button');
    this.toast = page.locator('.toast');
    this.pileTop = page.locator('#pile-top-card');
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

  async selectCards(indices: number[]) {
    for (const idx of indices) {
        // Find card by data-idx
        await this.handRow.locator(`.card-container .card-img[data-idx="${idx}"]`).click();
    }
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
