import { cardImg, renderGameState } from './render.js';
import { SoundManager } from './SoundManager.js';
import { ANIMATIONS_COMPLETE } from '../../src/shared/events.js';
import type { Card, GameStateData } from '../../src/shared/types.js';

const DEAL_INTERVAL_MS = 100;
const FLIGHT_DURATION_MS = 600;
const PHASE_PAUSE_MS = 400;
const START_OVERLAY_AUTO_DISMISS_MS = 2500;
const START_OVERLAY_FADE_MS = 180;

export async function performOpeningDeal(
  gameState: GameStateData,
  myPlayerId: string
): Promise<void> {
  try {
    // 1. Pause to let players see the "DRAW" / "PLAY" burnt text markings
    await wait(1800);

    const playSource = document.getElementById('deck-pile'); // Source "Play" pile (Deck)
    if (!playSource) {
      console.warn(
        '[DealingAnimation] deck-pile not found; skipping opening deal animation'
      );

      // Ensure we still show the start overlay so the game flow continues.
      renderGameState(gameState, myPlayerId, null, { skeletonMode: false });
      await showStartOverlay();
      return;
    }

    // 2. Visually spawn the deck card (since skeleton mode removed it)
    // This ensures cards have a visible source to fly from.
    if (!playSource.querySelector('.deck-card') && (gameState.deckSize ?? 0) > 0) {
      // Create a temporary deck back card
      const deckBack: Card = { back: true, value: 'A', suit: 'spades' };
      const cardEl = cardImg(deckBack, false, undefined, true, false);
      cardEl.classList.add('deck-card');
      playSource.appendChild(cardEl);
    }

    // Prefer the actual deck card element for more accurate start positioning.
    const deckCardEl = playSource.querySelector(
      '.deck-card .card-img'
    ) as HTMLElement | null;
    const playRect = (deckCardEl || playSource).getBoundingClientRect();
    const players = gameState.players;
    const meIdx = myPlayerId
      ? players.findIndex((p) => p.id === myPlayerId)
      : -1;
    const dealingOrder =
      meIdx >= 0
        ? players.slice(meIdx).concat(players.slice(0, meIdx))
        : players.slice();

    // PHASE A: DOWN CARDS (Round Robin)
    for (let i = 0; i < 3; i++) {
      for (const player of dealingOrder) {
        const target = getTarget(player.id, 'down', i);
        if (target) {
          animateFlyer(playRect, target, null, false);
          await wait(DEAL_INTERVAL_MS);
        }
      }
    }
    await wait(FLIGHT_DURATION_MS - DEAL_INTERVAL_MS);
    SoundManager.play('card-land');
    dealingOrder.forEach((p) => revealGroup(p.id, 'down', 3));
    await wait(PHASE_PAUSE_MS);

    // PHASE B: UP CARDS (Round Robin)
    for (let i = 0; i < 3; i++) {
      for (const player of dealingOrder) {
        const upCards = player.upCards || [];
        if (upCards[i]) {
          const target = getTarget(player.id, 'up', i);
          if (target) {
            animateFlyer(playRect, target, upCards[i], true);
            await wait(DEAL_INTERVAL_MS);
          }
        }
      }
    }
    await wait(FLIGHT_DURATION_MS - DEAL_INTERVAL_MS);
    SoundManager.play('card-land');
    // IMMEDIATELY Reveal Up Cards
    dealingOrder.forEach((p) => revealGroup(p.id, 'up', 3));
    await wait(PHASE_PAUSE_MS);

    // PHASE C: HAND CARDS (Round Robin)
    for (let k = 0; k < 5; k++) {
      for (const player of dealingOrder) {
        const handCount = player.handCount || player.hand?.length || 0;
        if (k < handCount) {
          const isMe = player.id === myPlayerId;
          const area = `.player-area[data-player-id="${player.id}"]`;
          const handRow = document.querySelector(
            `${isMe ? '#my-area' : area} .hand-row`
          ) as HTMLElement;

          if (handRow && handRow.children[k]) {
            const target = handRow.children[k] as HTMLElement;
            const cardData = isMe && player.hand ? player.hand[k] : null;
            animateFlyer(playRect, target, cardData, isMe);
            await wait(DEAL_INTERVAL_MS);
          }
        }
      }
    }
    await wait(FLIGHT_DURATION_MS - DEAL_INTERVAL_MS);
    SoundManager.play('card-land');
    dealingOrder.forEach((p) => {
      if (p.id === myPlayerId) revealMyHand(Math.min(p.handCount || 0, 5));
      else revealOpponentHand(p.id);
    });
    await wait(PHASE_PAUSE_MS);

    // PHASE D: START GAME FLIP (Play Source -> Draw Target)
    await animatePlayToDraw(gameState);

    // FINAL COMMIT: This makes all cards "stick" and restores normal UI behavior
    renderGameState(gameState, myPlayerId, null, { skeletonMode: false });

    // Small beat so the player sees the starter card land.
    await wait(250);

    await showStartOverlay();
  } catch (err) {
    console.error('[DealingAnimation] Opening deal animation failed:', err);
  } finally {
    // Signal server that animations are complete so CPU can take their turn.
    // This must fire even if the animation is skipped or fails, otherwise games can
    // stall on a CPU's first turn.
    try {
      const stateModule = await import('./state.js');
      await stateModule.socketReady;
      const activeSocket = stateModule.socket;
      if (activeSocket?.connected) {
        activeSocket.emit(ANIMATIONS_COMPLETE);
      } else {
        console.warn(
          '[DealingAnimation] Socket not ready to emit animations complete'
        );
      }
    } catch (emitErr) {
      console.warn(
        '[DealingAnimation] Failed to emit animations complete:',
        emitErr
      );
    }
  }
}

// --- HELPERS ---

function getTarget(
  playerId: string,
  type: 'up' | 'down',
  index: number
): HTMLElement | null {
  const col = document.querySelector(
    `.player-area[data-player-id="${playerId}"] .stack-row > div:nth-child(${index + 1})`
  );
  if (!col) return null;

  if (type === 'up') {
    // Try to find existing up-card container or img
    const upCardContainer = col.querySelector(
      '.card-container.up-card'
    ) as HTMLElement;
    if (upCardContainer) {
      // Return the card-img inside for accurate positioning
      const upCardImg = upCardContainer.querySelector(
        '.card-img'
      ) as HTMLElement;
      return upCardImg || upCardContainer;
    }
  } else if (type === 'down') {
    // For down cards, also try to find the actual card element
    const downCardContainer = col.querySelector(
      '.card-container.down-card'
    ) as HTMLElement;
    if (downCardContainer) {
      const downCardImg = downCardContainer.querySelector(
        '.card-img'
      ) as HTMLElement;
      return downCardImg || downCardContainer;
    }
  }

  return col as HTMLElement;
}

function revealGroup(playerId: string, type: 'up' | 'down', count: number) {
  for (let i = 0; i < count; i++) {
    const col = document.querySelector(
      `.player-area[data-player-id="${playerId}"] .stack-row > div:nth-child(${i + 1})`
    );
    if (col) {
      // Target ONLY the specific card class to avoid revealing the wrong one
      const targetClass = type === 'up' ? '.up-card' : '.down-card';
      const cardEl = col.querySelector(targetClass) as HTMLElement;
      if (cardEl) {
        const img =
          (cardEl.querySelector('.card-img') as HTMLElement) || cardEl;
        img.style.visibility = 'visible';
        img.style.opacity = '1';
        const icon = cardEl.querySelector('.card-ability-icon') as HTMLElement;
        if (icon) icon.style.visibility = 'visible';
      }
    }
  }
}

function revealMyHand(count: number) {
  const handRow = document.querySelector('#my-area .hand-row');
  if (!handRow) return;
  for (let i = 0; i < count; i++) {
    const slot = handRow.children[i] as HTMLElement;
    if (slot) {
      const img = slot.querySelector('.card-img') as HTMLElement;
      if (img) {
        img.style.visibility = 'visible';
        img.style.opacity = '1';
      }
      const icon = slot.querySelector('.card-ability-icon') as HTMLElement;
      if (icon) icon.style.visibility = 'visible';
    }
  }
}

function revealOpponentHand(playerId: string) {
  const area = document.querySelector(
    `.player-area[data-player-id="${playerId}"]`
  );
  if (!area) return;
  area.querySelectorAll('.hand-row .card-img').forEach((c) => {
    (c as HTMLElement).style.visibility = 'visible';
    (c as HTMLElement).style.opacity = '1';
  });
  const badge = area.querySelector('.hand-count-badge') as HTMLElement;
  if (badge) badge.style.visibility = 'visible';
}

function animateFlyer(
  fromRect: DOMRect,
  toElem: HTMLElement,
  cardData: Card | null,
  isFaceUp: boolean
) {
  SoundManager.play('card-slide');

  const toRect = toElem.getBoundingClientRect();
  const flyer = document.createElement('div');
  flyer.className = 'flying-card';

  // NOTE: During the opening deal, face-up cards often haven't loaded their network images yet.
  // To ensure all cards visibly "fly" (like the down cards), we always fly a visible card-back
  // and reveal the real face-up/hand cards on landing via revealGroup/revealMyHand.
  void cardData;
  void isFaceUp;

  // Place the flyer at the source center, but sized to match the destination.
  // Animating via transforms is much more reliable than transitioning left/top.
  const startCenterX = fromRect.left + fromRect.width / 2;
  const startCenterY = fromRect.top + fromRect.height / 2;
  const endCenterX = toRect.left + toRect.width / 2;
  const endCenterY = toRect.top + toRect.height / 2;

  const deltaX = endCenterX - startCenterX;
  const deltaY = endCenterY - startCenterY;

  Object.assign(flyer.style, {
    position: 'fixed',
    left: `${startCenterX - toRect.width / 2}px`,
    top: `${startCenterY - toRect.height / 2}px`,
    width: `${toRect.width}px`,
    height: `${toRect.height}px`,
    zIndex: '9999',
    pointerEvents: 'none',
  });

  document.body.appendChild(flyer);

  const animation = flyer.animate(
    [
      { transform: 'translate(0px, 0px) rotate(0deg)' },
      { transform: `translate(${deltaX}px, ${deltaY}px) rotate(0deg)` },
    ],
    {
      duration: FLIGHT_DURATION_MS,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      fill: 'forwards',
    }
  );

  animation.onfinish = () => {
    flyer.remove();
  };
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function animatePlayToDraw(gameState: GameStateData) {
  const source = document.getElementById('deck-pile'); // "Play" (deck source)
  const target = document.getElementById('play-pile'); // "Draw" (the actual stack where the starter card goes)
  if (!source || !target) return;

  const topCard = gameState.pile?.[gameState.pile.length - 1] || null;
  if (!topCard) return;
  animateFlyer(source.getBoundingClientRect(), target, topCard, true);
  await wait(FLIGHT_DURATION_MS);

  SoundManager.play('card-land');
  target.innerHTML = '';
  target.appendChild(cardImg(topCard, false, undefined, false, false));
}

async function showStartOverlay() {
  const existing = document.getElementById('game-start-overlay');
  existing?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'game-start-overlay';
  overlay.className = 'game-start-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Game start prompt');

  const card = document.createElement('div');
  card.className = 'game-start-overlay__card';

  const title = document.createElement('div');
  title.className = 'game-start-overlay__title';
  title.textContent = 'Ready?';

  const hint = document.createElement('div');
  hint.className = 'game-start-overlay__hint';
  hint.textContent = 'Click anywhere to start';

  card.appendChild(title);
  card.appendChild(hint);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Small entrance cue + audio sting (kept subtle by the new UI).
  requestAnimationFrame(() => overlay.classList.add('is-visible'));
  SoundManager.play('game-start');

  await new Promise<void>((resolve) => {
    let done = false;
    let timeoutId: number | null = null;

    function cleanup() {
      overlay.removeEventListener('pointerdown', onStart);
      overlay.removeEventListener('click', onStart);
      window.removeEventListener('keydown', onKeyDown);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    }

    function finish() {
      if (done) return;
      done = true;
      cleanup();
      resolve();
    }

    function onStart(event: Event) {
      event.preventDefault();
      event.stopPropagation();
      finish();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      finish();
    }

    overlay.addEventListener('pointerdown', onStart, { once: true });
    overlay.addEventListener('click', onStart, { once: true });
    window.addEventListener('keydown', onKeyDown);

    timeoutId = window.setTimeout(
      () => finish(),
      START_OVERLAY_AUTO_DISMISS_MS
    );
  });

  overlay.classList.add('is-hiding');
  await wait(START_OVERLAY_FADE_MS);
  overlay.remove();
}
