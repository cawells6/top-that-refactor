// public/scripts/tutorial/TutorialController.ts

import { renderGameState } from '../render.js';
import { Card } from '../../../src/shared/types.js';
import { showToast } from '../uiHelpers.js';
import { initializeGameControls } from '../gameControls.js';
import { tutorialSteps, StepConfig } from './tutorialSteps.js';

export class TutorialController {
  private currentStepIndex = 0;
  private currentStep: StepConfig;

  // Game State Containers
  private myHand: Card[] = [];
  private pile: Card[] = [];
  private upCards: (Card | null)[] = [];
  private downCards: (Card | null)[] = [];

  // DOM Elements
  private overlay: HTMLElement | null = null;
  private spotlight: HTMLElement | null = null;
  private cardEl: HTMLElement | null = null;

  constructor() {
    this.currentStep = tutorialSteps[0];
    this.createTutorialUI();

    // Initialize controls and intercept interactions
    initializeGameControls();
    this.interceptGameControls();

    // Start the first step
    this.loadStep(0);

    // Handle window resize to fix spotlight positions
    window.addEventListener('resize', () => this.updateSpotlight());
  }

  // --- STEP MANAGEMENT ---

  private loadStep(index: number) {
    if (index >= tutorialSteps.length) {
      this.finishTutorial();
      return;
    }

    this.currentStepIndex = index;
    this.currentStep = tutorialSteps[index];

    // 1. Parse Scenario from Config
    this.myHand = this.parseCards(this.currentStep.scenario.myHand);
    this.pile = this.parseCards(this.currentStep.scenario.pile);
    this.upCards = this.parseCards(this.currentStep.scenario.upCards);

    // Special handling for Face-Down cards in the specific failure step
    if (this.currentStep.id === 'FACEDOWN_FAIL') {
      const failCard = this.parseCard('3H');
      if (failCard) this.pile.push(failCard);
    }

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

    // 3. Move Spotlight to the correct element (after render completes)
    // Use requestAnimationFrame + setTimeout to ensure DOM has painted
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.updateSpotlight();
        console.log('[Tutorial] Spotlight update for step:', this.currentStep.id);
      }, 100);
    });

    // 4. Auto-advance for INTRO steps if they are just "click anywhere"
    if (this.currentStep.id === 'INTRO_WELCOME') {
      // Just highlight the whole center area loosely or nothing
      this.clearSpotlight();
      document.addEventListener('click', this.handleGlobalClick, { once: true });
    }
  }

  private handleGlobalClick = () => {
    if (this.currentStep.id === 'INTRO_WELCOME') {
      this.nextStep();
    }
  };

  private nextStep() {
    this.loadStep(this.currentStepIndex + 1);
  }

  private finishTutorial() {
    // Clean up spotlight
    if (this.spotlight) {
      this.spotlight.remove();
      this.spotlight = null;
    }
    // Clean up overlay and card
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.cardEl) {
      this.cardEl.remove();
      this.cardEl = null;
    }
    window.location.href = '/'; // Return to lobby
  }

  // --- SPOTLIGHT LOGIC (The "Dim and Highlight" System) ---

  private updateSpotlight() {
    if (!this.spotlight) return;

    let target: HTMLElement | null = null;
    const config = this.currentStep.validation;

    // Skip spotlight for intro steps
    if (config.type === 'intro') {
      this.clearSpotlight();
      return;
    }

    // A. Find Target based on Step Logic
    if (config.type === 'pickup_pile' || config.type === 'facedown_pickup') {
      // Highlight the Draw pile (right side)
      target = document.querySelector('.pile-group--discard .pile-cards') as HTMLElement;
      if (!target) {
        target = document.querySelector('#discard-pile') as HTMLElement;
      }
    } else if (config.type === 'play_card' || config.type === 'four_of_kind') {
      // Highlight a specific card in Hand, UpCards, or DownCards
      if (config.cardValue) {
        // Find specific value in hand (e.g. '3')
        // Cards are in #my-area .hand-row
        const handRow = document.querySelector('#my-area .hand-row') as HTMLElement;
        if (handRow) {
          // Find the card with matching data-value
          const cardImgs = handRow.querySelectorAll('.card-img');
          for (const img of Array.from(cardImgs)) {
            const imgEl = img as HTMLElement;
            if (imgEl.dataset.value === config.cardValue) {
              target = imgEl.closest('.card-container') as HTMLElement;
              break;
            }
          }
          
          // Fallback: if no match, highlight first card
          if (!target && handRow.children[0]) {
            target = handRow.children[0] as HTMLElement;
          }
        }
      } else if (config.expectedAction?.startsWith('click_index')) {
        // Highlight specific Up/Down card slot
        const stackRow = document.querySelector('#my-area .stack-row') as HTMLElement;
        if (stackRow && stackRow.children[0]) {
          target = stackRow.children[0] as HTMLElement;
        }
      }
    }

    // B. Apply Position
    if (target) {
      const rect = target.getBoundingClientRect();
      const zoom = window.devicePixelRatio || 1;
      const visualViewport = (window as any).visualViewport;
      
      console.log('[Tutorial] 🎯 Spotlight target found:', target);
      console.log('[Tutorial] 📍 Raw rect:', rect);
      console.log('[Tutorial] 🖥️ Window dimensions:', {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight,
        devicePixelRatio: zoom,
        documentElement: {
          clientWidth: document.documentElement.clientWidth,
          clientHeight: document.documentElement.clientHeight,
        },
        visualViewport: visualViewport ? {
          width: visualViewport.width,
          height: visualViewport.height,
          scale: visualViewport.scale,
        } : 'not supported'
      });
      console.log('[Tutorial] 🎨 Target styles:', {
        offsetParent: target.offsetParent,
        transform: window.getComputedStyle(target).transform,
        position: window.getComputedStyle(target).position,
      });
      
      // Check if game board is scaled/transformed
      const gameTable = document.getElementById('game-table');
      if (gameTable) {
        const tableTransform = window.getComputedStyle(gameTable).transform;
        const tableRect = gameTable.getBoundingClientRect();
        console.log('[Tutorial] 🎲 Game table:', {
          transform: tableTransform,
          rect: tableRect,
          width: tableRect.width,
        });
      }
      
      // CRITICAL: If rect position looks absurd (way beyond visible viewport), don't apply it
      const viewportWidth = visualViewport?.width || document.documentElement.clientWidth;
      const viewportHeight = visualViewport?.height || document.documentElement.clientHeight;
      
      if (rect.left > viewportWidth * 2 || rect.top > viewportHeight * 2) {
        console.error('[Tutorial] ❌ Target position is way off-screen!');
        console.error('[Tutorial] Expected viewport:', viewportWidth, 'x', viewportHeight);
        console.error('[Tutorial] Card position:', rect.left, ',', rect.top);
        console.error('[Tutorial] This suggests a zoom or transform issue. Hiding spotlight.');
        this.clearSpotlight();
        return;
      }
      
      // Add some padding
      const padding = 10;
      this.spotlight.style.position = 'fixed'; // Ensure it's fixed
      this.spotlight.style.display = 'block';
      this.spotlight.style.opacity = '1';
      this.spotlight.style.top = `${rect.top - padding}px`;
      this.spotlight.style.left = `${rect.left - padding}px`;
      this.spotlight.style.width = `${rect.width + padding * 2}px`;
      this.spotlight.style.height = `${rect.height + padding * 2}px`;
      
      console.log('[Tutorial] ✅ Applied spotlight styles:', {
        top: this.spotlight.style.top,
        left: this.spotlight.style.left,
        width: this.spotlight.style.width,
        height: this.spotlight.style.height,
        display: this.spotlight.style.display,
        opacity: this.spotlight.style.opacity
      });
    } else {
      console.warn('[Tutorial] No spotlight target found for step:', this.currentStep.id, 'config:', config);
      this.clearSpotlight();
    }
  }

  private clearSpotlight() {
    if (this.spotlight) {
      this.spotlight.style.opacity = '0';
      this.spotlight.style.display = 'none';
    }
  }

  // --- INTERACTION HANDLING ---

  private interceptGameControls() {
    // 1. Play Button Click
    const playButton = document.getElementById('play-button');
    if (playButton) {
      playButton.addEventListener(
        'click',
        (e) => {
          e.stopImmediatePropagation();
          this.validateAction('play_card', 'button');
        },
        true
      );
    }

    // 2. Double Click on Card
    document.addEventListener(
      'dblclick',
      (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.card-container')) {
          e.stopImmediatePropagation();
          this.validateAction('play_card', 'dblclick');
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

        // Handle Down/Up card single clicks
        if (target.closest('.card-container')) {
          const container = target.closest('.card-container') as HTMLElement;

          // Check if it's a click on down-cards/up-cards
          if (
            this.currentStep.validation.type === 'play_card' &&
            this.currentStep.validation.expectedAction?.startsWith('click_index')
          ) {
            // Determine index relative to parent
            const index = Array.from(
              container.parentElement?.children || []
            ).indexOf(container);
            this.validateAction('play_card', 'click', index);
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

  private validateAction(actionType: string, source?: string, index?: number) {
    const validConfig = this.currentStep.validation;

    // --- SCENARIO: PICK UP PILE ---
    if (validConfig.type === 'pickup_pile' && actionType === 'pickup_pile') {
      showToast('Good job! You picked up the pile.', 'info');
      this.nextStep();
      return;
    }

    if (
      validConfig.type === 'facedown_pickup' &&
      actionType === 'facedown_pickup'
    ) {
      showToast('Recovered! Now continue playing.', 'info');
      this.nextStep();
      return;
    }

    // --- SCENARIO: FACE DOWN REVEAL FAIL ---
    if (validConfig.type === 'facedown_fail' && actionType === 'facedown_fail') {
      // When they click the face-down card that fails, we advance to explain the pickup
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
        if (index !== undefined && index === 0) {
          this.nextStep();
          return;
        }
      }

      // B. Handle Standard Hand Play (Double Click or Select+Button)
      const selectedElements = document.querySelectorAll('.card-img.selected');
      const selectedIndices: number[] = [];

      selectedElements.forEach((el) => {
        const container = el.closest('.card-container') as HTMLElement;
        if (container) {
          const handContainer = document.getElementById('my-area');
          if (handContainer && handContainer.contains(container)) {
            const idx = Array.from(handContainer.children).indexOf(container);
            if (idx >= 0) selectedIndices.push(idx);
          }
        }
      });

      if (selectedIndices.length === 0) {
        if (source === 'button') showToast('Select a card first!', 'error');
        return;
      }

      const playedCards = selectedIndices.map((i) => this.myHand[i]).filter((c) => c);

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

      this.nextStep();
    }
  }

  // --- RENDERING & PARSING ---

  private updateRender() {
    const localGameState = {
      started: true,
      currentPlayerId: 'tutorial-player',
      players: [
        {
          id: 'tutorial-player',
          name: 'You',
          handCount: this.myHand.length,
          hand: this.myHand,
          upCards: this.upCards,
          downCards: this.downCards,
          isComputer: false
        },
        {
          id: 'tutorial-opponent',
          name: 'The King',
          handCount: 6,
          hand: [],
          upCards: [
            { suit: 'hidden', value: 'BACK', back: true },
            { suit: 'hidden', value: 'BACK', back: true },
            { suit: 'hidden', value: 'BACK', back: true }
          ],
          downCards: [
            { suit: 'hidden', value: 'BACK', back: true },
            { suit: 'hidden', value: 'BACK', back: true },
            { suit: 'hidden', value: 'BACK', back: true }
          ],
          isComputer: true
        }
      ],
      pile: this.pile,
      deckSize: 20,
      discardCount: 0,
      lastRealCard: this.pile.length > 0 ? this.pile[this.pile.length - 1] : null
    };

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
      progEl.textContent = `Step ${this.currentStepIndex + 1} of ${tutorialSteps.length}`;

    // Add "Next" button for intro/explanation steps
    if (footerEl && this.currentStep.id === 'INTRO_WELCOME') {
      // Remove existing button first to prevent duplicates
      footerEl.querySelector('.tutorial-next-btn')?.remove();
      
      const nextBtn = document.createElement('button');
      nextBtn.className = 'tutorial-next-btn';
      nextBtn.textContent = 'Next';
      nextBtn.addEventListener('click', () => this.nextStep());
      footerEl.appendChild(nextBtn);
      
      console.log('[Tutorial] Next button added for INTRO_WELCOME');
    } else if (footerEl) {
      // Remove next button if it exists
      footerEl.querySelector('.tutorial-next-btn')?.remove();
    }
  }

  private createTutorialUI() {
    // 1. Create Overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'tutorial-overlay';
    document.body.appendChild(this.overlay);

    // 2. Create Spotlight
    this.spotlight = document.createElement('div');
    this.spotlight.className = 'tutorial-spotlight';
    this.spotlight.style.opacity = '0';
    this.spotlight.style.display = 'none';
    document.body.appendChild(this.spotlight);
    console.log('[Tutorial] Spotlight created:', this.spotlight);

    // 3. Create Instruction Card
    this.cardEl = document.createElement('div');
    this.cardEl.className = 'tutorial-card';
    this.cardEl.innerHTML = `
      <div class="tutorial-card__header">
        <h3 class="tutorial-card__title">Welcome</h3>
        <button class="tutorial-skip-btn">Exit Tutorial</button>
      </div>
      <p class="tutorial-card__instruction">Loading...</p>
      <div class="tutorial-card__footer">
        <span class="tutorial-card__progress">Step 1</span>
      </div>
    `;

    this.cardEl.querySelector('.tutorial-skip-btn')?.addEventListener('click', () => {
      if (confirm('Exit tutorial?')) this.finishTutorial();
    });

    document.body.appendChild(this.cardEl);
  }

  // --- HELPERS ---

  private parseCards(cardStrings: string[]): Card[] {
    return cardStrings.map((s) => this.parseCard(s)).filter((c): c is Card => !!c);
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
