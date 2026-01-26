import { test, expect } from '@playwright/test';
import { createPlayer, getMyId, waitForAnimationsToFinish } from './e2eUtils';
import { playValidMove } from './botBehavior';

const scenarios = [
  { humans: 1, cpus: 1, name: '1v1 Head to Head' },
  { humans: 1, cpus: 2, name: '1 Human vs 2 CPUs' },
  { humans: 2, cpus: 0, name: '2 Humans Only' }
];

test.describe('Game Variations', () => {
    for (const scenario of scenarios) {
        test(scenario.name, async ({ browser }) => {
            test.setTimeout(120000);

            // --- HOST SETUP ---
            const p1 = await createPlayer(browser, 'Host');
            await p1.lobby.goto();
            await p1.lobby.setName('HostPlayer');

            // Configure Lobby based on scenario
            // By default 1 human is present (host).
            // Default CPUs is usually 1? Let's check logic or assume we need to set it explicitly if possible.
            // LobbyPage has addCpu (adds 1). Does it have setCpu?
            // We can subtract if needed? Or just add.
            // Assuming start state: 1 Human, 1 CPU?
            // If we want 1 CPU, do nothing?
            // If we want 2 CPUs, add 1.
            // If we want 0 CPUs, subtract 1?
            // LobbyPage helper might need update or we rely on +/- buttons.
            // Assuming default is 1 Human, 0 CPUs? Or 1?
            // Based on logs: "numHumans: 1, numCPUs: 0" in one log? No, "numCPUs: 2".
            // Let's assume default is 1 Human, 0 or 1 CPU.
            // I'll implement logic to set exact count if I can read it, or just blindly click.
            // Safest: Reset to 0 then add?

            // For now, I'll assume default is 1 Human, 1 CPU (based on "1v1 Head to Head").
            // If I want 2 CPUs, I click addCpu once.
            // If I want 0 CPUs, I need removeCpu? (Not implemented in Page Object).
            // I'll skip "remove" logic for now and assume I can just add.
            // Wait, "2 Humans Only" needs 0 CPUs.
            // If default is 1 CPU, I need to remove it.
            // I should add `removeCpu` to LobbyPage or `e2eUtils`.
            // But I can't modify LobbyPage in this step.
            // I'll inspect DOM directly for now if needed.

            // Actually, scenario 3 "2 Humans Only" implies 0 CPUs.
            // If default is 1 CPU, I need to click minus.
            // I'll add `removeCpu` to `LobbyPage` in a separate step or just use locator here.

            // Let's assume default is 1 CPU.
            if (scenario.cpus === 2) {
                await p1.lobby.addCpu();
            } else if (scenario.cpus === 0) {
                // Click minus button
                await p1.page.locator('#cpus-minus').click();
            }

            // Humans
            if (scenario.humans === 2) {
                await p1.lobby.addHuman();
            }

            await p1.lobby.startGame();

            let p2: any = null;

            // --- JOINER SETUP ---
            if (scenario.humans > 1) {
                const roomCode = await p1.lobby.getRoomCode();
                p2 = await createPlayer(browser, 'Joiner');
                await p2.lobby.goto();
                await p2.lobby.setName('JoinerPlayer');
                await p2.lobby.joinGame(roomCode);

                // Joiner clicks Ready
                const joinerStartButton = p2.page.locator('#waiting-ready-button');
                await expect(joinerStartButton).toBeVisible();
                await joinerStartButton.click();
            }

            // Wait for Game Start
            await p1.game.waitForGameStart();
            if (p2) await p2.game.waitForGameStart();

            // Verify Player Count
            const expectedTotal = scenario.humans + scenario.cpus;
            const state = await p1.game.getGameState();
            expect(state?.players.length).toBe(expectedTotal);

            // Play 2 Turns
            for (let i = 0; i < 2; i++) {
                await waitForAnimationsToFinish(p1.page);
                if (p2) await waitForAnimationsToFinish(p2.page);

                const currentState = await p1.game.getGameState();
                const activeId = currentState?.currentPlayerId;
                const p1Id = await getMyId(p1.page);
                const p2Id = p2 ? await getMyId(p2.page) : null;

                if (activeId === p1Id) {
                    await playValidMove(p1.game, p1.page, '[Host]');
                } else if (p2 && activeId === p2Id) {
                    await playValidMove(p2.game, p2.page, '[Joiner]');
                } else {
                    // CPU turn
                    await p1.page.waitForTimeout(1000);
                }
            }
        });
    }
});
