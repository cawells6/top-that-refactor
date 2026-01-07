import { GameStateData, Card } from '../../src/shared/types.js';
import { cardImg, renderGameState } from './render.js';
import { SoundManager } from './SoundManager.js';
import { ANIMATIONS_COMPLETE } from '../../src/shared/events.js';

const DEAL_INTERVAL_MS = 100; 
const FLIGHT_DURATION_MS = 600; 
const PHASE_PAUSE_MS = 400; 

export async function performOpeningDeal(gameState: GameStateData, myPlayerId: string): Promise<void> {
    const playSource = document.getElementById('deck-pile'); // Source "Play" pile
    if (!playSource) return;

    // Prefer the actual deck card element for more accurate start positioning.
    const deckCardEl = playSource.querySelector('.deck-card .card-img') as HTMLElement | null;
    const playRect = (deckCardEl || playSource).getBoundingClientRect();
    const players = gameState.players;
    const meIdx = myPlayerId ? players.findIndex((p) => p.id === myPlayerId) : -1;
    const dealingOrder = meIdx >= 0 ? players.slice(meIdx).concat(players.slice(0, meIdx)) : players.slice();

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
    dealingOrder.forEach(p => revealGroup(p.id, 'down', 3));
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
    dealingOrder.forEach(p => revealGroup(p.id, 'up', 3));
    await wait(PHASE_PAUSE_MS);

    // PHASE C: HAND CARDS (Round Robin)
    for (let k = 0; k < 5; k++) {
        for (const player of dealingOrder) {
            const handCount = player.handCount || player.hand?.length || 0;
            if (k < handCount) {
                const isMe = player.id === myPlayerId;
                const area = `.player-area[data-player-id="${player.id}"]`;
                const handRow = document.querySelector(`${isMe ? '#my-area' : area} .hand-row`) as HTMLElement;
                
                if (handRow && handRow.children[k]) {
                    const target = handRow.children[k] as HTMLElement;
                    const cardData = (isMe && player.hand) ? player.hand[k] : null;
                    animateFlyer(playRect, target, cardData, isMe); 
                    await wait(DEAL_INTERVAL_MS);
                }
            }
        }
    }
    await wait(FLIGHT_DURATION_MS - DEAL_INTERVAL_MS);
    SoundManager.play('card-land');
    dealingOrder.forEach(p => {
        if (p.id === myPlayerId) revealMyHand(Math.min(p.handCount || 0, 5));
        else revealOpponentHand(p.id);
    });
    await wait(PHASE_PAUSE_MS);

    // PHASE D: START GAME FLIP (Play Source -> Draw Target)
    await animatePlayToDraw(gameState);
    
    // FINAL COMMIT: This makes all cards "stick" and restores normal UI behavior
    renderGameState(gameState, myPlayerId, null, { skeletonMode: false });
    
    // Wait an extra second before showing the "LET'S GO!" overlay
    await wait(1000);
    
    await showStartOverlay();
    
    // Signal server that animations are complete so CPU can take their turn
    const stateModule = await import('./state.js');
    await stateModule.socketReady;
    const activeSocket = stateModule.socket;
    if (activeSocket?.connected) {
        activeSocket.emit(ANIMATIONS_COMPLETE);
    } else {
        console.warn('[DealingAnimation] Socket not ready to emit animations complete');
    }
}

// --- HELPERS ---

function getTarget(playerId: string, type: 'up'|'down', index: number): HTMLElement | null {
    const col = document.querySelector(`.player-area[data-player-id="${playerId}"] .stack-row > div:nth-child(${index+1})`);
    if (!col) return null;
    
    if (type === 'up') {
        // Try to find existing up-card container or img
        const upCardContainer = col.querySelector('.card-container.up-card') as HTMLElement;
        if (upCardContainer) {
            // Return the card-img inside for accurate positioning
            const upCardImg = upCardContainer.querySelector('.card-img') as HTMLElement;
            return upCardImg || upCardContainer;
        }
    } else if (type === 'down') {
        // For down cards, also try to find the actual card element
        const downCardContainer = col.querySelector('.card-container.down-card') as HTMLElement;
        if (downCardContainer) {
            const downCardImg = downCardContainer.querySelector('.card-img') as HTMLElement;
            return downCardImg || downCardContainer;
        }
    }
    
    return col as HTMLElement;
}

function revealGroup(playerId: string, type: 'up'|'down', count: number) {
    for(let i=0; i<count; i++) {
        const col = document.querySelector(`.player-area[data-player-id="${playerId}"] .stack-row > div:nth-child(${i+1})`);
        if (col) {
            // Target ONLY the specific card class to avoid revealing the wrong one
            const targetClass = type === 'up' ? '.up-card' : '.down-card';
            const cardEl = col.querySelector(targetClass) as HTMLElement;
            if (cardEl) {
                const img = cardEl.querySelector('.card-img') as HTMLElement || cardEl;
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
    for(let i=0; i<count; i++) {
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
    const area = document.querySelector(`.player-area[data-player-id="${playerId}"]`);
    if (!area) return;
    area.querySelectorAll('.hand-row .card-img').forEach(c => {
        (c as HTMLElement).style.visibility = 'visible';
        (c as HTMLElement).style.opacity = '1';
    });
    const badge = area.querySelector('.hand-count-badge') as HTMLElement;
    if (badge) badge.style.visibility = 'visible';
}

function animateFlyer(fromRect: DOMRect, toElem: HTMLElement, cardData: Card | null, isFaceUp: boolean) {
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

function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function animatePlayToDraw(gameState: GameStateData) {
    const source = document.getElementById('deck-pile'); // "Play" (deck source)
    const target = document.getElementById('play-pile'); // "Draw" (the actual stack where the starter card goes)
    if (!source || !target) return;
    
    const topCard = gameState.pile?.[gameState.pile.length - 1] || null;
    animateFlyer(source.getBoundingClientRect(), target, topCard, true);
    await wait(FLIGHT_DURATION_MS);
    
    SoundManager.play('card-land');
    if (topCard) {
        target.innerHTML = '';
        target.appendChild(cardImg(topCard, false, undefined, false, false));
    }
}

async function showStartOverlay() {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: '10000', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 70%)'
    });

    const text = document.createElement('h1');
    text.textContent = "LET'S GO!";
    Object.assign(text.style, {
        color: '#ffe94d', fontSize: '5rem', fontFamily: 'Impact, sans-serif',
        textTransform: 'uppercase', textShadow: '0 0 30px rgba(255,233,77,0.9), 0 0 50px rgba(255,195,0,0.7)',
        transform: 'scale(0)', transition: 'transform 0.3s cubic-bezier(0.17, 0.67, 0.83, 0.67)'
    });

    overlay.appendChild(text);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => text.style.transform = 'scale(1.2)');
    SoundManager.play('game-start');
    await wait(800);
    
    text.style.opacity = '0';
    text.style.transform = 'scale(2)';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    
    await wait(300);
    overlay.remove();
}
