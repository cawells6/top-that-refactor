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
  private cardEl: HTMLElement | null = null;

  constructor() {
    this.currentStep = tutorialSteps[0];
    this.createTutorialUI();

    // Initialize controls and intercept interactions
    initializeGameControls();
    this.interceptGameControls();

    // Start the first step
    this.loadStep(0);
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
    // If we are in FACEDOWN_FAIL, force the '3H' to show on pile for context
    if (this.currentStep.id === 'FACEDOWN_FAIL') {
      const failCard = this.parseCard('3H');
      if (failCard) this.pile.push(failCard);
    }

    // Generate dummy down cards based on count
    this.downCards = Array(this.currentStep.scenario.downCards)
      .fill(null)
      .map((_) => ({
        value: 2,
        suit: 'hearts',
        back: true,
      }));

    // 2. Update UI
    this.updateRender();
    this.updateInstructionCard();

    // 3. Auto-advance for INTRO steps if they are just "click anywhere"
    if (this.currentStep.id === 'INTRO_WELCOME') {
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
    window.location.href = '/'; // Return to lobby
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
    document.getElementById('game-table')?.addEventListener(
      'click',
      (e) => {
        const target = e.target as HTMLElement;
        if (
          target.closest('.pile') ||
          target.closest('.pile-container') ||
          target.id === 'take-button'
        ) {
          e.stopImmediatePropagation();
          // Decide if this is a pickup action
          if (
            this.currentStep.validation.type === 'pickup_pile' ||
            this.currentStep.validation.type === 'facedown_pickup'
          ) {
            this.validateAction(this.currentStep.validation.type);
          }
        }

        // Handle Down/Up card single clicks for specific steps
        if (target.closest('.card-container')) {
          const container = target.closest('.card-container') as HTMLElement;

          // Check if it's a click on down-cards/up-cards when expected
          if (
            this.currentStep.validation.type === 'play_card' &&
            this.currentStep.validation.expectedAction?.startsWith('click_index')
          ) {
            // Simple index check based on DOM position
            const index = Array.from(
              container.parentElement?.children || []
            ).indexOf(container);
            this.validateAction('play_card', 'click', index);
          }

          // Handle Face-Down Fail logic (clicking a down card to reveal it)
          if (this.currentStep.validation.type === 'facedown_fail') {
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
      // Move to next step (which explains the pickup)
      if (actionType === 'pickup_pile' || source === 'take-button') {
        this.nextStep();
      }
      return;
    }

    // --- SCENARIO: PLAY CARD ---
    if (
      validConfig.type === 'play_card' ||
      validConfig.type === 'four_of_kind'
    ) {
      // A. Handle specific "Click Index" expectations (Up/Down cards)
      if (validConfig.expectedAction?.startsWith('click_index')) {
        // We just assume if they clicked the right zone it's good for tutorial simplicity
        if (index !== undefined && index === 0) {
          // Tutorial usually asks for first card
          this.nextStep();
          return;
        }
      }

      // B. Handle Standard Hand Play
      const selectedElements = document.querySelectorAll('.card-img.selected');
      const selectedIndices: number[] = [];

      selectedElements.forEach((el) => {
        const container = el.closest('.card-container') as HTMLElement;
        if (container) {
          // Find index in myHand (assuming hand container)
          const handContainer = document.getElementById('my-area'); // Hand ID
          if (handContainer && handContainer.contains(container)) {
            const idx = Array.from(handContainer.children).indexOf(container);
            if (idx >= 0) selectedIndices.push(idx);
          }
        }
      });

      // 1. Check if cards are selected
      if (selectedIndices.length === 0) {
        if (source === 'button') showToast('Select a card first!', 'error');
        return;
      }

      const playedCards = selectedIndices.map((i) => this.myHand[i]).filter((c) => c);

      // 2. Validate Card Value
      if (validConfig.cardValue) {
        const wrongCard = playedCards.some(
          (c) => String(c.value) !== String(validConfig.cardValue)
        );
        if (wrongCard) {
          showToast(`Play the ${validConfig.cardValue}!`, 'error');
          return;
        }
      }

      // 3. Validate Count (Multi-play)
      if (validConfig.cardCount && playedCards.length < validConfig.cardCount) {
        showToast(`Select ALL ${validConfig.cardCount} cards!`, 'error');
        return;
      }

      // 4. Validate Four of a Kind - tutorial setup implies 1 card + 3 on pile
      if (validConfig.type === 'four_of_kind') {
        // Config: myHand: ['7D'], pile: ['7H', '7C', '7S']
        // So we only play 1 card
      }

      // Success!
      this.nextStep();
    }
  }

  // --- RENDERING & PARSING ---

  private updateRender() {
    renderGameState(
      {
        players: [
          {
            id: 'me',
            name: 'Recruit',
            hand: this.myHand,
            upCards: this.upCards as Card[],
            downCards: this.downCards as Card[],
            isComputer: false,
          },
          {
            id: 'bot',
            name: 'Drill Sergeant',
            handCount: 5,
            upCards: [null, null, null] as any,
            downCards: [null, null, null] as any,
            isComputer: true,
          },
        ],
        pile: this.pile,
        started: true,
        currentPlayerId: 'me',
        deckSize: 10,
        discardCount: 0,
        lastRealCard:
          this.pile.length > 0 ? this.pile[this.pile.length - 1] : null,
      },
      'me'
    );
  }

  private updateInstructionCard() {
    if (!this.cardEl) return;

    const titleEl = this.cardEl.querySelector('.tutorial-card__title');
    const descEl = this.cardEl.querySelector('.tutorial-card__instruction');
    const progEl = this.cardEl.querySelector('.tutorial-card__progress');

    if (titleEl) titleEl.textContent = this.currentStep.title;
    if (descEl) descEl.textContent = this.currentStep.instruction;
    if (progEl)
      progEl.textContent = `Step ${this.currentStepIndex + 1} of ${tutorialSteps.length}`;
  }

  private createTutorialUI() {
    // 1. Create Overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'tutorial-overlay'; // From tutorial.css
    document.body.appendChild(this.overlay);

    // 2. Create Instruction Card
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
