import { test, expect } from '@playwright/test';
import { createPlayer, waitForAnimationsToFinish } from './e2eUtils';
import { playValidMove } from './botBehavior';

test.describe('Animation Safety', () => {
  test('does not hit 10s safety force-unlock during play', async ({ browser }) => {
    test.setTimeout(120000);

    const host = await createPlayer(browser, 'Host');
    await host.lobby.goto();
    await host.lobby.setName('HostPlayer');

    // Increase the chance of hitting special-card sequences.
    await host.page.locator('#cpus-plus').click();
    await host.lobby.startGame();

    await host.game.waitForGameStart();

    const forceUnlockMessages: string[] = [];
    host.page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[AnimationQueue] Force unlocking state.')) {
        forceUnlockMessages.push(text);
      }
    });

    // Play a chunk of turns; CPU turns are handled by waiting.
    // This test is intentionally longer to catch regressions that only show up mid-game.
    const maxTurns = 30;
    for (let i = 0; i < maxTurns; i++) {
      await waitForAnimationsToFinish(host.page);
      if (await host.game.isGameOver()) break;

      if (await host.game.isMyTurn()) {
        await playValidMove(host.game, host.page, '[Host]');
      } else {
        await host.page.waitForTimeout(750);
      }

      if (forceUnlockMessages.length > 0) break;
    }

    expect(forceUnlockMessages, 'Animation safety unlock should not be needed').toEqual([]);
  });
});

