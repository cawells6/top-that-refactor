// public/scripts/tutorial/TutorialController.ts

import type { Card } from '../../../src/shared/types.js';
import { normalizeCardValue } from '../../../utils/cardUtils.js';
import { initializeGameControls } from '../gameControls.js';
import { logCardPlayed, logGameStart, renderGameState } from '../render.js';
import { showToast } from '../uiHelpers.js';
import { tutorialSteps, type StepConfig } from './tutorialSteps.js';

export class TutorialController {
  private currentStepIndex = 0;
  private currentStep: StepConfig;
  private isAutoAdvancing = false;
  private isTransitionLocked = false;

  // Game State Containers
  private myHand: Card[] = [];
  private pile: Card[] = [];
  private upCards: (Card | null)[] = [];
  private downCards: (Card | null)[] = [];

  // DOM Elements
  private cardEl: HTMLElement | null = null;
  private highlightedElements: HTMLElement[] = [];
  private ghostHandEl: HTMLDivElement | null = null;
  private ghostHandAbort: AbortController | null = null;

  constructor() {
    this.currentStep = tutorialSteps[0];
    this.createTutorialUI();

    // Initialize controls and intercept interactions
    initializeGameControls();
    this.interceptGameControls();

    // Start the first step with dealing animation (fire and forget with error handling)
    this.startTutorialWithAnimation().catch((err) => {
      console.error(
        '[Tutorial] Animation failed, falling back to direct load:',
        err
      );
      // Fallback: just load step 0 directly if animation fails
      this.loadStep(0);
    });

    // Handle window resize to fix highlight positions
    window.addEventListener('resize', () => {
      this.updateHighlight();
      this.startGhostHandCue();
      this.positionTutorialCard();
    });
  }

  private positionTutorialCard() {
    if (!this.cardEl) return;

    const table = document.querySelector(
      '#game-table .table'
    ) as HTMLElement | null;
    if (!table) return;

    const tableRect = table.getBoundingClientRect();
    const cardRect = this.cardEl.getBoundingClientRect();
    if (cardRect.width === 0 || cardRect.height === 0) return;

    const gapPx = 16;
    const marginPx = 16;

    // Prefer placing the card just to the right of the table border.
    const desiredLeft = Math.round(tableRect.right + gapPx);
    const maxLeft = Math.round(window.innerWidth - cardRect.width - marginPx);
    const left = Math.min(Math.max(desiredLeft, marginPx), maxLeft);

    const desiredTop = Math.round(
      tableRect.top + (tableRect.height - cardRect.height) / 2
    );
    const maxTop = Math.round(window.innerHeight - cardRect.height - marginPx);
    const top = Math.min(Math.max(desiredTop, marginPx), maxTop);

    // If there's genuinely no room on the right, this will clamp inside the viewport
    // (and may overlap the table on smaller screens), but it stays "anchored" to it.
    this.cardEl.style.left = `${left}px`;
    this.cardEl.style.top = `${top}px`;
    this.cardEl.style.right = 'auto';
    this.cardEl.style.bottom = 'auto';
    this.cardEl.style.transform = 'none';
  }

  private async startTutorialWithAnimation() {
    // Ensure game table is visible for animation
    const gameTable = document.getElementById('game-table');
    if (gameTable) {
      gameTable.classList.remove('hidden');
      gameTable.style.display = 'grid';
    }

    // Load step 0 to set initial state
    const firstStep = tutorialSteps[0];
    this.myHand = this.parseCards(firstStep.scenario.myHand);
    this.pile = this.parseCards(firstStep.scenario.pile);
    this.upCards = this.parseCards(firstStep.scenario.upCards);
    this.downCards = Array(firstStep.scenario.downCards)
      .fill(null)
      .map(() => ({ value: 2, suit: 'hearts', back: true }));

    // Render in skeleton mode (hide cards/icons)
    const skeletonState = this.buildGameState();
    const { renderGameState } = await import('../render.js');
    renderGameState(skeletonState, 'tutorial-player', null, {
      skeletonMode: true,
    });

    // Wait a frame to ensure DOM is updated
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    // Play simplified dealing animation
    await this.playTutorialDealAnimation();

    // Now load step 0 normally
    this.loadStep(0);
  }

  private async playTutorialDealAnimation(): Promise<void> {
    const wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const DEAL_INTERVAL = 100;
    const PHASE_PAUSE = 400;

    const playSource = document.getElementById('deck-pile');
    if (!playSource) return;

    const playRect = playSource.getBoundingClientRect();

    // Phase A: Down cards (just show them)
    for (let i = 0; i < 3; i++) {
      const target = document.querySelector(
        `#my-area .stack-row > div:nth-child(${i + 1})`
      ) as HTMLElement;
      if (target) {
        this.animateTutorialCard(playRect, target, null);
        await wait(DEAL_INTERVAL);
      }
    }
    await wait(PHASE_PAUSE);

    // Phase B: Up cards
    for (let i = 0; i < 3; i++) {
      const upCard = this.upCards[i];
      const target = document.querySelector(
        `#my-area .stack-row > div:nth-child(${i + 1})`
      ) as HTMLElement;
      if (target && upCard) {
        this.animateTutorialCard(playRect, target, upCard);
        await wait(DEAL_INTERVAL);
      }
    }
    await wait(PHASE_PAUSE);

    // Phase C: Hand cards
    for (let i = 0; i < this.myHand.length; i++) {
      const handRow = document.querySelector(
        '#my-area .hand-row'
      ) as HTMLElement;
      if (handRow && handRow.children[i]) {
        const target = handRow.children[i] as HTMLElement;
        this.animateTutorialCard(playRect, target, this.myHand[i]);
        await wait(DEAL_INTERVAL);
      }
    }
    await wait(PHASE_PAUSE);

    // Phase D: Flip starter card from deck to play pile (like real game)
    if (this.pile.length > 0) {
      const playPile = document.getElementById('play-pile');
      if (playPile) {
        this.animateTutorialCard(playRect, playPile, this.pile[0]);
        await wait(600); // Match flight duration

        // Render the card on the pile
        const { cardImg } = await import('../render.js');
        playPile.innerHTML = '';
        const cardEl = cardImg(this.pile[0], false, undefined, false, false);
        playPile.appendChild(cardEl);
      }
    }
    await wait(PHASE_PAUSE);

    // Clear ALL skeleton mode styling from DOM (including card backs)
    const allCards = document.querySelectorAll(
      '.card-img, .card-ability-icon, .hand-count-badge, .card-back-logo'
    );
    allCards.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.visibility = 'visible';
      htmlEl.style.opacity = '1';
    });

    // Force complete re-render without skeleton mode
    const finalState = this.buildGameState();
    const { renderGameState } = await import('../render.js');
    renderGameState(finalState, 'tutorial-player', null, {
      skeletonMode: false,
    });

    await wait(500);
  }

  private async animateTutorialCard(
    playRect: DOMRect,
    target: HTMLElement,
    cardData: Card | null
  ): Promise<void> {
    const targetRect = target.getBoundingClientRect();

    // Create a simple card-back flyer (just like the real game does)
    const flyer = document.createElement('div');
    flyer.className = 'tutorial-flying-card flying-card';

    // Calculate centers for smooth transform-based animation
    const startCenterX = playRect.left + playRect.width / 2;
    const startCenterY = playRect.top + playRect.height / 2;
    const endCenterX = targetRect.left + targetRect.width / 2;
    const endCenterY = targetRect.top + targetRect.height / 2;

    const deltaX = endCenterX - startCenterX;
    const deltaY = endCenterY - startCenterY;

    // Position at source center, but sized to match destination (prevents resizing during flight)
    Object.assign(flyer.style, {
      position: 'fixed',
      left: `${startCenterX - targetRect.width / 2}px`,
      top: `${startCenterY - targetRect.height / 2}px`,
      width: `${targetRect.width}px`,
      height: `${targetRect.height}px`,
      zIndex: '9999',
      pointerEvents: 'none',
    });

    document.body.appendChild(flyer);

    // Use Web Animations API for smooth transform-based animation
    const animation = flyer.animate(
      [
        { transform: 'translate(0px, 0px)' },
        { transform: `translate(${deltaX}px, ${deltaY}px)` },
      ],
      {
        duration: 600,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        fill: 'forwards',
      }
    );

    animation.onfinish = () => {
      flyer.remove();
    };

    // Keep the data for potential future use
    void cardData;
  }

  private buildGameState() {
    return {
      started: true,
      currentPlayerId: this.currentStep.isAuto
        ? 'tutorial-opponent'
        : 'tutorial-player',
      players: [
        {
          id: 'tutorial-player',
          name: 'You',
          avatar: '🫅',
          handCount: this.myHand.length,
          hand: this.myHand,
          upCards: this.upCards,
          downCards: this.downCards.filter((c): c is Card => c !== null), // Filter out nulls
          downCount: this.downCards.length,
          isComputer: false,
        },
        {
          id: 'tutorial-opponent',
          name: 'The King',
          avatar: '🤴',
          handCount: 6,
          hand: [],
          upCards: [
            { suit: 'hidden', value: 'BACK', back: true },
            { suit: 'hidden', value: 'BACK', back: true },
            { suit: 'hidden', value: 'BACK', back: true },
          ],
          downCards: [],
          downCount: 3,
          isComputer: true,
        },
      ],
      pile: this.pile,
      deckSize: 20,
      discardCount: 0,
      lastRealCard:
        this.pile.length > 0 ? this.pile[this.pile.length - 1] : null,
    };
  }

  // --- STEP MANAGEMENT ---

  private loadStep(
    index: number,
    direction: 'forward' | 'backward' = 'forward'
  ) {
    // Cleanup: intro uses a global "click anywhere" handler.
    document.removeEventListener('click', this.handleGlobalClick);
    this.isTransitionLocked = false;
    this.stopGhostHandCue();

    // Clear auto-advancing flag when navigating backward
    if (direction === 'backward') {
      this.isAutoAdvancing = false;
    }

    if (this.isAutoAdvancing && direction === 'forward') return;

    if (index >= tutorialSteps.length) {
      this.finishTutorial();
      return;
    }

    this.currentStepIndex = index;
    this.currentStep = tutorialSteps[index];

    // CRITICAL: Clear all selected cards when loading any step
    document
      .querySelectorAll('.selected')
      .forEach((el) => el.classList.remove('selected'));
    document
      .querySelectorAll('.selected-container')
      .forEach((el) => el.classList.remove('selected-container'));

    // 1. Parse Scenario from Config
    this.myHand = this.parseCards(this.currentStep.scenario.myHand);
    this.pile = this.parseCards(this.currentStep.scenario.pile);
    this.upCards = this.parseCards(this.currentStep.scenario.upCards);

    // Generate dummy down cards based on count
    this.downCards = Array(this.currentStep.scenario.downCards)
      .fill(null)
      .map(() => ({
        value: 2,
        suit: 'hearts',
        back: true,
      }));

    // 2. Update UI
    this.updateRender();
    this.updateInstructionCard();

    if (this.currentStep.id === 'HELP_RULES_HISTORY') {
      this.seedMoveHistoryDemo();
    }

    // Show tutorial card if it was hidden during animation
    if (this.cardEl) {
      this.cardEl.style.opacity = '1';
    }

    // 3. Handle Auto-advancing steps (only when moving forward)
    if (this.currentStep.isAuto && direction === 'forward') {
      this.isAutoAdvancing = true;
      this.clearHighlight();

      // Animate opponent's card playing
      void (async () => {
        await this.animateOpponentPlay();
        await new Promise<void>((resolve) => setTimeout(resolve, 2000));
        this.isAutoAdvancing = false;
        this.nextStep();
      })().catch((err) => {
        console.error('[Tutorial] animateOpponentPlay failed:', err);
        this.isAutoAdvancing = false;
      });
      return; // Stop further processing for this step
    }

    // 4. Move Highlight to the correct element (after render completes)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.updateHighlight();
        this.startGhostHandCue();
      });
    });

    // 5. Auto-advance for INTRO steps
    if (this.currentStep.id === 'INTRO_WELCOME') {
      this.clearHighlight();
      // Wait for user click (no timer - they read at their own pace)
      document.addEventListener('click', this.handleGlobalClick);
    }
  }

  private handleGlobalClick = () => {
    if (this.currentStep.id === 'INTRO_WELCOME') {
      document.removeEventListener('click', this.handleGlobalClick);
      this.nextStep();
    }
  };

  private nextStep() {
    this.loadStep(this.currentStepIndex + 1);
  }

  private previousStep() {
    if (this.currentStepIndex > 0) {
      // Remove any global click listeners before going back
      document.removeEventListener('click', this.handleGlobalClick);
      this.loadStep(this.currentStepIndex - 1, 'backward');
    }
  }

  // ... rest of constructor and other methods
  private finishTutorial() {
    // Clean up highlights and UI elements
    this.clearHighlight();
    this.stopGhostHandCue();
    if (this.cardEl) {
      this.cardEl.remove();
      this.cardEl = null;
    }
    window.location.href = '/'; // Return to lobby
  }

  // --- HIGHLIGHT LOGIC ---

  private updateHighlight() {
    this.clearHighlight();

    const targets: HTMLElement[] = [];
    const config = this.currentStep.validation;

    if (this.currentStep.id.startsWith('INTRO_')) {
      return; // No highlight for intro steps
    }

    // A. Find Target(s) based on Step Logic
    if (this.currentStep.id === 'HELP_RULES_HISTORY') {
      const rulesBtn = document.getElementById(
        'table-rules-button'
      ) as HTMLElement | null;
      const historyBtn = document.getElementById(
        'table-history-button'
      ) as HTMLElement | null;
      if (rulesBtn) targets.push(rulesBtn);
      if (historyBtn) targets.push(historyBtn);
    } else {
      let target: HTMLElement | null = null;

      if (config.type === 'pickup_pile' || config.type === 'facedown_pickup') {
        target = document.getElementById('take-button');
      } else if (
        config.type === 'play_card' ||
        config.type === 'four_of_kind'
      ) {
        if (config.cardValue) {
          // Find a specific card in the hand
          const expectedValue = String(
            normalizeCardValue(config.cardValue) ?? config.cardValue
          );
          const handRow = document.querySelector(
            '#my-area .hand-row'
          ) as HTMLElement;
          if (handRow) {
            const cardImgs = handRow.querySelectorAll<HTMLElement>('.card-img');
            for (const img of Array.from(cardImgs)) {
              if (img.dataset.value === expectedValue) {
                target = img.closest('.card-container') as HTMLElement;
                break;
              }
            }
          }
        } else if (config.expectedAction?.startsWith('click_index')) {
          const expectedIdxStr = config.expectedAction.split('_').pop() || '0';
          const expectedIdx = Number.parseInt(expectedIdxStr, 10);

          const stackRow = document.querySelector(
            '#my-area .stack-row'
          ) as HTMLElement | null;
          const expectedZone = this.getExpectedIndexClickZone();

          if (
            stackRow &&
            !Number.isNaN(expectedIdx) &&
            expectedIdx >= 0 &&
            expectedIdx < stackRow.children.length
          ) {
            const col = stackRow.children[expectedIdx] as HTMLElement;
            if (expectedZone === 'upCards') {
              target =
                (col.querySelector(
                  '.card-container.up-card'
                ) as HTMLElement | null) ?? col;
            } else if (expectedZone === 'downCards') {
              target =
                (col.querySelector('.card-container') as HTMLElement | null) ??
                col;
            } else {
              target = col;
            }
          }
        }
      }

      if (target) targets.push(target);
    }

    // B. Apply Highlight with inline pulsing animation
    if (targets.length === 0) return;

    this.highlightedElements = targets;
    for (const target of targets) {
      const originalAnimation = target.style.animation;
      const originalBoxShadow = target.style.boxShadow;
      const originalZIndex = target.style.zIndex;

      target.style.animation = 'tutorial-pulse 2s ease-in-out infinite';
      target.style.boxShadow = '0 0 20px 5px rgba(111, 180, 255, 0.8)';
      target.style.zIndex = '100';

      target.dataset.tutorialOriginalAnimation = originalAnimation;
      target.dataset.tutorialOriginalBoxShadow = originalBoxShadow;
      target.dataset.tutorialOriginalZIndex = originalZIndex;
    }
  }

  private clearHighlight() {
    for (const el of this.highlightedElements) {
      el.style.animation = el.dataset.tutorialOriginalAnimation || '';
      el.style.boxShadow = el.dataset.tutorialOriginalBoxShadow || '';
      el.style.zIndex = el.dataset.tutorialOriginalZIndex || '';

      delete el.dataset.tutorialOriginalAnimation;
      delete el.dataset.tutorialOriginalBoxShadow;
      delete el.dataset.tutorialOriginalZIndex;
    }
    this.highlightedElements = [];
  }

  private stopGhostHandCue(): void {
    this.ghostHandAbort?.abort();
    this.ghostHandAbort = null;
    this.ghostHandEl?.remove();
    this.ghostHandEl = null;
  }

  private startGhostHandCue(): void {
    this.stopGhostHandCue();

    if (this.isTransitionLocked || this.isAutoAdvancing) {
      return;
    }
    if (this.currentStep.id.startsWith('INTRO_')) {
      return;
    }

    const targets = this.getGhostHandTargets();
    if (targets.length === 0) {
      return;
    }

    const el = document.createElement('div');
    el.className = 'tutorial-ghost-hand';
    el.innerHTML = `
      <div class="tutorial-ghost-hand__icon" aria-hidden="true">👇</div>
      <div class="tutorial-ghost-hand__ring" aria-hidden="true"></div>
    `;
    document.body.appendChild(el);

    this.ghostHandEl = el;
    this.ghostHandAbort = new AbortController();
    void this.runGhostHandLoop(targets, this.ghostHandAbort.signal);
  }

  private getGhostHandTargets(): HTMLElement[] {
    const config = this.currentStep.validation;

    if (this.currentStep.id === 'HELP_RULES_HISTORY') {
      const rulesBtn = document.getElementById(
        'table-rules-button'
      ) as HTMLElement | null;
      const historyBtn = document.getElementById(
        'table-history-button'
      ) as HTMLElement | null;
      return [rulesBtn, historyBtn].filter((el): el is HTMLElement =>
        Boolean(el)
      );
    }

    if (config.type === 'pickup_pile' || config.type === 'facedown_pickup') {
      const takeBtn = document.getElementById(
        'take-button'
      ) as HTMLElement | null;
      const pile = document.getElementById(
        'discard-pile'
      ) as HTMLElement | null;
      const target = takeBtn ?? pile;
      return target ? [target] : [];
    }

    if (config.type === 'play_card' || config.type === 'four_of_kind') {
      if (config.expectedAction?.startsWith('click_index')) {
        const expectedIdxStr = config.expectedAction.split('_').pop() || '0';
        const expectedIdx = Number.parseInt(expectedIdxStr, 10);
        const stackRow = document.querySelector(
          '#my-area .stack-row'
        ) as HTMLElement | null;
        const expectedZone = this.getExpectedIndexClickZone();
        if (!stackRow || !expectedZone || Number.isNaN(expectedIdx)) {
          return [];
        }

        const col = stackRow.children[expectedIdx] as HTMLElement | undefined;
        if (!col) return [];

        if (expectedZone === 'upCards') {
          const up = col.querySelector(
            '.card-container.up-card'
          ) as HTMLElement | null;
          return [up ?? col];
        }
        const down = col.querySelector(
          '.card-container.down-card'
        ) as HTMLElement | null;
        return [down ?? col];
      }

      if (config.cardValue) {
        const expectedValue = String(
          normalizeCardValue(config.cardValue) ?? config.cardValue
        );

        const handRow = document.querySelector(
          '#my-area .hand-row'
        ) as HTMLElement | null;
        if (!handRow) return [];

        const matchingCards = Array.from(
          handRow.querySelectorAll<HTMLElement>('.card-img')
        )
          .filter((img) => img.dataset.value === expectedValue)
          .map((img) => img.closest('.card-container') as HTMLElement | null)
          .filter((el): el is HTMLElement => Boolean(el));

        if (matchingCards.length === 0) return [];

        const desiredCount = config.cardCount ?? 1;
        const pickedCards = matchingCards.slice(0, desiredCount);
        const playBtn = document.getElementById(
          'play-button'
        ) as HTMLElement | null;
        return playBtn ? [...pickedCards, playBtn] : pickedCards;
      }
    }

    return [];
  }

  private async runGhostHandLoop(
    targets: HTMLElement[],
    signal: AbortSignal
  ): Promise<void> {
    if (!this.ghostHandEl) return;

    const icon = this.ghostHandEl.querySelector(
      '.tutorial-ghost-hand__icon'
    ) as HTMLElement | null;
    const ring = this.ghostHandEl.querySelector(
      '.tutorial-ghost-hand__ring'
    ) as HTMLElement | null;

    if (!icon || !ring) return;

    while (!signal.aborted) {
      for (const target of targets) {
        if (signal.aborted) break;

        this.positionGhostHand(target);
        await this.waitForGhost(120, signal);
        if (signal.aborted) break;

        const tapAnim = icon.animate(
          [
            { transform: 'translateY(0px) scale(1)', opacity: 0.9 },
            { transform: 'translateY(10px) scale(0.95)', opacity: 1 },
            { transform: 'translateY(0px) scale(1)', opacity: 0.9 },
          ],
          {
            duration: 700,
            easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
          }
        );
        ring.animate(
          [
            { transform: 'translate(-50%, -50%) scale(0.25)', opacity: 0 },
            { transform: 'translate(-50%, -50%) scale(0.75)', opacity: 0.25 },
            { transform: 'translate(-50%, -50%) scale(1.2)', opacity: 0 },
          ],
          { duration: 700, easing: 'ease-out' }
        );

        await Promise.race([
          new Promise<void>((resolve) => {
            tapAnim.onfinish = () => resolve();
            tapAnim.oncancel = () => resolve();
          }),
          this.waitForGhost(800, signal),
        ]);

        await this.waitForGhost(350, signal);
      }

      await this.waitForGhost(800, signal);
    }
  }

  private positionGhostHand(target: HTMLElement): void {
    if (!this.ghostHandEl) return;

    const rect = target.getBoundingClientRect();
    const x = Math.round(rect.left + rect.width / 2);
    const y = Math.round(rect.top + rect.height / 2);

    // Keep the cue visible even near edges.
    const padding = 14;
    const clampedX = Math.min(
      Math.max(x, padding),
      window.innerWidth - padding
    );
    const clampedY = Math.min(
      Math.max(y, padding),
      window.innerHeight - padding
    );

    this.ghostHandEl.style.left = `${clampedX}px`;
    this.ghostHandEl.style.top = `${clampedY}px`;
  }

  private waitForGhost(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      if (signal.aborted) {
        resolve();
        return;
      }
      const id = window.setTimeout(resolve, ms);
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(id);
          resolve();
        },
        { once: true }
      );
    });
  }

  private getExpectedIndexClickZone(): 'upCards' | 'downCards' | null {
    if (this.currentStep.id.startsWith('UPCARDS_')) return 'upCards';
    if (this.currentStep.id.startsWith('DOWNCARDS_')) return 'downCards';
    return null;
  }

  private seedMoveHistoryDemo() {
    const logPanel = document.getElementById('game-log') as HTMLElement | null;
    if (logPanel) {
      // Keep it hidden so the user learns the Move History button,
      // but reset it in case they opened it earlier in the tutorial.
      logPanel.style.display = 'none';
      logPanel.classList.remove('game-log--minimized');
    }

    const players = [
      { id: 'tutorial-player', name: 'You' },
      { id: 'tutorial-opponent', name: 'The King' },
    ];

    logGameStart();
    logCardPlayed('tutorial-player', [{ value: 8, suit: 'diamonds' }], players);
    logCardPlayed('tutorial-opponent', [{ value: 7, suit: 'spades' }], players);
  }

  // --- CARD SELECTION HELPERS (Match Real Game) ---

  private enforceSelectionRules(clickedCard: HTMLElement): void {
    if (!clickedCard.classList.contains('selected')) {
      return;
    }

    const zone = clickedCard.dataset.zone;
    if (!zone) {
      return;
    }

    const selectedCards = Array.from(
      document.querySelectorAll('.card-img.selected')
    ) as HTMLElement[];

    selectedCards.forEach((card) => {
      if (card === clickedCard) {
        return;
      }

      // Different zone = deselect
      if (card.dataset.zone !== zone) {
        card.classList.remove('selected');
        const container = card.closest('.card-container');
        if (container) container.classList.remove('selected-container');
        return;
      }

      // Up/Down cards: only one at a time
      if (zone === 'upCards' || zone === 'downCards') {
        card.classList.remove('selected');
        const container = card.closest('.card-container');
        if (container) container.classList.remove('selected-container');
        return;
      }

      // Hand cards: must be same value
      if (zone === 'hand') {
        const value = clickedCard.dataset.value;
        if (value && card.dataset.value && card.dataset.value !== value) {
          card.classList.remove('selected');
          const container = card.closest('.card-container');
          if (container) container.classList.remove('selected-container');
        }
      }
    });
  }

  // --- INTERACTION HANDLING ---
  // ... (rest of the file is unchanged)
  private interceptGameControls() {
    // 1. Double Click on Card
    document.addEventListener(
      'dblclick',
      (e) => {
        const target = e.target as HTMLElement;

        // Use the same getSelectableCard logic as the real game
        let selectableCard: HTMLElement | null = null;
        if (
          target.classList.contains('card-img') &&
          target.classList.contains('selectable')
        ) {
          selectableCard = target;
        } else {
          const cardContainer = target.closest('.card-container');
          if (cardContainer) {
            const img = cardContainer.querySelector('.card-img.selectable');
            if (img) selectableCard = img as HTMLElement;
          }
        }

        if (selectableCard) {
          e.stopImmediatePropagation();
          e.preventDefault();

          // Match real game: forceSelectCard + enforceSelectionRules
          selectableCard.classList.add('selected');
          const container = selectableCard.closest('.card-container');
          if (container) {
            container.classList.add('selected-container');
          }

          // Enforce selection rules (same as real game)
          this.enforceSelectionRules(selectableCard);

          // Then validate and play
          this.validateAction('play_card', 'dblclick');
        }
      },
      true
    );

    // 2. Single Click on Card (Selection Toggle) + Play button (delegated)
    document.addEventListener(
      'click',
      (e) => {
        const target = e.target as HTMLElement;

        // Play button: delegated handler (the button is created dynamically by render.ts)
        if (target.closest('#play-button')) {
          // Always block the real game controls (no sockets in tutorial).
          e.stopImmediatePropagation();

          // Intro steps advance on "click anywhere" (including the Play button).
          if (this.currentStep.id.startsWith('INTRO_')) {
            this.nextStep();
            return;
          }

          this.validateAction('play_card', 'button');
          return;
        }

        // Skip if clicking take button (handled by the game-table listener below)
        if (target.id === 'take-button' || target.closest('#take-button')) {
          return;
        }

        // Check for selectable card click
        let selectableCard: HTMLElement | null = null;
        if (
          target.classList.contains('card-img') &&
          target.classList.contains('selectable')
        ) {
          selectableCard = target;
        } else {
          const cardContainer = target.closest('.card-container');
          if (cardContainer) {
            const img = cardContainer.querySelector('.card-img.selectable');
            if (img) selectableCard = img as HTMLElement;
          }
        }

        if (selectableCard) {
          e.stopImmediatePropagation();

          const wasSelected = selectableCard.classList.contains('selected');
          if (wasSelected) {
            // Deselect
            selectableCard.classList.remove('selected');
            const container = selectableCard.closest('.card-container');
            if (container) container.classList.remove('selected-container');
          } else {
            // Select
            selectableCard.classList.add('selected');
            const container = selectableCard.closest('.card-container');
            if (container) container.classList.add('selected-container');

            // Enforce selection rules
            this.enforceSelectionRules(selectableCard);

            // Some tutorial steps expect a direct click on an Up/Down card (no Play button).
            // Because we stop propagation above, we must validate here too.
            if (
              this.currentStep.validation.type === 'play_card' &&
              this.currentStep.validation.expectedAction?.startsWith(
                'click_index'
              )
            ) {
              const container = selectableCard.closest(
                '.card-container'
              ) as HTMLElement | null;
              const idxStr =
                selectableCard.dataset.idx || container?.dataset.idx || '';
              const zone =
                selectableCard.dataset.zone || container?.dataset.zone || '';
              const idx = Number.parseInt(idxStr, 10);
              const expectedZone = this.getExpectedIndexClickZone();
              if (expectedZone && zone === expectedZone && !Number.isNaN(idx)) {
                this.validateAction('play_card', 'click', idx);
              }
            }
          }
        }
      },
      true
    );

    // 3. Pile Click (Pickup)
    // We attach to body/table to catch bubbling events from the pile
    document.getElementById('game-table')?.addEventListener(
      'click',
      (e) => {
        const target = e.target as HTMLElement;
        const pile =
          target.closest('.pile-container') || target.closest('.table-center');

        if (pile || target.id === 'take-button') {
          e.stopImmediatePropagation();
          if (
            this.currentStep.validation.type === 'pickup_pile' ||
            this.currentStep.validation.type === 'facedown_pickup'
          ) {
            this.validateAction(this.currentStep.validation.type);
          }
        }

        // Handle Down/Up card single clicks for specific tutorial steps
        if (target.closest('.card-container')) {
          const container = target.closest('.card-container') as HTMLElement;

          // Check if it's a click on down-cards/up-cards for index-based validation
          if (
            this.currentStep.validation.type === 'play_card' &&
            this.currentStep.validation.expectedAction?.startsWith(
              'click_index'
            )
          ) {
            const idxStr = container.dataset.idx || '';
            const zone = container.dataset.zone || '';
            const idx = Number.parseInt(idxStr, 10);
            const expectedZone = this.getExpectedIndexClickZone();
            if (expectedZone && zone === expectedZone && !Number.isNaN(idx)) {
              this.validateAction('play_card', 'click', idx);
            }
          }

          if (this.currentStep.validation.type === 'facedown_fail') {
            // In the failure step, clicking the card triggers the "fail" state
            this.validateAction('facedown_fail');
          }
        }
      },
      true
    );
  }

  private async validateAction(
    actionType: string,
    source?: string,
    index?: number
  ) {
    if (this.isTransitionLocked) {
      return;
    }

    const validConfig = this.currentStep.validation;

    // --- SCENARIO: PICK UP PILE ---
    if (validConfig.type === 'pickup_pile' && actionType === 'pickup_pile') {
      showToast('Good job!', 'success');
      this.isTransitionLocked = true;
      this.stopGhostHandCue();
      this.nextStep();
      return;
    }

    if (
      validConfig.type === 'facedown_pickup' &&
      actionType === 'facedown_pickup'
    ) {
      showToast('Good job!', 'success');
      this.isTransitionLocked = true;
      this.stopGhostHandCue();
      this.nextStep();
      return;
    }

    // --- SCENARIO: FACE DOWN REVEAL FAIL ---
    if (
      validConfig.type === 'facedown_fail' &&
      actionType === 'facedown_fail'
    ) {
      // When they click the face-down card that fails, we advance to explain the pickup
      this.isTransitionLocked = true;
      this.stopGhostHandCue();
      this.nextStep();
      return;
    }

    // --- SCENARIO: PLAY CARD ---
    if (
      validConfig.type === 'play_card' ||
      validConfig.type === 'four_of_kind'
    ) {
      // A. Handle Up/Down Card Clicks (Single Click)
      if (validConfig.expectedAction?.startsWith('click_index')) {
        const expectedIdxStr =
          validConfig.expectedAction.split('_').pop() || '0';
        const expectedIdx = Number.parseInt(expectedIdxStr, 10);
        if (index !== undefined && index === expectedIdx) {
          // Special demo: show the "too low from Up Cards" pickup flow.
          if (this.currentStep.id === 'UPCARDS_PICKUP_RULE') {
            this.isTransitionLocked = true;
            this.stopGhostHandCue();
            await this.runUpCardPickupRuleDemo(index);
            return;
          }

          showToast('Perfect!', 'success');
          this.isTransitionLocked = true;
          this.stopGhostHandCue();
          this.nextStep();
          return;
        }
      }

      // B. Handle Standard Hand Play (Double Click or Select+Button)
      const selectedElements = Array.from(
        document.querySelectorAll('#my-area .card-img.selected')
      ) as HTMLElement[];
      const selectedIndices = selectedElements
        .map((el) => Number.parseInt(el.dataset.idx || '', 10))
        .filter((idx) => !Number.isNaN(idx))
        .sort((a, b) => a - b);

      if (selectedIndices.length === 0) {
        if (source === 'button') showToast('Select a card first!', 'error');
        return;
      }

      const playedCards = selectedIndices
        .map((i) => this.myHand[i])
        .filter((c) => c);

      // Validation Checks
      if (validConfig.cardValue) {
        const wrongCard = playedCards.some(
          (c) => String(c.value) !== String(validConfig.cardValue)
        );
        if (wrongCard) {
          showToast(`Play the ${validConfig.cardValue}!`, 'error');
          return;
        }
      }

      if (validConfig.cardCount && playedCards.length < validConfig.cardCount) {
        showToast(`Select ALL ${validConfig.cardCount} cards!`, 'error');
        return;
      }

      // SUCCESS! Show toast and animate cards
      showToast('Great!', 'success');
      this.isTransitionLocked = true;
      this.stopGhostHandCue();

      // Animate each selected card to the pile
      void (async () => {
        const wait = (ms: number) =>
          new Promise<void>((resolve) => setTimeout(resolve, ms));

        await this.animateCardsToDrawPile(selectedIndices);

        // Update game state after animation
        playedCards.forEach((card) => this.pile.push(card));
        this.myHand = this.myHand.filter(
          (_, i) => !selectedIndices.includes(i)
        );

        // Clear selections
        document.querySelectorAll('.card-img.selected').forEach((el) => {
          el.classList.remove('selected');
          const container = el.closest('.card-container');
          if (container) container.classList.remove('selected-container');
        });

        // Re-render to show the updated pile with the player's card
        this.updateRender();

        // Show special card effect if applicable
        const topCard = playedCards[playedCards.length - 1];
        const { isSpecialCard, isTwoCard, isFiveCard, isTenCard } =
          await import('../../../utils/cardUtils.js');

        if (isSpecialCard(topCard.value)) {
          const { showCardEvent } = await import('../render.js');
          let effectType = 'regular';

          if (isTwoCard(topCard.value)) effectType = 'two';
          else if (isFiveCard(topCard.value)) effectType = 'five';
          else if (isTenCard(topCard.value)) effectType = 'ten';
          else if (playedCards.length === 4) effectType = 'four';

          // Match the game UI timing: show effect shortly after the cards land,
          // then wait long enough for the player to see it before advancing.
          await wait(200);
          showCardEvent(topCard.value, effectType);
          await wait(2300);
          this.nextStep();
          return;
        }

        await wait(1000);
        this.nextStep();
      })().catch((err) => {
        console.error('[Tutorial] animateCardsToDrawPile failed:', err);
        this.isTransitionLocked = false;
        this.startGhostHandCue();
      });
    }
  }

  private async runUpCardPickupRuleDemo(clickedIdx: number): Promise<void> {
    const clicked = this.upCards[clickedIdx];
    if (!clicked) {
      this.nextStep();
      return;
    }

    const wait = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));

    // 1) Animate the Up Card as if it was played to the pile
    const stackRow = document.querySelector(
      '#my-area .stack-row'
    ) as HTMLElement | null;
    const col = stackRow?.children[clickedIdx] as HTMLElement | undefined;
    const upContainer =
      (col?.querySelector('.card-container.up-card') as HTMLElement | null) ??
      null;

    if (upContainer) {
      const { animatePlayerPlay } = await import('../render.js');
      await animatePlayerPlay(upContainer);
    }

    // 2) Show the card on the pile briefly (and reveal the down card underneath)
    this.upCards[clickedIdx] = null;
    this.pile = [...this.pile, clicked];
    this.updateRender();

    showToast('Too low — you must pick up the pile!', 'info');
    await wait(450);

    // 3) Animate the pickup and move the pile (+ the tried card) into the hand
    const { showCardEvent } = await import('../render.js');
    showCardEvent(null, 'take', 'tutorial-player');

    await wait(650);

    this.myHand = [...this.myHand, ...this.pile];
    this.pile = [];
    this.updateRender();

    await wait(900);
    this.nextStep();
  }

  // --- RENDERING & PARSING ---

  private async animateCardsToDrawPile(
    selectedIndices: number[]
  ): Promise<void> {
    const handRow = document.querySelector('#my-area .hand-row') as HTMLElement;
    if (!handRow) {
      console.warn('[Tutorial] Could not find hand row for animation');
      return;
    }

    const { animatePlayerPlay } = await import('../render.js');

    // Store references to card elements BEFORE any state changes
    const cardElements = selectedIndices
      .map((idx) => handRow.children[idx] as HTMLElement)
      .filter((el) => el);

    if (cardElements.length === 0) {
      console.warn('[Tutorial] No card elements found for animation');
      return;
    }

    // Animate each selected card sequentially
    for (const cardElement of cardElements) {
      animatePlayerPlay(cardElement);
      // Small delay between animations for visual effect
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    // Wait for last animation to complete
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  private async animateOpponentPlay(): Promise<void> {
    // Animate CPU's card flying from their area to the pile
    const { animateCardFromPlayer } = await import('../render.js');

    // Get the cards that were played (last cards in pile that aren't from previous step)
    const currentPile = this.pile;
    if (currentPile.length > 0) {
      // Animate from opponent area (tutorial-opponent)
      await animateCardFromPlayer('tutorial-opponent', [
        currentPile[currentPile.length - 1],
      ]);
    }
  }

  private updateRender() {
    const localGameState = this.buildGameState();
    renderGameState(localGameState, 'tutorial-player');
  }

  private updateInstructionCard() {
    if (!this.cardEl) return;

    const titleEl = this.cardEl.querySelector('.tutorial-card__title');
    const descEl = this.cardEl.querySelector('.tutorial-card__instruction');
    const progEl = this.cardEl.querySelector('.tutorial-card__progress');
    const footerEl = this.cardEl.querySelector('.tutorial-card__footer');

    if (titleEl) titleEl.textContent = this.currentStep.title;
    if (descEl) descEl.innerHTML = this.currentStep.instruction; // Use innerHTML for <strong> tags
    if (progEl)
      progEl.textContent = `${this.currentStepIndex + 1}/${tutorialSteps.length}`;

    // Always remove ALL existing buttons and hints first to ensure a clean state
    footerEl
      ?.querySelectorAll('button, .tutorial-nav-buttons, .tutorial-hint-text')
      ?.forEach((el) => el.remove());

    if (footerEl) {
      // Always show button container
      const btnContainer = document.createElement('div');
      btnContainer.className = 'tutorial-nav-buttons';

      // Add Previous button only if not on first step and not on final step
      if (this.currentStepIndex > 0 && !this.currentStep.showNextButton) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'tutorial-nav-btn tutorial-prev-btn';
        prevBtn.textContent = 'Back';
        prevBtn.addEventListener('click', () => this.previousStep());
        btnContainer.appendChild(prevBtn);
      }

      // Add hint text on all pages except intro and final step
      if (this.currentStepIndex > 0 && !this.currentStep.showNextButton) {
        const hintText = document.createElement('div');
        hintText.className = 'tutorial-hint-text';
        hintText.innerHTML = '<span>✨</span> Complete the action to continue';
        btnContainer.appendChild(hintText);
      }

      // Add Next/Finish button ONLY on final step
      if (this.currentStep.showNextButton && !this.currentStep.isAuto) {
        const isFinalStep = this.currentStep.id === 'COMPLETE';
        const nextBtn = document.createElement('button');
        nextBtn.className = 'tutorial-nav-btn tutorial-next-btn';
        nextBtn.textContent = isFinalStep ? 'Finish' : 'Next';

        nextBtn.addEventListener('click', () => {
          if (isFinalStep) {
            this.finishTutorial();
          } else {
            this.nextStep();
          }
        });

        btnContainer.appendChild(nextBtn);
      }

      footerEl.appendChild(btnContainer);

      // Always add Exit button to bottom-right
      const exitBtn = document.createElement('button');
      exitBtn.className = 'tutorial-skip-btn';
      exitBtn.textContent = 'Exit';
      exitBtn.addEventListener('click', () => this.showExitConfirmation());
      footerEl.appendChild(exitBtn);
    }
  }

  private showExitConfirmation() {
    // Create custom confirmation modal
    const modal = document.createElement('div');
    modal.className = 'tutorial-exit-modal';
    modal.innerHTML = `
      <div class="tutorial-exit-content">
        <p>Are you sure you want to exit the tutorial?</p>
        <div class="tutorial-exit-buttons">
          <button class="tutorial-exit-cancel">Cancel</button>
          <button class="tutorial-exit-confirm">Exit</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    const cancelBtn = modal.querySelector('.tutorial-exit-cancel');
    const confirmBtn = modal.querySelector('.tutorial-exit-confirm');

    cancelBtn?.addEventListener('click', () => modal.remove());
    confirmBtn?.addEventListener('click', () => {
      modal.remove();
      this.finishTutorial();
    });

    // Click outside to cancel
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  private createTutorialUI() {
    // Instruction Card is the only UI we create now
    this.cardEl = document.createElement('div');
    this.cardEl.className = 'tutorial-card';
    this.cardEl.style.opacity = '0'; // Hide during animation
    this.cardEl.innerHTML = `
      <div class="tutorial-card__header">
        <h3 class="tutorial-card__title">Welcome</h3>
        <span class="tutorial-card__progress">Step 1</span>
      </div>
      <p class="tutorial-card__instruction">Loading...</p>
      <div class="tutorial-card__footer">
      </div>
    `;

    this.cardEl
      .querySelector('.tutorial-skip-btn')
      ?.addEventListener('click', () => {
        this.showExitConfirmation();
      });

    document.body.appendChild(this.cardEl);
    this.positionTutorialCard();
  }

  // --- HELPERS ---
  // ... (rest of the file is unchanged)
  private parseCards(cardStrings: string[]): Card[] {
    return cardStrings
      .map((s) => this.parseCard(s))
      .filter((c): c is Card => !!c);
  }

  private parseCard(str: string): Card | null {
    if (!str) return null;

    const suitMap: Record<string, string> = {
      H: 'hearts',
      D: 'diamonds',
      C: 'clubs',
      S: 'spades',
    };
    const rawSuit = str.slice(-1);
    const rawVal = str.slice(0, -1);

    const suit = suitMap[rawSuit];
    let value: string | number = rawVal;

    if (!isNaN(Number(rawVal))) {
      value = Number(rawVal);
    }

    return { value, suit } as Card;
  }
}
