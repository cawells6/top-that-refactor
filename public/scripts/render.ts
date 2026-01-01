import {
  Card as CardType,
  GameStateData,
} from '../../src/shared/types.js';
import {
  normalizeCardValue,
  rank,
  isSpecialCard,
} from '../../utils/cardUtils.js';

const seatOrder = ['bottom', 'right', 'top', 'left'] as const;
const seatAccents: Record<string, string> = {
  bottom: '#f6c556',
  right: '#60d6a6',
  top: '#ff8b5f',
  left: '#6fb4ff',
};

function createTag(text: string, variant: string): HTMLSpanElement {
  const tag = document.createElement('span');
  tag.className = `tag tag--${variant}`;
  tag.textContent = text;
  return tag;
}


// Convert {value:'A',suit:'hearts'} → "AH", 10→"0"
export function code(card: CardType): string {
  if (card.value == null || card.suit == null) {
    // Simplified null/undefined check
    return 'ERR';
  }
  const v =
    String(card.value).toUpperCase() === '10'
      ? '0'
      : String(card.value).toUpperCase();
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
  // [REMOVED NOISY LOGS]

  // Try using direct URLs instead of the proxy
  const imgSrc = `https://deckofcardsapi.com/static/img/${cardCode}.png`;
  // [REMOVED NOISY LOGS]

  img.src = imgSrc;
  img.alt = card.back ? 'Card back' : `${card.value} of ${card.suit}`;

  // Set up onload and error handling
  img.onload = () => {
    img.style.visibility = 'visible';
    // [REMOVED NOISY LOGS]
    if (onLoad) onLoad(img);
  };

  // Improved error handling with retry
  img.onerror = () => {
    console.error(`⚠️ Failed to load card image: ${img.src}`);

    // Try an alternative URL with slight delay
    setTimeout(() => {
      // Try different source paths as fallback
      const fallbacks = [
        `/cards-api/static/img/${cardCode}.png`, // Try proxy
        `https://raw.githubusercontent.com/hayeah/playing-cards-assets/master/png/${cardCode}.png`, // GitHub hosted fallback
      ];

      // If we've already tried all fallbacks, show a placeholder
      const currentSrcIndex = fallbacks.indexOf(img.src);

      if (currentSrcIndex < fallbacks.length - 1) {
        console.log(
          `🔄 Trying alternative source: ${fallbacks[currentSrcIndex + 1]}`
        );
        img.src = fallbacks[currentSrcIndex + 1];
      } else {
        // Create a fallback visual representation
        console.warn(
          `⚠️ All image sources failed for ${cardCode}, using fallback`
        );
        img.style.visibility = 'visible';
        container.style.border = '1px solid #ccc';
        container.style.borderRadius = '8px';
        container.style.backgroundColor = card.back ? '#0f1f19' : 'white';
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
          valueDisplay.style.color =
            card.suit === 'hearts' || card.suit === 'diamonds'
              ? 'red'
              : 'black';
          valueDisplay.textContent = String(card.value);

          const suitDisplay = document.createElement('div');
          suitDisplay.style.fontSize = '24px';
          suitDisplay.style.color =
            card.suit === 'hearts' || card.suit === 'diamonds'
              ? 'red'
              : 'black';
          const suitMap: Record<string, string> = {
            hearts: '♥',
            diamonds: '♦',
            clubs: '♣',
            spades: '♠',
          };
          suitDisplay.textContent =
            suitMap[card.suit as keyof typeof suitMap] || '';

          container.appendChild(valueDisplay);
          container.appendChild(suitDisplay);
        } else {
          // For card backs
          container.textContent = 'BACK';
          container.style.fontSize = '18px';
          container.style.fontWeight = 'bold';
          container.style.color = '#fef7e0';
        }

        if (onLoad) onLoad(img);
      }
    }, 500); // Delay retry to avoid rapid retries
  };

  if (selectable) {
    img.classList.add('selectable');
    img.style.touchAction = 'manipulation';
    container.classList.add('selectable-container');
    container.addEventListener('click', () => {
      img.classList.toggle('selected');
      container.classList.toggle(
        'selected-container',
        img.classList.contains('selected')
      );
    });
  }

  container.appendChild(img);
  return container;
}

function isValidPlay(cards: CardType[], pile: CardType[]): boolean {
  if (!cards || cards.length === 0) {
    return false;
  }

  const firstValue = normalizeCardValue(cards[0].value);
  if (cards.some((card) => normalizeCardValue(card.value) !== firstValue)) {
    return false;
  }

  if (cards.length >= 4) {
    return true;
  }

  if (!pile || pile.length === 0) {
    return true;
  }

  if (isSpecialCard(firstValue)) {
    return true;
  }

  const playedRank = rank(cards[0]);
  const topPileCard = pile[pile.length - 1];
  const topPileRank = rank(topPileCard);

  return playedRank > topPileRank;
}

function hasValidHandPlay(hand: CardType[], pile: CardType[]): boolean {
  if (!hand || hand.length === 0) {
    return false;
  }

  const groups = new Map<string, CardType[]>();
  for (const card of hand) {
    const key = String(normalizeCardValue(card.value) ?? card.value);
    const existing = groups.get(key);
    if (existing) {
      existing.push(card);
    } else {
      groups.set(key, [card]);
    }
  }

  for (const group of groups.values()) {
    if (isValidPlay(group, pile)) {
      return true;
    }
  }

  return false;
}

function hasValidUpPlay(
  upCards: Array<CardType | null>,
  pile: CardType[]
): boolean {
  if (!upCards || upCards.length === 0) {
    return false;
  }

  return upCards
    .filter((card) => Boolean(card))
    .some((card) => isValidPlay([card], pile));
}

function applyHandCompression(
  panel: HTMLDivElement,
  handRow: HTMLDivElement,
  cardCount: number
): void {
  handRow.classList.remove('hand-row--compressed');
  handRow.style.removeProperty('--hand-overlap');

  if (cardCount <= 1) {
    return;
  }

  const firstCard = handRow.querySelector(
    '.card-container'
  ) as HTMLDivElement | null;
  if (!firstCard) {
    return;
  }

  const panelStyles = window.getComputedStyle(panel);
  const paddingLeft = parseFloat(panelStyles.paddingLeft) || 0;
  const paddingRight = parseFloat(panelStyles.paddingRight) || 0;
  const availableWidth = panel.clientWidth - paddingLeft - paddingRight;
  if (availableWidth <= 0) {
    return;
  }

  const cardWidth = firstCard.getBoundingClientRect().width;
  if (cardWidth <= 0) {
    return;
  }
  const cardStyles = window.getComputedStyle(firstCard);
  const marginLeft = parseFloat(cardStyles.marginLeft) || 0;
  const marginRight = parseFloat(cardStyles.marginRight) || 0;
  const cardTotalWidth = cardWidth + marginLeft + marginRight;

  const rowStyles = window.getComputedStyle(handRow);
  const gapValue = rowStyles.gap || rowStyles.columnGap || '0';
  const gap = parseFloat(gapValue) || 0;
  const totalWidth = cardTotalWidth * cardCount + gap * (cardCount - 1);

  if (totalWidth <= availableWidth) {
    return;
  }

  let overlap =
    (availableWidth - cardTotalWidth * cardCount) / (cardCount - 1) - gap;
  if (overlap > 0) {
    overlap = 0;
  }
  const minOverlap = -cardTotalWidth * 0.9;
  if (overlap < minOverlap) {
    overlap = minOverlap;
  }

  handRow.classList.add('hand-row--compressed');
  handRow.style.setProperty('--hand-overlap', `${overlap}px`);
}

/**
 * Main render function to update the entire game view
 * @param {GameStateData} gameState - Full game state from server
 */
export function renderGameState(
  gameState: GameStateData,
  localPlayerId: string | null
): void {
  const slotTop = document.getElementById(
    'opponent-area-top'
  ) as HTMLElement | null;
  const slotBottom = document.getElementById(
    'player-area-bottom'
  ) as HTMLElement | null;
  const slotLeft = document.getElementById(
    'opponent-area-left'
  ) as HTMLElement | null;
  const slotRight = document.getElementById(
    'opponent-area-right'
  ) as HTMLElement | null;
  const centerArea = document.getElementById('center-area') as HTMLElement | null;

  if (!gameState || !gameState.players) {
    if (slotTop) slotTop.innerHTML = '';
    if (slotBottom) slotBottom.innerHTML = '';
    if (slotLeft) slotLeft.innerHTML = '';
    if (slotRight) slotRight.innerHTML = '';
    if (centerArea) centerArea.innerHTML = '';
    return;
  }

  if (slotTop) slotTop.innerHTML = '';
  if (slotBottom) slotBottom.innerHTML = '';
  if (slotLeft) slotLeft.innerHTML = '';
  if (slotRight) slotRight.innerHTML = '';
  if (centerArea) centerArea.innerHTML = '';

  const players = gameState.players;
  const cpuIds = players
    .filter((p) => p.isComputer)
    .map((p) => p.id);
  const cpuIndexById = new Map(
    cpuIds.map((id, index) => [id, index + 1])
  );
  const meIdx = localPlayerId
    ? players.findIndex((p) => p.id === localPlayerId)
    : -1;

  const rotatedPlayers =
    meIdx >= 0
      ? players.slice(meIdx).concat(players.slice(0, meIdx))
      : players.slice();

  seatOrder.forEach((seat, idx) => {
    const player = rotatedPlayers[idx];
    if (!player) return;

    const isLocalPlayer = player.id === localPlayerId;
    const isMyTurn = isLocalPlayer && player.id === gameState.currentPlayerId;
    const handCount = player.handCount ?? player.hand?.length ?? 0;
    const upCount =
      player.upCount ??
      (player.upCards
        ? player.upCards.filter((card) => Boolean(card)).length
        : 0);
    const downCount = player.downCount ?? player.downCards?.length ?? 0;
    const isForcedDown =
      isLocalPlayer &&
      isMyTurn &&
      handCount === 0 &&
      upCount === 0 &&
      downCount > 0;

    const panel = document.createElement('div');
    panel.className = 'player-area seat';
    panel.dataset.playerId = player.id;
    panel.dataset.seat = seat;
    panel.style.setProperty(
      '--seat-accent',
      seatAccents[seat] ?? '#f6c556'
    );

    if (player.isComputer) panel.classList.add('computer-player');
    if (player.disconnected) panel.classList.add('disconnected');
    if (isLocalPlayer) panel.classList.add('is-local');
    if (player.id === gameState.currentPlayerId) {
      panel.classList.add('active');
    }
    if (seat === 'bottom' && isLocalPlayer) {
      panel.id = 'my-area';
    }

    const header = document.createElement('div');
    header.className = 'player-header';

    const ident = document.createElement('div');
    ident.className = 'player-ident';

    const avatar = document.createElement('div');
    avatar.className = 'player-avatar';
    const avatarImg = document.createElement('img');
    avatarImg.src = player.isComputer ? '/assets/robot.svg' : '/assets/Player.svg';
    avatarImg.alt = player.isComputer ? 'CPU avatar' : 'Player avatar';
    avatar.appendChild(avatarImg);

    const meta = document.createElement('div');
    meta.className = 'player-meta';

    const nameEl = document.createElement('div');
    nameEl.className = 'player-name';
    const cpuIndex = cpuIndexById.get(player.id);
    nameEl.textContent = player.isComputer
      ? `CPU ${cpuIndex ?? ''}`.trim()
      : player.name || player.id;

    const tagRow = document.createElement('div');
    tagRow.className = 'player-tags';
    if (player.disconnected) tagRow.appendChild(createTag('Offline', 'offline'));
    if (player.id === gameState.currentPlayerId) {
      tagRow.appendChild(createTag('Turn', 'turn'));
    }

    meta.appendChild(nameEl);
    if (tagRow.childElementCount > 0) {
      meta.appendChild(tagRow);
    }
    ident.append(avatar, meta);

    header.append(ident);
    panel.appendChild(header);

    const handZone = document.createElement('div');
    handZone.className = 'player-zone player-zone--hand';
    if (isLocalPlayer) {
      handZone.classList.add('player-zone--hand-local');
    }
    const handLabel = document.createElement('div');
    handLabel.className = 'zone-label';
    handLabel.textContent = 'Hand';
    const handRow = document.createElement('div');
    handRow.className = isLocalPlayer
      ? 'hand-row hand-row--local'
      : 'hand-row hand-row--opponent';

    if (isLocalPlayer) {
      const handCards = player.hand ?? [];
      if (handCards.length === 0) {
        const emptySlot = document.createElement('div');
        emptySlot.className = 'card-container card-slot card-slot--empty';
        emptySlot.innerHTML = '<div class="empty-card-placeholder"></div>';
        handRow.appendChild(emptySlot);
      } else {
        handCards.forEach((card, index) => {
          const cardElement = cardImg(card, isMyTurn);
          const imgEl = cardElement.querySelector('.card-img');
          if (imgEl && imgEl instanceof HTMLImageElement) {
            imgEl.dataset.idx = String(index);
            imgEl.dataset.zone = 'hand';
            imgEl.dataset.value = String(card.value);
          }
          handRow.appendChild(cardElement);
        });
      }
    } else {
      const handStack = document.createElement('div');
      handStack.className = 'hand-stack';

      const visibleCount = Math.min(3, handCount);
      if (visibleCount === 0) {
        const emptySlot = document.createElement('div');
        emptySlot.className = 'card-container card-slot card-slot--empty';
        emptySlot.innerHTML = '<div class="empty-card-placeholder"></div>';
        handStack.appendChild(emptySlot);
      } else {
        for (let i = 0; i < visibleCount; i++) {
          const backCard: CardType = { back: true, value: 'A', suit: 'hearts' };
          const cardEl = cardImg(backCard, false);
          cardEl.classList.add('stacked-card');
          handStack.appendChild(cardEl);
        }
      }

      if (handCount > 0) {
        const badge = document.createElement('div');
        badge.className = 'hand-count-badge';
        badge.textContent = String(handCount);
        handStack.appendChild(badge);
      }

      handRow.appendChild(handStack);
    }

    const handTray = document.createElement('div');
    handTray.className = 'hand-tray';
    if (isLocalPlayer) {
      handTray.classList.add('hand-tray--local');
    }
    handTray.appendChild(handRow);
    handZone.append(handLabel, handTray);
    panel.appendChild(handZone);

    if (seat === 'bottom' && isLocalPlayer) {
      const actionRow = document.createElement('div');
      actionRow.className = 'player-actions';

      const playButton = document.createElement('button');
      playButton.id = 'play-button';
      playButton.className = 'action-button action-button--play';
      playButton.textContent = 'Play';
      playButton.disabled = !isMyTurn;

      const takeButton = document.createElement('button');
      takeButton.id = 'take-button';
      takeButton.className = 'action-button action-button--take';
      takeButton.textContent = 'Take';
      const requiredZone =
        handCount > 0
          ? 'hand'
          : upCount > 0
            ? 'upCards'
            : downCount > 0
              ? 'downCards'
              : null;
      const hasPlayableCard =
        requiredZone === 'hand'
          ? hasValidHandPlay(player.hand ?? [], gameState.pile ?? [])
          : requiredZone === 'upCards'
            ? hasValidUpPlay(player.upCards ?? [], gameState.pile ?? [])
            : false;
      takeButton.disabled =
        !isMyTurn ||
        requiredZone === null ||
        requiredZone === 'downCards' ||
        hasPlayableCard;

      actionRow.append(playButton, takeButton);
      panel.appendChild(actionRow);
    }

    const tableZone = document.createElement('div');
    tableZone.className = 'player-zone player-zone--table';

    const tabledWrapper = document.createElement('div');
    tabledWrapper.className = 'card-zone--tabled';

    const tableLabel = document.createElement('div');
    tableLabel.className = 'zone-label';
    tableLabel.textContent = 'Up / Down';

    const stackRow = document.createElement('div');
    stackRow.className = 'stack-row';
    if (isForcedDown) {
      stackRow.classList.add('forced-down');
    }

    const upCards = player.upCards ?? [];
    const maxStackCount = Math.max(upCards.length, downCount);
    if (maxStackCount > 0) {
      for (let i = 0; i < maxStackCount; i++) {
        const col = document.createElement('div');
        col.className = 'stack';

        const hasDownCard = downCount > i;
        const canPlayDown =
          hasDownCard && isMyTurn && handCount === 0 && upCount === 0;
        if (hasDownCard) {
          const downCard = cardImg(
            { value: '', suit: '', back: true } as CardType,
            canPlayDown
          );
          const downImg = downCard.querySelector(
            '.card-img'
          ) as HTMLImageElement | null;
          if (downImg) {
            downImg.classList.add('down-card');
            if (isForcedDown) {
              downImg.classList.add('forced-down-card');
            }
            if (isLocalPlayer) {
              downImg.dataset.idx = String(i);
              downImg.dataset.zone = 'downCards';
            }
          }
          col.appendChild(downCard);
        }

        const upCard = upCards[i];
        const canPlayUp = Boolean(upCard) && isMyTurn && handCount === 0;
        if (upCard) {
          const upCardEl = cardImg(upCard, canPlayUp);
          const upImg = upCardEl.querySelector(
            '.card-img'
          ) as HTMLImageElement | null;
          if (upImg) {
            upImg.classList.add('up-card');
            if (isLocalPlayer) {
              upImg.dataset.idx = String(i);
              upImg.dataset.zone = 'upCards';
              upImg.dataset.value = String(upCard.value);
            }
          }
          col.appendChild(upCardEl);
        }

        if (canPlayUp || canPlayDown) col.classList.add('playable-stack');
        stackRow.appendChild(col);
      }
    }

    tabledWrapper.append(tableLabel, stackRow);
    tableZone.appendChild(tabledWrapper);
    panel.appendChild(tableZone);

    let slotTarget: HTMLElement | null = null;
    if (seat === 'bottom') slotTarget = slotBottom;
    else if (seat === 'top') slotTarget = slotTop;
    else if (seat === 'left') slotTarget = slotLeft;
    else if (seat === 'right') slotTarget = slotRight;

    if (slotTarget) {
      slotTarget.appendChild(panel);
      if (isLocalPlayer) {
        requestAnimationFrame(() => {
          applyHandCompression(panel, handRow, handCount);
        });
      }
    }
  });

  if (centerArea) {
    const centerWrap = document.createElement('div');
    centerWrap.className = 'center-piles';

    const deckContainer = document.createElement('div');
    deckContainer.className = 'pile-group pile-group--deck';

    const deckSize = gameState.deckSize ?? 0;
    const deckStack = document.createElement('div');
    deckStack.className = 'pile-cards deck-stack';
    if (deckSize > 0) {
      const deckBack: CardType = { back: true, value: 'A', suit: 'spades' };
      const deckCard = cardImg(deckBack, false);
      deckCard.classList.add('deck-card');
      deckStack.appendChild(deckCard);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'pile-placeholder';
      deckStack.appendChild(placeholder);
    }
    const deckLabel = document.createElement('div');
    deckLabel.className = 'pile-card-label';
    deckLabel.textContent = 'Deck';
    const deckBadge = document.createElement('div');
    deckBadge.className = 'pile-count-badge';
    deckBadge.textContent = String(deckSize);
    deckStack.append(deckLabel, deckBadge);
    deckContainer.appendChild(deckStack);

    const playContainer = document.createElement('div');
    playContainer.className = 'pile-group pile-group--discard';
    playContainer.id = 'discard-pile';

    const pile = gameState.pile ?? [];
    const playStack = document.createElement('div');
    playStack.className = 'pile-cards play-stack';
    if (pile.length > 0) {
      const playCard = cardImg(pile[pile.length - 1], false);
      playCard.id = 'pile-top-card';
      playStack.appendChild(playCard);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'pile-placeholder';
      playStack.appendChild(placeholder);
    }
    const playLabel = document.createElement('div');
    playLabel.className = 'pile-card-label';
    playLabel.textContent = 'Discard';
    const playBadge = document.createElement('div');
    playBadge.className = 'pile-count-badge';
    playBadge.textContent = String(pile.length);
    playStack.append(playLabel, playBadge);
    playContainer.appendChild(playStack);

    if (gameState.discardCount > 0) {
      const burned = document.createElement('div');
      burned.className = 'pile-burned';
      burned.textContent = `Burned ${gameState.discardCount}`;
      playContainer.appendChild(burned);
    }

    centerWrap.append(deckContainer, playContainer);
    centerArea.appendChild(centerWrap);
  }
}

/**
 * Overlay special card symbol on top of discard pile card or container
 */
export function showCardEvent(
  cardValue: number | string | null,
  type: string
): void {
  let retries = 0;
  function tryRunEffect() {
    // Query for the pile top card image directly, as it's now consistently used.
    let discardImg = document.getElementById(
      'pile-top-card'
    ) as HTMLImageElement | null;
    const discardContainer = document.getElementById('discard-pile');

    // If pile-top-card is not visible (e.g. pile is empty), try to find a card in a .discard container if that structure still exists from old code.
    // This is a fallback, ideally the pile-top-card is the single source of truth for the top discard image.
    if (!discardImg || discardImg.style.display === 'none') {
      discardImg = document.querySelector(
        '.discard .card-img'
      ) as HTMLImageElement | null;
    }

    const target =
      discardImg && discardImg.style.display !== 'none'
        ? discardImg
        : discardContainer;

    if (!target && retries < 5) {
      retries++;
      setTimeout(tryRunEffect, 100);
      return;
    }
    if (!target) {
      console.warn(
        'showCardEvent: Could not find discard image to overlay effect.'
      );
      return;
    }

    function runEffect(effectTarget: HTMLElement) {
      const parentElement =
        effectTarget instanceof HTMLImageElement
          ? effectTarget.parentElement
          : effectTarget;
      if (!parentElement) return;

      const prev = parentElement.querySelector('.special-icon');
      if (prev) prev.remove();
      const icon = document.createElement('img');
      icon.className = 'special-icon';
      let src = '';
      if (type === 'two' || cardValue === 2) src = '/assets/effects/reset.png';
      else if (type === 'five' || cardValue === 5)
        src = '/assets/effects/copy.png';
      else if (type === 'ten' || cardValue === 10)
        src = '/assets/effects/burn.png';
      else if (type === 'four') src = '/assets/effects/4ofakind.png';
      else if (type === 'invalid') src = '/assets/effects/invalid.png';
      else if (type === 'take') src = '/assets/effects/take.png';
      else if (type === 'regular') return;
      icon.src = src;
      icon.onerror = () => {
        icon.style.background = 'rgba(255, 195, 0, 0.7)';
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
      icon.style.width = '70px';
      icon.style.height = '70px';
      icon.style.zIndex = '100';
      icon.style.background = 'none';
      icon.style.backgroundColor = 'transparent';
      icon.style.pointerEvents = 'none';
      icon.style.opacity = '0.85';
      icon.style.filter = 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.35))';
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
    if (target instanceof HTMLImageElement && !target.complete) {
      target.addEventListener('load', () => runEffect(target), { once: true });
    } else {
      runEffect(target);
    }
  }
  tryRunEffect();
}

export function playArea() {
  // Mock implementation for tests
}

export function lobbyLink() {
  // Mock implementation for tests
}
