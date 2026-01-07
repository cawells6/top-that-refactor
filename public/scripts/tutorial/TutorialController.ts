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

    // Start the first step with dealing animation (fire and forget with error handling)
    this.startTutorialWithAnimation().catch(err => {
      console.error('[Tutorial] Animation failed, falling back to direct load:', err);
      // Fallback: just load step 0 directly if animation fails
      this.loadStep(0);
    });

    // Handle window resize to fix highlight positions
    window.addEventListener('resize', () => this.updateHighlight());
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
    renderGameState(skeletonState, 'tutorial-player', null, { skeletonMode: true });

    // Wait a frame to ensure DOM is updated
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)));

    // Play simplified dealing animation
    await this.playTutorialDealAnimation();

    // Now load step 0 normally
    this.loadStep(0);
  }

  private async playTutorialDealAnimation(): Promise<void> {
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const DEAL_INTERVAL = 100;
    const PHASE_PAUSE = 400;

    const playSource = document.getElementById('deck-pile');
    if (!playSource) return;

    const playRect = playSource.getBoundingClientRect();

    // Phase A: Down cards (just show them)
    for (let i = 0; i < 3; i++) {
      const target = document.querySelector(`#my-area .stack-row > div:nth-child(${i+1})`) as HTMLElement;
      if (target) {
        this.animateTutorialCard(playRect, target, null);
        await wait(DEAL_INTERVAL);
      }
    }
    await wait(PHASE_PAUSE);

    // Phase B: Up cards
    for (let i = 0; i < 3; i++) {
      const upCard = this.upCards[i];
      const target = document.querySelector(`#my-area .stack-row > div:nth-child(${i+1})`) as HTMLElement;
      if (target && upCard) {
        this.animateTutorialCard(playRect, target, upCard);
        await wait(DEAL_INTERVAL);
      }
    }
    await wait(PHASE_PAUSE);

    // Phase C: Hand cards
    for (let i = 0; i < this.myHand.length; i++) {
      const handRow = document.querySelector('#my-area .hand-row') as HTMLElement;
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
    const allCards = document.querySelectorAll('.card-img, .card-ability-icon, .hand-count-badge, .card-back-logo');
    allCards.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.visibility = 'visible';
      htmlEl.style.opacity = '1';
    });

    // Force complete re-render without skeleton mode
    const finalState = this.buildGameState();
    const { renderGameState } = await import('../render.js');
    renderGameState(finalState, 'tutorial-player', null, { skeletonMode: false });

    await wait(500);
  }

  private async animateTutorialCard(playRect: DOMRect, target: HTMLElement, cardData: Card | null): Promise<void> {
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
      currentPlayerId: this.currentStep.isAuto ? 'tutorial-opponent' : 'tutorial-player',
      players: [
        {
          id: 'tutorial-player',
          name: 'You',
          handCount: this.myHand.length,
          hand: this.myHand,
          upCards: this.upCards,
          downCards: this.downCards.filter((c): c is Card => c !== null), // Filter out nulls
          downCount: this.downCards.length,
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
          downCards: [],
          downCount: 3,
          isComputer: true
        }
      ],
      pile: this.pile,
      deckSize: 20,
      discardCount: 0,
      lastRealCard: this.pile.length > 0 ? this.pile[this.pile.length - 1] : null
    };
  }

  // --- STEP MANAGEMENT ---

  private loadStep(index: number, direction: 'forward' | 'backward' = 'forward') {
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
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.selected-container').forEach(el => el.classList.remove('selected-container'));

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
    
    // Show tutorial card if it was hidden during animation
    if (this.cardEl) {
      this.cardEl.style.opacity = '1';
    }

    // 3. Handle Auto-advancing steps (only when moving forward)
    if (this.currentStep.isAuto && direction === 'forward') {
      this.isAutoAdvancing = true;
      this.clearHighlight();
      
      // Animate opponent's card playing
      this.animateOpponentPlay().then(() => {
        setTimeout(() => {
          this.isAutoAdvancing = false;
          this.nextStep();
        }, 2000); // Wait 2 seconds for the user to read the opponent's move
      });
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
      // Wait for user click (no timer - they read at their own pace)
      const clickHandler = (e: MouseEvent) => {
        document.removeEventListener('click', clickHandler);
        this.nextStep();
      };
      document.addEventListener('click', clickHandler);
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
      // Remove any global click listeners before going back
      document.removeEventListener('click', this.handleGlobalClick);
      this.loadStep(this.currentStepIndex - 1, 'backward');
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

    if (this.currentStep.id.startsWith('INTRO_')) {
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

    // B. Apply Highlight with inline pulsing animation
    if (target) {
      this.highlightedElement = target;
      // Store original styles
      const originalAnimation = target.style.animation;
      const originalBoxShadow = target.style.boxShadow;
      const originalZIndex = target.style.zIndex;
      
      // Apply pulsing glow
      target.style.animation = 'tutorial-pulse 2s ease-in-out infinite';
      target.style.boxShadow = '0 0 20px 5px rgba(111, 180, 255, 0.8)';
      target.style.zIndex = '100';
      
      // Store originals for restoration
      target.dataset.tutorialOriginalAnimation = originalAnimation;
      target.dataset.tutorialOriginalBoxShadow = originalBoxShadow;
      target.dataset.tutorialOriginalZIndex = originalZIndex;
    }
  }

  private clearHighlight() {
    if (this.highlightedElement) {
      // Restore original styles
      const el = this.highlightedElement;
      el.style.animation = el.dataset.tutorialOriginalAnimation || '';
      el.style.boxShadow = el.dataset.tutorialOriginalBoxShadow || '';
      el.style.zIndex = el.dataset.tutorialOriginalZIndex || '';
      
      // Clean up data attributes
      delete el.dataset.tutorialOriginalAnimation;
      delete el.dataset.tutorialOriginalBoxShadow;
      delete el.dataset.tutorialOriginalZIndex;
      this.highlightedElement = null;
    }
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
        
        // Use the same getSelectableCard logic as the real game
        let selectableCard: HTMLElement | null = null;
        if (target.classList.contains('card-img') && target.classList.contains('selectable')) {
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

    // 3. Single Click on Card (Selection Toggle)
    document.addEventListener(
      'click',
      (e) => {
        const target = e.target as HTMLElement;
        
        // Skip if clicking play/take buttons
        if (target.closest('#play-button') || target.id === 'take-button' || target.closest('#take-button')) {
          return;
        }
        
        // Check for selectable card click
        let selectableCard: HTMLElement | null = null;
        if (target.classList.contains('card-img') && target.classList.contains('selectable')) {
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
          }
        }
      },
      true
    );

    // 4. Pile Click (Pickup)
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

  private async validateAction(actionType: string, source?: string, index?: number) {
    const validConfig = this.currentStep.validation;

    // --- SCENARIO: PICK UP PILE ---
    if (validConfig.type === 'pickup_pile' && actionType === 'pickup_pile') {
      showToast('Good job!', 'success');
      this.nextStep();
      return;
    }

    if (
      validConfig.type === 'facedown_pickup' &&
      actionType === 'facedown_pickup'
    ) {
      showToast('Good job!', 'success');
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
          showToast('Perfect!', 'success');
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
          // Find the hand-row specifically (not just my-area)
          const handRow = document.querySelector('#my-area .hand-row') as HTMLElement;
          if (handRow && handRow.contains(container)) {
            const idx = Array.from(handRow.children).indexOf(container);
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

      // SUCCESS! Show toast and animate cards
      showToast('Great!', 'success');
      
      // Animate each selected card to the pile
      this.animateCardsToDrawPile(selectedIndices).then(async () => {
        // Update game state after animation
        playedCards.forEach(card => this.pile.push(card));
        this.myHand = this.myHand.filter((_, i) => !selectedIndices.includes(i));
        
        // Clear selections
        document.querySelectorAll('.card-img.selected').forEach(el => {
          el.classList.remove('selected');
          const container = el.closest('.card-container');
          if (container) container.classList.remove('selected-container');
        });
        
        // Re-render to show the updated pile with the player's card
        this.updateRender();
        
        // Show special card effect if applicable
        const topCard = playedCards[playedCards.length - 1];
        const { isSpecialCard, isTwoCard, isFiveCard, isTenCard } = await import('../../../utils/cardUtils.js');
        
        if (isSpecialCard(topCard.value)) {
          const { showCardEvent } = await import('../render.js');
          let effectType = 'regular';
          
          if (isTwoCard(topCard.value)) effectType = 'two';
          else if (isFiveCard(topCard.value)) effectType = 'five';
          else if (isTenCard(topCard.value)) effectType = 'ten';
          else if (playedCards.length === 4) effectType = 'four';
          
          // Show effect after small delay
          setTimeout(() => {
            showCardEvent(topCard.value, effectType);
          }, 200);
          
          // Wait longer for special card effect to display
          setTimeout(() => {
            this.nextStep();
          }, 2500);
        } else {
          // Regular card - wait 1 second before advancing
          setTimeout(() => {
            this.nextStep();
          }, 1000);
        }
      });
    }
  }

  // --- RENDERING & PARSING ---

  private async animateCardsToDrawPile(selectedIndices: number[]): Promise<void> {
    const handRow = document.querySelector('#my-area .hand-row') as HTMLElement;
    if (!handRow) {
      console.warn('[Tutorial] Could not find hand row for animation');
      return;
    }

    const { animatePlayerPlay } = await import('../render.js');
    
    // Store references to card elements BEFORE any state changes
    const cardElements = selectedIndices
      .map(idx => handRow.children[idx] as HTMLElement)
      .filter(el => el);
    
    if (cardElements.length === 0) {
      console.warn('[Tutorial] No card elements found for animation');
      return;
    }
    
    // Animate each selected card sequentially
    for (const cardElement of cardElements) {
      animatePlayerPlay(cardElement);
      // Small delay between animations for visual effect
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    // Wait for last animation to complete
    await new Promise(resolve => setTimeout(resolve, 600));
  }

  private async animateOpponentPlay(): Promise<void> {
    // Animate CPU's card flying from their area to the pile
    const { animateCardFromPlayer } = await import('../render.js');
    
    // Get the cards that were played (last cards in pile that aren't from previous step)
    const currentPile = this.pile;
    if (currentPile.length > 0) {
      // Animate from opponent area (tutorial-opponent)
      await animateCardFromPlayer('tutorial-opponent', [currentPile[currentPile.length - 1]]);
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
    footerEl?.querySelectorAll('button, .tutorial-nav-buttons, .tutorial-hint-text')?.forEach(el => el.remove());
    
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

    this.cardEl.querySelector('.tutorial-skip-btn')?.addEventListener('click', () => {
      this.showExitConfirmation();
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
