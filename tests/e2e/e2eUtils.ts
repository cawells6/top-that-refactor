import { Page, expect } from '@playwright/test';
import { LobbyPage } from '../pages/LobbyPage';
import { GamePage } from '../pages/GamePage';

export async function createPlayer(browser: any, name: string) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const lobby = new LobbyPage(page);
    const game = new GamePage(page);

    // Setup console logging for debugging this specific player
    page.on('console', msg => console.log(`[${name}] ${msg.text()}`));

    return { page, context, lobby, game, name };
}

export async function getMyId(page: Page) {
    return await page.evaluate(() => (window as any).state?.myId);
}

export async function waitForAnimationsToFinish(
  page: Page,
  options: { requireStableState?: boolean } = {}
) {
  // Wait for flying cards to disappear
  await expect(page.locator('.flying-card')).toHaveCount(0);
  await expect(page.locator('.flying-card-ghost')).toHaveCount(0);

  // Special-effect icons animate while state updates are buffered.
  await expect(page.locator('.special-icon')).toHaveCount(0);

  // Handle overlay if it appears
  const overlay = page.locator('#game-start-overlay');

  if (await overlay.count() > 0) {
      if (await overlay.isVisible()) {
          try {
              // Dismiss the "Ready? Click anywhere to start" overlay.
              // IMPORTANT: Don't remove via JS; the opening-deal flow waits for this
              // to resolve before emitting ANIMATIONS_COMPLETE (which clears `isStarting`).
              await Promise.any([
                  overlay.click({ timeout: 1000, force: true }),
                  page.keyboard.press('Enter', { delay: 10 }),
                  page.keyboard.press(' ', { delay: 10 }),
              ]);
          } catch (e) {
              // Ignore
          }
      }

      // Final check
      if (await overlay.count() > 0) {
        await expect(overlay).toBeHidden({ timeout: 5000 });
      }
  }

  // Ensure the opening-deal flow fully completed server-side.
  // While `isStarting` is true, the client blocks Play/Take clicks.
  await expect
    .poll(
      async () =>
        await page.evaluate(() => {
          const s = (window as any).state?.getLastGameState?.();
          return Boolean(s?.isStarting);
        }),
      { timeout: 15000 }
    )
    .toBeFalsy();

  if (options.requireStableState) {
    // Wait for a brief "quiet period" where the client state stops changing.
    // The UI buffers STATE_UPDATE during the animation queue; without this, tests can
    // read a stale pile/hand and make an invalid move.
    await page.waitForFunction(
      ({ stableForMs }) => {
        const w = window as any;
        const s = w.state?.getLastGameState?.();
        if (!s) return false;

        const pile = s.pile || [];
        const statePileTop = pile.length
          ? `${String(pile[pile.length - 1]?.value ?? '')}:${String(pile[pile.length - 1]?.suit ?? '')}`
          : null;

        const pileTopEl = document.getElementById('pile-top-card');
        const pileTopImg = pileTopEl?.querySelector('img') as HTMLImageElement | null;
        const alt = (pileTopImg?.alt || '').trim(); // e.g. "K of spades"
        let domPileTop: string | null = null;
        if (alt) {
          const parts = alt.split(' of ');
          if (parts.length === 2) {
            domPileTop = `${parts[0].trim()}:${parts[1].trim()}`;
          }
        }

        // If the UI is showing a pile top, require state to match it (otherwise state is still buffered/stale).
        if (domPileTop && statePileTop) {
          if (domPileTop.toLowerCase() !== statePileTop.toLowerCase()) {
            w.__pw_stateSigChangedAt = performance.now();
            w.__pw_stateSig = '';
            return false;
          }
        }

        const playersSig = (s.players || [])
          .map((p: any) => ({
            id: p.id,
            hand: (p.hand || []).length,
            up: (p.upCards || []).filter((c: any) => c != null).length,
            down: (p.downCards || []).filter((c: any) => c != null).length,
          }))
          .sort((a: any, b: any) => String(a.id).localeCompare(String(b.id)));

        const sig = JSON.stringify({
          currentPlayerId: s.currentPlayerId,
          deckSize: s.deckSize ?? null,
          pileLen: pile.length,
          statePileTop,
          domPileTop,
          players: playersSig,
        });

        const now = performance.now();
        if (w.__pw_stateSig !== sig) {
          w.__pw_stateSig = sig;
          w.__pw_stateSigChangedAt = now;
          return false;
        }

        const changedAt = w.__pw_stateSigChangedAt ?? now;
        return now - changedAt >= stableForMs;
      },
      { stableForMs: 200 },
      { timeout: 10000 }
    );
  }
}
