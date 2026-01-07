// public/scripts/tutorial/TutorialController.ts

import { renderGameState } from '../render.js';
import { Card } from '../../../src/shared/types.js';
import { showToast } from '../uiHelpers.js';
import { initializeGameControls } from '../gameControls.js';
import { tutorialSteps, StepConfig } from './tutorialSteps.js';

export class TutorialController {
  private currentStepIndex = 0;
  private currentStep: StepConfig;
  private isAutoAdvancing = false;

  // Game State Containers
  private myHand: Card[] = [];
  private pile: Card[] = [];
  private upCards: (Card | null)[] = [];
  private downCards: (Card | null)[] = [];

  // DOM Elements
  private cardEl: HTMLElement | null = null;
  private highlightedElement: HTMLElement | null = null;

  constructor() {
    this.currentStep = tutorialSteps[0];
    this.createTutorialUI();

    // Initialize controls and intercept interactions
    initializeGameControls();
    this.interceptGameControls();

    // Start the first step
    this.loadStep(0);

    // Handle window resize to fix highlight positions
    window.addEventListener('resize', () => this.updateHighlight());
  }

  // --- STEP MANAGEMENT ---

  private loadStep(index: number) {
    if (this.isAutoAdvancing) return;

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

    // 3. Handle Auto-advancing steps
    if (this.currentStep.isAuto) {
      this.isAutoAdvancing = true;
      this.clearHighlight();
      setTimeout(() => {
        this.isAutoAdvancing = false;
        this.nextStep();
      }, 2000); // Wait 2 seconds for the user to read the opponent's move
      return; // Stop further processing for this step
    }

    // 4. Move Highlight to the correct element (after render completes)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.updateHighlight();
      });
    });

    // 5. Auto-advance for INTRO steps
    if (this.currentStep.id === 'INTRO_WELCOME') {
      this.clearHighlight();
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

  private previousStep() {
    if (this.currentStepIndex > 0) {
      this.loadStep(this.currentStepIndex - 1);
    }
  }

  private previousStep() {
    if (this.currentStepIndex > 0) {
      this.loadStep(this.currentStepIndex - 1);
    }
  }
  // ... rest of constructor and other methods
  private finishTutorial() {
    // Clean up highlights and UI elements
    this.clearHighlight();
    if (this.cardEl) {
      this.cardEl.remove();
      this.cardEl = null;
    }
    window.location.href = '/'; // Return to lobby
  }

  // --- HIGHLIGHT LOGIC ---

  private updateHighlight() {
    this.clearHighlight();

    let target: HTMLElement | null = null;
    const config = this.currentStep.validation;

    if (config.type === 'intro' || this.currentStep.id.startsWith('INTRO_')) {
      return; // No highlight for intro steps
    }

    // A. Find Target based on Step Logic
    if (config.type === 'pickup_pile' || config.type === 'facedown_pickup') {
      target = document.getElementById('take-button');
    } else if (config.type === 'play_card' || config.type === 'four_of_kind') {
      if (config.cardValue) {
        // Find a specific card in the hand
        const handRow = document.querySelector('#my-area .hand-row') as HTMLElement;
        if (handRow) {
          const cardImgs = handRow.querySelectorAll<HTMLElement>('.card-img');
          for (const img of Array.from(cardImgs)) {
            if (img.dataset.value === config.cardValue) {
              target = img.closest('.card-container') as HTMLElement;
              break;
            }
          }
        }
      } else if (config.expectedAction?.startsWith('click_index')) {
        // Highlight a specific Up/Down card
        const stackRow = document.querySelector('#my-area .stack-row') as HTMLElement;
        if (stackRow && stackRow.children.length > 0) {
          target = stackRow.children[0] as HTMLElement;
        }
      }
    }

    // B. Apply Highlight
    if (target) {
      target.classList.add('tutorial-highlight');
      this.highlightedElement = target;
    }
  }

  private clearHighlight() {
    if (this.highlightedElement) {
      this.highlightedElement.classList.remove('tutorial-highlight');
      this.highlightedElement = null;
    }
  }

  // --- INTERACTION HANDLING ---
  // ... (rest of the file is unchanged)
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
      currentPlayerId: this.currentStep.isAuto ? 'tutorial-opponent' : 'tutorial-player',
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

    // Always remove the button first to ensure a clean state
    footerEl?.querySelector('.tutorial-next-btn')?.remove();
    footerEl?.querySelector('.tutorial-prev-btn')?.remove();
    footerEl?.querySelector('.tutorial-nav-buttons')?.remove();

    // Add navigation buttons container
    if (footerEl && (this.currentStepIndex > 0 || (this.currentStep.showNextButton && !this.currentStep.isAuto))) {
      const btnContainer = document.createElement('div');
      btnContainer.className = 'tutorial-nav-buttons';
      
      // Add Previous button (except on first step)
      if (this.currentStepIndex > 0) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'tutorial-nav-btn tutorial-prev-btn';
        prevBtn.textContent = '← Previous';
        prevBtn.addEventListener('click', () => this.previousStep());
        btnContainer.appendChild(prevBtn);
      }
      
      // Add Next/Finish button if needed
      if (this.currentStep.showNextButton && !this.currentStep.isAuto) {
        const isFinalStep = this.currentStep.id === 'COMPLETE';
        const nextBtn = document.createElement('button');
        nextBtn.className = 'tutorial-nav-btn tutorial-next-btn';
        nextBtn.textContent = isFinalStep ? 'Finish' : ('Next →');

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
    }
  }

  private createTutorialUI() {
    // Instruction Card is the only UI we create now
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
  // ... (rest of the file is unchanged)
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
