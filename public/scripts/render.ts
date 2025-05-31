import { Card as CardType, GameStateData, ClientStatePlayer } from '../../src/shared/types.js'; // Corrected import path
import { enhanceCardImage } from './cards-enhanced.js'; // Import enhanced card loader
import { enhanceCardImage } from './cards-enhanced.js'; // Import enhanced card loader

// Convert {value:'A',suit:'hearts'} → "AH", 10→"0"
export function code(card: CardType): string {
  if (
    card.value === null ||
    card.value === undefined ||
    card.suit === null ||
    card.suit === undefined
  ) {
    return 'ERR';
  }
  const v = String(card.value).toUpperCase() === '10' ? '0' : String(card.value).toUpperCase();
  const suitMap: { [key: string]: string } = {
    hearts: 'H',
    diamonds: 'D',
    clubs: 'C',
    spades: 'S',
  };
  const s = suitMap[card.suit.toLowerCase() as keyof typeof suitMap];
  if (!s) return 'ERR';
  return v + s;
}

// Produce one <div class="card-container"><img class="card-img" …></div>
export function cardImg(
  card: CardType,
  selectable?: boolean,
  onLoad?: (img: HTMLImageElement) => void
): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'card-container';

  const img = new Image();
  img.className = 'card-img';
  img.style.visibility = 'hidden';
  
  const cardCode = card.back ? 'back' : code(card);
  console.log(`Creating card image: ${card.back ? 'back' : `${card.value} of ${card.suit}`}, code=${cardCode}`);
  
  // Try using direct URLs instead of the proxy
  const imgSrc = `https://deckofcardsapi.com/static/img/${cardCode}.png`;
  console.log(`Card image src: ${imgSrc}`);
  
  img.src = imgSrc;
  img.alt = card.back ? 'Card back' : `${card.value} of ${card.suit}`;
  
  // Set up onload and error handling
  img.onload = () => {
    img.style.visibility = 'visible';
    console.log(`✅ Card loaded successfully: ${img.src}`);        if (onLoad) onLoad(img);
  };
  
  // Improved error handling with retry
  img.onerror = () => {
    console.error(`⚠️ Failed to load card image: ${img.src}`);
    
    // Try an alternative URL with slight delay
    setTimeout(() => {
      // Try different source paths as fallback
      const fallbacks = [
        `/cards-api/static/img/${cardCode}.png`, // Try proxy
        `https://raw.githubusercontent.com/hayeah/playing-cards-assets/master/png/${cardCode}.png` // GitHub hosted fallback
      ];
      
      // If we've already tried all fallbacks, show a placeholder
      const currentSrcIndex = fallbacks.indexOf(img.src);
      
      if (currentSrcIndex < fallbacks.length - 1) {
        console.log(`🔄 Trying alternative source: ${fallbacks[currentSrcIndex + 1]}`);
        img.src = fallbacks[currentSrcIndex + 1];
      } else {
        // Create a fallback visual representation
        console.warn(`⚠️ All image sources failed for ${cardCode}, using fallback`);
        img.style.visibility = 'visible';
        container.style.border = '1px solid #ccc';
        container.style.borderRadius = '8px';
        container.style.backgroundColor = 'white';
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.flexDirection = 'column';
        container.style.padding = '5px';
        
        // Display the value and suit as text
        if (!card.back) {
          const valueDisplay = document.createElement('div');
          valueDisplay.style.fontSize = '18px';
          valueDisplay.style.fontWeight = 'bold';
          valueDisplay.style.color = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : 'black';
          valueDisplay.textContent = String(card.value);
          
          const suitDisplay = document.createElement('div');
          suitDisplay.style.fontSize = '24px';
          suitDisplay.style.color = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : 'black';
          const suitMap: Record<string, string> = {
            'hearts': '♥',
            'diamonds': '♦',
            'clubs': '♣',
            'spades': '♠'
          };
          suitDisplay.textContent = suitMap[card.suit as keyof typeof suitMap] || '';
          
          container.appendChild(valueDisplay);
          container.appendChild(suitDisplay);
        } else {
          // For card backs
          container.textContent = '🂠';
          container.style.fontSize = '32px';
          container.style.color = '#444';
        }
        
        if (onLoad) onLoad(img);
      }
    }, 500); // Delay retry to avoid rapid retries
  };

  if (selectable) {
    img.classList.add('selectable');
    img.style.touchAction = 'manipulation';
    container.addEventListener('click', () => {
      img.classList.toggle('selected');
      container.classList.toggle('selected-container', img.classList.contains('selected'));
    });
  }

  container.appendChild(img);
  return container;
}

/**
 * Main render function to update the entire game view
 * @param {GameStateData} gameState - Full game state from server
 */
export function renderGameState(gameState: GameStateData, localPlayerId: string | null): void {
  // Corrected selectors to use IDs from index.html
  const slotTop = document.getElementById('opponent-area-top') as HTMLElement | null;
  const slotBottom = document.getElementById('player-area-bottom') as HTMLElement | null;
  const slotLeft = document.getElementById('opponent-area-left') as HTMLElement | null;
  const slotRight = document.getElementById('opponent-area-right') as HTMLElement | null;

  if (!gameState || !gameState.players) {
    console.warn('Render: No game state or players to render.');
    // Potentially hide or clear game board elements if state is invalid
    if (slotTop) slotTop.innerHTML = '';
    if (slotBottom) slotBottom.innerHTML = '';
    if (slotLeft) slotLeft.innerHTML = '';
    if (slotRight) slotRight.innerHTML = '';
    return;
  }

  // Clear player areas and set light green background
  const lightGreen = '#137a4b'; // Lighter shade of lobby green (updated)
  if (slotTop) {
    slotTop.innerHTML = '';
    slotTop.style.backgroundColor = lightGreen;
  }
  if (slotBottom) {
    slotBottom.innerHTML = '';
    slotBottom.style.backgroundColor = lightGreen;
  }
  if (slotLeft) {
    slotLeft.innerHTML = '';
    slotLeft.style.backgroundColor = lightGreen;
  }
  if (slotRight) {
    slotRight.innerHTML = '';
    slotRight.style.backgroundColor = lightGreen;
  }
  document.querySelectorAll('.player-area.active').forEach((el) => el.classList.remove('active'));

  const players = gameState.players;
  const meIdx = localPlayerId ? players.findIndex((p) => p.id === localPlayerId) : -1;

  // --- NEW: Rotate players array so local player is always index 0 ---
  let rotatedPlayers: ClientStatePlayer[] = [];
  if (meIdx >= 0) {
    rotatedPlayers = players.slice(meIdx).concat(players.slice(0, meIdx));
  } else {
    rotatedPlayers = players.slice();
  }

  // --- NEW: Only show player boards for actual players ---
  const seatOrder = ['bottom', 'right', 'top', 'left']; // 6, 3, 12, 9 o'clock positions

  seatOrder.forEach((seat, idx) => {
    const player = rotatedPlayers[idx];
    if (!player) return; // Don't show empty slots

    let panel = document.createElement('div');
    panel.className = 'player-area';
    panel.style.backgroundColor = 'transparent';
    panel.style.margin = '10px';
    panel.style.padding = '5px';

    if (player.isComputer) panel.classList.add('computer-player');
    panel.dataset.playerId = player.id;
    if (seat === 'bottom' && player.id === localPlayerId) panel.id = 'my-area';
    if (player.disconnected) panel.classList.add('disconnected');
    if (player.id === gameState.currentPlayerId) {
      panel.classList.add('active');
    }
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.alignItems = 'center';
    if (seat === 'left') panel.classList.add('rotate-right');
    if (seat === 'right') panel.classList.add('rotate-left');

    // Name header - blue banner with gold letters, full width of player board
    const nameHeader = document.createElement('div');
    nameHeader.className =
      'player-name-header ' + (player.isComputer ? 'player-cpu' : 'player-human');
    nameHeader.style.width = '100%';
    nameHeader.style.textAlign = 'center';
    nameHeader.style.marginBottom = '5px';
    nameHeader.style.backgroundColor = '#1e3a8a'; // Blue background
    nameHeader.style.color = '#fbbf24'; // Gold text
    nameHeader.style.padding = '8px 12px';
    nameHeader.style.borderRadius = '6px';
    nameHeader.style.fontWeight = 'bold';
    nameHeader.style.border = '2px solid #1e40af';
    nameHeader.innerHTML = `<span class="player-name-text">${player.name || player.id}${player.disconnected ? " <span class='player-role'>(Disconnected)</span>" : ''}</span>`;
    panel.appendChild(nameHeader);

    // Hand row (for all players) - TOP ROW, FACE UP
    const handRow = document.createElement('div');
    if (player.id === localPlayerId) handRow.id = 'my-hand';
    handRow.className = player.id === localPlayerId ? 'hand' : 'opp-hand';
    handRow.style.display = 'flex';
    handRow.style.gap = '5px';
    handRow.style.marginBottom = '5px';

    if (player.id === localPlayerId) {
      // Local player: show hand cards face up, always 3 slots
      for (let i = 0; i < 3; i++) {
        const hasCard = player.hand && player.hand.length > i && player.hand[i];
        if (hasCard) {
          const card = player.hand![i];
          const canInteract = gameState.currentPlayerId === localPlayerId;
          const cardElement = cardImg(card, canInteract);
          const imgEl = cardElement.querySelector('.card-img');
          if (imgEl && imgEl instanceof HTMLImageElement) imgEl.dataset.idx = String(i);
          handRow.appendChild(cardElement);
        } else {
          // Empty slot - show placeholder
          const emptySlot = document.createElement('div');
          emptySlot.className = 'card-container empty-card-slot';
          emptySlot.innerHTML = '<div class="empty-card-placeholder"></div>';
          handRow.appendChild(emptySlot);
        }
      }
    } else {
      // Opponents: show card backs (hidden cards)
      const handContainer = document.createElement('div');
      handContainer.className = 'cpu-hand-container';
      handContainer.style.display = 'flex';
      handContainer.style.gap = '5px';

      for (let i = 0; i < 3; i++) {
        if ((player.handCount || 0) > 0 && i < (player.handCount || 0)) {
          // Show card back if they have cards
          const backCard: CardType = { back: true, value: 'A', suit: 'hearts' };
          const cardEl = cardImg(backCard, false);
          handContainer.appendChild(cardEl);
        } else {
          // Empty slot
          const emptySlot = document.createElement('div');
          emptySlot.className = 'card-container empty-card-slot';
          emptySlot.innerHTML = '<div class="empty-card-placeholder"></div>';
          handContainer.appendChild(emptySlot);
        }
      }

      // Add hand count badge on the last card if handCount > 0
      if ((player.handCount || 0) > 0) {
        const lastCard = handContainer.children[
          Math.min(2, (player.handCount || 1) - 1)
        ] as HTMLElement;
        if (lastCard) {
          const badge = document.createElement('div');
          badge.className = 'hand-count-badge';
          badge.textContent = String(player.handCount);
          badge.style.position = 'absolute';
          badge.style.top = '5px';
          badge.style.right = '5px';
          badge.style.background = '#fff';
          badge.style.borderRadius = '50%';
          badge.style.width = '20px';
          badge.style.height = '20px';
          badge.style.display = 'flex';
          badge.style.alignItems = 'center';
          badge.style.justifyContent = 'center';
          badge.style.fontSize = '12px';
          badge.style.fontWeight = 'bold';
          lastCard.style.position = 'relative';
          lastCard.appendChild(badge);
        }
      }
      handRow.appendChild(handContainer);
    }
    panel.appendChild(handRow);

    // Up/Down stacks (always show, always second row)
    const stackRow = document.createElement('div');
    stackRow.className = 'stack-row';
    stackRow.style.display = 'flex';
    stackRow.style.gap = '5px';

    if (player.upCards && player.upCards.length > 0) {
      player.upCards.forEach((c, i) => {
        const col = document.createElement('div');
        col.className = 'stack';
        col.style.position = 'relative';

        if ((player.downCount ?? 0) > i) {
          const downCard = cardImg({ value: '', suit: '', back: true } as CardType, false);
          const downImg = downCard.querySelector('.card-img') as HTMLImageElement | null;
          if (downImg) downImg.classList.add('down-card');
          col.appendChild(downCard);
        }
        const canPlayUp =
          player.id === localPlayerId &&
          gameState.currentPlayerId === localPlayerId &&
          player.handCount === 0;
        const upCard = cardImg(c, canPlayUp);
        const upImg = upCard.querySelector('.card-img') as HTMLImageElement | null;
        if (upImg) {
          upImg.classList.add('up-card');
          if (player.id === localPlayerId) upImg.dataset.idx = String(i + 1000);
        }
        col.appendChild(upCard);
        if (canPlayUp) col.classList.add('playable-stack');
        stackRow.appendChild(col);
      });
    } else if ((player?.downCount ?? 0) > 0) {
      for (let i = 0; i < (player.downCount ?? 0); i++) {
        const col = document.createElement('div');
        col.className = 'stack';
        col.style.position = 'relative';

        const canPlayDown =
          player.id === localPlayerId &&
          gameState.currentPlayerId === localPlayerId &&
          player.handCount === 0 &&
          player.upCount === 0;
        const downCard = cardImg(
          { value: '', suit: '', back: true } as CardType,
          canPlayDown && i === 0
        );
        const downImg = downCard.querySelector('.card-img') as HTMLImageElement | null;
        if (downImg) {
          downImg.classList.add('down-card');
          if (player.id === localPlayerId) downImg.dataset.idx = String(i + 2000);
        }
        col.appendChild(downCard);
        if (canPlayDown && i === 0) col.classList.add('playable-stack');
        stackRow.appendChild(col);
      }
    }
    panel.appendChild(stackRow);

    // Place panel in correct slot
    if (seat === 'bottom' && slotBottom) slotBottom.appendChild(panel);
    else if (seat === 'top' && slotTop) slotTop.appendChild(panel);
    else if (seat === 'left' && slotLeft) slotLeft.appendChild(panel);
    else if (seat === 'right' && slotRight) slotRight.appendChild(panel);
  });

  // --- Center area: Deck and Discard piles ---
  const centerArea = document.getElementById('center-area');
  if (centerArea) {
    centerArea.innerHTML = '';
    centerArea.style.backgroundColor = lightGreen; // Light green background

    const wrapper = document.createElement('div');
    wrapper.className = 'center-piles-wrapper';
    wrapper.style.display = 'flex';
    wrapper.style.gap = '20px';
    wrapper.style.justifyContent = 'center';
    wrapper.style.alignItems = 'center';

    // Deck container - transparent with white dotted outline
    const deckContainer = document.createElement('div');
    deckContainer.className = 'center-pile-container card-container';
    deckContainer.style.width = '125px';
    deckContainer.style.height = '175px';
    deckContainer.style.border = '3px dotted #ffffff';
    deckContainer.style.borderRadius = '12px';
    deckContainer.style.display = 'flex';
    deckContainer.style.alignItems = 'center';
    deckContainer.style.justifyContent = 'center';
    deckContainer.style.backgroundColor = 'transparent';
    deckContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';

    const deckLabel = document.createElement('span');
    deckLabel.className = 'pile-label';
    deckLabel.textContent = 'DECK';
    deckLabel.style.color = '#ffffff';
    deckLabel.style.fontWeight = 'bold';
    deckLabel.style.fontSize = '14px';
    deckLabel.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
    deckContainer.appendChild(deckLabel);

    // Discard container - transparent with white dotted outline
    const discardContainer = document.createElement('div');
    discardContainer.className = 'center-pile-container card-container';
    discardContainer.style.width = '125px';
    discardContainer.style.height = '175px';
    discardContainer.style.border = '3px dotted #ffffff';
    discardContainer.style.borderRadius = '12px';
    discardContainer.style.display = 'flex';
    discardContainer.style.alignItems = 'center';
    discardContainer.style.justifyContent = 'center';
    discardContainer.style.backgroundColor = 'transparent';
    discardContainer.style.position = 'relative';
    discardContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';

    // Show actual discard card if available, otherwise show placeholder
    const pile = gameState.pile && gameState.pile.length > 0 ? gameState.pile : null;
    if (pile) {
      const discardCard = cardImg(pile[pile.length - 1], false);
      discardCard.style.position = 'absolute';
      discardCard.style.top = '0';
      discardCard.style.left = '0';
      discardCard.id = 'pile-top-card';
      discardContainer.appendChild(discardCard);
    } else {
      const discardLabel = document.createElement('span');
      discardLabel.className = 'pile-label';
      discardLabel.textContent = 'DISCARD';
      discardLabel.style.color = '#ffffff';
      discardLabel.style.fontWeight = 'bold';
      discardLabel.style.fontSize = '14px';
      discardLabel.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
      discardContainer.appendChild(discardLabel);
    }

    wrapper.append(deckContainer, discardContainer);
    centerArea.appendChild(wrapper);
  }
}

/**
 * Overlay special card symbol on top of discard pile card
 */
export function showCardEvent(cardValue: number | string | null, type: string): void {
  // Query for the pile top card image directly, as it's now consistently used.
  let discardImg = document.getElementById('pile-top-card') as HTMLImageElement | null;

  // If pile-top-card is not visible (e.g. pile is empty), try to find a card in a .discard container if that structure still exists from old code.
  // This is a fallback, ideally the pile-top-card is the single source of truth for the top discard image.
  if (!discardImg || discardImg.style.display === 'none') {
    discardImg = document.querySelector('.discard .card-img') as HTMLImageElement | null;
  }

  let retries = 0;
  function tryRunEffect() {
    if (!discardImg || discardImg.style.display === 'none') {
      if (retries < 1) {
        discardImg = document.querySelector('.discard .card-img') as HTMLImageElement | null;
      }
      console.warn('showCardEvent: Could not find discard image to overlay effect.');
    }

    if (!discardImg && retries < 5) {
      retries++;
      setTimeout(tryRunEffect, 100);
      return;
    }
    if (!discardImg) {
      console.warn('showCardEvent: Could not find discard image to overlay effect.');
      return;
    }

    function runEffect() {
      const parentElement = discardImg!.parentElement; // pile-placeholder or .card-container
      if (!parentElement) return;

      const prev = parentElement.querySelector('.special-icon');
      if (prev) prev.remove();
      const icon = document.createElement('img');
      icon.className = 'special-icon';
      let src = '';
      if (type === 'two' || cardValue === 2) src = '/assets/effects/reset.png';
      else if (type === 'five' || cardValue === 5) src = '/assets/effects/copy.png';
      else if (type === 'ten' || cardValue === 10) src = '/assets/effects/burn.png';
      else if (type === 'four') src = '/assets/effects/4ofakind.png';
      else if (type === 'invalid') src = '/assets/effects/invalid.png';
      else if (type === 'take') src = '/assets/effects/take.png';
      else if (type === 'regular') return;
      icon.src = src;
      icon.onerror = () => {
        icon.style.background = 'rgba(255,255,255,0.7)';
        icon.style.borderRadius = '50%';
        icon.style.display = 'flex';
        icon.style.justifyContent = 'center';
        icon.style.alignItems = 'center';
        const fallbackText = document.createElement('div');
        fallbackText.textContent =
          type === 'take'
            ? 'TAKE'
            : type === 'two'
              ? 'RESET'
              : type === 'five'
                ? 'COPY'
                : type === 'ten'
                  ? 'BURN'
                  : type === 'four'
                    ? '4X'
                    : 'X';
        fallbackText.style.color = '#000';
        fallbackText.style.fontWeight = 'bold';
        icon.appendChild(fallbackText);
      };
      icon.style.position = 'absolute';
      icon.style.top = '50%';
      icon.style.left = '50%';
      icon.style.transform = 'translate(-50%, -50%)';
      icon.style.width = '90px';
      icon.style.height = '90px';
      icon.style.zIndex = '100';
      icon.style.background = 'none';
      icon.style.backgroundColor = 'transparent';
      icon.style.pointerEvents = 'none';
      icon.style.filter = 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.9))';
      icon.style.animation = 'iconPulse 1.5s ease-in-out';
      // Ensure parent has relative positioning if it doesn't already.
      if (getComputedStyle(parentElement).position === 'static') {
        parentElement.style.position = 'relative';
      }
      parentElement.appendChild(icon);
      setTimeout(() => {
        icon.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        icon.style.opacity = '0';
        icon.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => icon.remove(), 500);
      }, 1800);
    }
    if (discardImg instanceof HTMLImageElement && !discardImg.complete) {
      discardImg.addEventListener('load', runEffect, { once: true });
    } else {
      runEffect();
    }
  }
  tryRunEffect();
}
