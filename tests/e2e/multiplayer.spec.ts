import { test, expect } from '@playwright/test';

// Local imports (Add .js extensions and keep them separate)
import { playValidMove } from './botBehavior.js';
import { waitForAnimationsToFinish, createPlayer, getMyId } from './e2eUtils.js';

test('2 Humans + 2 CPUs (4 Player Game)', async ({ browser }) => {
    test.setTimeout(120000); // 2 minutes

    // --- STEP 1: SETUP HOST (Human A) ---
    const p1 = await createPlayer(browser, 'HumanHost');
    await p1.lobby.goto();
    await p1.lobby.setName('HumanHost');

    // Ensure 2 Humans (Host + Joiner) and 2 CPUs
    // Default is 1 Human, 0 CPUs? Or 1 CPU?
    // We need 2 Humans total. Host is 1. So we add 1 Human.
    await p1.lobby.addHuman();

    // Add 2 CPUs
    await p1.lobby.addCpu();
    await p1.lobby.addCpu();

    // Host clicks Play/Start to create the room and get the code
    await p1.lobby.startGame();

    // Get Join Code from Host's "Waiting" modal
    const roomCode = await p1.lobby.getRoomCode();
    console.log('Room Code:', roomCode);

    // --- STEP 2: SETUP JOINER (Human B) ---
    const p2 = await createPlayer(browser, 'HumanJoiner');
    await p2.lobby.goto();
    await p2.lobby.setName('HumanJoiner');
    await p2.lobby.joinGame(roomCode);

    // After Joiner joins, the Host's modal should update or game starts?
    // In `InSessionLobbyModal`, it shows players.
    // Host needs to click "LET'S PLAY" (waiting-ready-button) maybe?
    // Wait, the `in-session-lobby-modal` has a button: `#waiting-ready-button` ("LET'S PLAY").
    // If we are waiting for players, does it auto-start?
    // The previous tests used `startGame()` which clicks `#host-play-button`.
    // But that was for Single Player (or Host + CPU).

    // If multiple humans, they go to lobby.
    // We need to click "LET'S PLAY" on Host (and maybe Joiner?).
    // Let's check `events.ts`.

    // Wait, let's look at `events.ts`:
    // `state.socket.emit(START_GAME, ...)` is called if spectator.
    // Otherwise, `handleDealClick` just joins/creates.

    // The `InSessionLobbyModal` handles the "Waiting" state.
    // It has `waiting-ready-button`.
    // We probably need to click it.

    // Let's assume we need to click "LET'S PLAY" on the Host to start the game
    // once everyone is joined.

    // Wait for p2 to appear in p1's lobby?
    // We can just try to click "LET'S PLAY" on p1.
    // Assuming p1 is the host.

    // ADJUSTMENT: In this game, the Host (p1) sees the "Waiting" modal but the "Ready Up" button
    // is often hidden for the Host (since they created it).
    // The Joiner (p2) needs to click "Let's Play" / "Ready Up".

    const joinerStartButton = p2.page.locator('#waiting-ready-button');
    // Ensure it's visible and enabled
    await expect(joinerStartButton).toBeVisible();
    // Use force click if needed or just standard click
    await joinerStartButton.click();

    // --- STEP 3: START GAME ---
    // Both players should see the game table
    await p1.game.waitForGameStart();
    await p2.game.waitForGameStart();

    // Wait for deal animations
    await Promise.all([
        waitForAnimationsToFinish(p1.page),
        waitForAnimationsToFinish(p2.page)
    ]);

    // --- STEP 4: VERIFY SYNC ---
    // Verify both players see 4 players in the game (2 Humans + 2 CPUs)
    const p1State = await p1.game.getGameState();
    const p2State = await p2.game.getGameState();

    expect(p1State?.players.length).toBe(4);
    expect(p2State?.players.length).toBe(4);

    // Verify they see the SAME top card (if pile exists)
    // Note: Pile might be empty at start if deck dealt to hands/table.
    // Or there is a starter card.
    if (p1State?.pile && p1State.pile.length > 0) {
        expect(p1State.pile[p1State.pile.length-1].value)
            .toBe(p2State?.pile![p2State.pile!.length-1].value);
    }

    // --- STEP 5: PLAY A FEW TURNS ---
    // We can loop strictly for a few turns to ensure connectivity holds
    for (let i = 0; i < 5; i++) {
        // Determine whose turn it is from P1's perspective
        const currentState = await p1.game.getGameState();
        const activePlayerId = currentState?.currentPlayerId;
        const p1Id = await getMyId(p1.page);
        const p2Id = await getMyId(p2.page);

        if (activePlayerId === p1Id) {
            console.log("[Turn " + i + "] Human 1 Turn");
            await playValidMove(p1.game, p1.page, '[Human1]');
        } else if (activePlayerId === p2Id) {
             console.log("[Turn " + i + "] Human 2 Turn");
            await playValidMove(p2.game, p2.page, '[Human2]');
        } else {
            console.log("[Turn " + i + "] CPU Turn - Waiting...");
            await p1.page.waitForTimeout(2000); // Wait for CPU
        }

        await Promise.all([
             waitForAnimationsToFinish(p1.page),
             waitForAnimationsToFinish(p2.page)
        ]);
    }
});
