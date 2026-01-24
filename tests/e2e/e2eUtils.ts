import { Page, expect } from '@playwright/test';

export async function waitForAnimationsToFinish(page: Page) {
  // Wait for flying cards to disappear
  await expect(page.locator('.flying-card')).toHaveCount(0);
  await expect(page.locator('.flying-card-ghost')).toHaveCount(0);

  // Handle overlay if it appears
  const overlay = page.locator('#game-start-overlay');

  // Check if attached at all before doing anything
  if (await overlay.count() > 0) {
      if (await overlay.isVisible()) {
          try {
              await overlay.click({ timeout: 1000, force: true });
          } catch (e) {
              // Ignore click failure (maybe it disappeared)
          }
      }
      // Wait for it to be gone
      await expect(overlay).toBeHidden();
  }
}
