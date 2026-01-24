import { Page, expect } from '@playwright/test';

export async function waitForAnimationsToFinish(page: Page) {
  // Wait for flying cards to disappear
  await expect(page.locator('.flying-card')).toHaveCount(0);
  await expect(page.locator('.flying-card-ghost')).toHaveCount(0);

  // Handle overlay if it appears
  const overlay = page.locator('#game-start-overlay');

  if (await overlay.count() > 0) {
      if (await overlay.isVisible()) {
          try {
              await overlay.click({ timeout: 500, force: true });
          } catch (e) {
              // Ignore
          }
      }

      // If still visible after click, try to remove it via JS (Safety net)
      if (await overlay.isVisible()) {
          // Give it a moment to fade
          await page.waitForTimeout(200);
          if (await overlay.isVisible()) {
             await page.evaluate(() => {
                 const el = document.getElementById('game-start-overlay');
                 if (el) el.remove();
             });
          }
      }

      // Final check
      if (await overlay.count() > 0) {
        await expect(overlay).toBeHidden();
      }
  }
}
