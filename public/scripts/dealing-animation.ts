import { GameStateData, Card } from '../../src/shared/types.js';
import { cardImg, renderGameState } from './render.js';
import { SoundManager } from './SoundManager.js';

// --- CONFIGURATION ---
const DEAL_INTERVAL_MS = 100;
const FLIGHT_DURATION_MS = 600;
const PHASE_PAUSE_MS = 400;
const START_MESSAGE_TEXT = "LET'S PLAY!";

/**
 * The Master Orchestrator for the Opening Ceremony.
 * Implements strict Phase → Player → Group Reveal sequence.
 */
export async function performOpeningDeal(gameState: GameStateData, myPlayerId: string): Promise<void> {
    const playPileElem = document.getElementById('deck-pile'); // This is the "Play" source
    if (!playPileElem) return;

    const playPileRect = playPileElem.getBoundingClientRect();

    const players = gameState.players;
    const meIdx = myPlayerId ? players.findIndex((p) => p.id === myPlayerId) : -1;
    const dealingOrder = meIdx >= 0
      ? players.slice(meIdx).concat(players.slice(0, meIdx))
      : players.slice();

    // --- PHASE A: DOWN CARDS (Round Robin) ---
    for (let i = 0; i < 3; i++) {
        for (const player of dealingOrder) {
            const target = getTarget(player.id, 'down', i);
            if (target) {
                animateFlyer(playPileRect, target, null, false);
                await wait(DEAL_INTERVAL_MS);
            }
        }
    }
    await wait(FLIGHT_DURATION_MS - DEAL_INTERVAL_MS);
    SoundManager.play('card-land');
    dealingOrder.forEach(p => revealGroup(p.id, 'down', 3, true));
    await wait(PHASE_PAUSE_MS);

    // --- PHASE B: UP CARDS (Round Robin) ---
    for (let i = 0; i < 3; i++) {
        for (const player of dealingOrder) {
            const upCards = player.upCards || [];
            if (upCards[i]) {
                const target = getTarget(player.id, 'up', i);
                if (target) {
                    animateFlyer(playPileRect, target, upCards[i], true);
                    await wait(DEAL_INTERVAL_MS);
                }
            }
        }
    }
    await wait(FLIGHT_DURATION_MS - DEAL_INTERVAL_MS);
    SoundManager.play('card-land');
    dealingOrder.forEach(p => revealGroup(p.id, 'up', 3, true));
    await wait(PHASE_PAUSE_MS);

    // --- PHASE C: HAND CARDS (Round Robin) ---
    for (let k = 0; k < 5; k++) {
        for (const player of dealingOrder) {
            const handCount = player.handCount || player.hand?.length || 0;
            if (k < handCount) {
                const isMe = player.id === myPlayerId;
                let target: HTMLElement | null = null;
                if (isMe) {
                    const row = document.querySelector('#my-area .hand-row');
                    if (row && row.children[k]) target = row.children[k] as HTMLElement;
                } else {
                    target = document.querySelector(`.player-area[data-player-id="${player.id}"] .hand-stack`) || 
                             document.querySelector(`.player-area[data-player-id="${player.id}"] .player-avatar`);
                }
                if (target) {
                    const cardData = (isMe && player.hand) ? player.hand[k] : null;
                    animateFlyer(playPileRect, target, cardData, isMe);
                    await wait(DEAL_INTERVAL_MS);
                }
            }
        }
    }
    await wait(FLIGHT_DURATION_MS - DEAL_INTERVAL_MS);
    SoundManager.play('card-land');
    dealingOrder.forEach(p => {
        if (p.id === myPlayerId) revealMyHand(Math.min(p.handCount || 0, 5), true);
        else revealOpponentHand(p.id, true);
    });
    await wait(PHASE_PAUSE_MS);

    // --- PHASE D: INITIAL FLIP (Play to Draw) ---
    await wait(200);
    // Move first card from "Play" (deck) to "Draw" (discard)
    await animatePlayToDraw(gameState);
    
    // --- FINAL COMMIT: MAKE CARDS STICK ---
    // This turns off skeleton mode and resets standard rendering
    renderGameState(gameState, myPlayerId, null, { skeletonMode: false });
    
    await showStartOverlay();
}

// --- HELPER FUNCTIONS ---

function getTarget(playerId: string, type: 'up'|'down', index: number): HTMLElement | null {
    // Try ID first
    let el = document.getElementById(`deal-target-${playerId}-${type}-${index}`);
    // Fallback to structure
    if (!el) {
        el = document.querySelector(`.player-area[data-player-id="${playerId}"] .stack-row > div:nth-child(${index+1})`);
        if (el && type === 'up') el = el.querySelector('.up-card') || el;
    }
    return el as HTMLElement;
}

function revealGroup(playerId: string, type: 'up'|'down', count: number, suppressSound = false) {
    if (!suppressSound) SoundManager.play('card-land');
    for(let i=0; i<count; i++) {
        const target = getTarget(playerId, type, i);
        if (target) {
            // Reveal Card Image
            const img = target.querySelector('.card-img') as HTMLElement;
            if (img) {
                img.style.visibility = 'visible';
                img.style.opacity = '1'; // FIX: Reveal cards that were opacity:0
            }
            
            // Reveal Special Icon (if any)
            const icon = target.querySelector('.card-ability-icon') as HTMLElement;
            if (icon) icon.style.visibility = 'visible';
            
            // Reveal the container itself if it was hidden
            if (type === 'up' && target.classList.contains('card-container')) {
                target.style.visibility = 'visible';
            }
        }
    }
}

function revealMyHand(count: number, suppressSound = false) {
    if (!suppressSound) SoundManager.play('card-land');
    const handRow = document.querySelector('#my-area .hand-row');
    if (!handRow) return;
    
    for(let i=0; i<count; i++) {
        const slot = handRow.children[i];
        if (slot) {
            const img = slot.querySelector('.card-img') as HTMLElement;
            if (img) {
                img.style.visibility = 'visible';
                img.style.opacity = '1'; // FIX: Reveal opacity
            }
            const icon = slot.querySelector('.card-ability-icon') as HTMLElement;
            if (icon) icon.style.visibility = 'visible';
        }
    }
}

function revealOpponentHand(playerId: string, suppressSound = false) {
    if (!suppressSound) SoundManager.play('card-land');
    const area = document.querySelector(`.player-area[data-player-id="${playerId}"]`);
    if (!area) return;
    
    // FIX: Selector changed to .hand-row
    const cards = area.querySelectorAll('.hand-row .card-img');
    cards.forEach(c => {
        (c as HTMLElement).style.visibility = 'visible';
        (c as HTMLElement).style.opacity = '1'; // FIX: Reveal opacity
    });
    
    const badge = area.querySelector('.hand-count-badge') as HTMLElement;
    if (badge) badge.style.visibility = 'visible';
}

function animateFlyer(fromRect: DOMRect, toElem: HTMLElement, cardData: Card | null, isFaceUp: boolean) {
    SoundManager.play('card-slide');

    const toRect = toElem.getBoundingClientRect();
    const flyer = document.createElement('div');
    flyer.className = 'flying-card';

    if (isFaceUp && cardData) {
        // skeletonMode=false so flyer is visible immediately
        const content = cardImg(cardData, false, undefined, true, false); 
        flyer.style.background = 'none';
        flyer.style.border = 'none';
        flyer.appendChild(content);
        
        // Ensure content is visible
        const img = content.querySelector('img');
        if (img) img.style.visibility = 'visible';
    }

    Object.assign(flyer.style, {
        position: 'fixed',
        left: `${fromRect.left}px`,
        top: `${fromRect.top}px`,
        width: `${fromRect.width}px`,
        height: `${fromRect.height}px`,
        zIndex: '9999',
        pointerEvents: 'none',
        transition: `all ${FLIGHT_DURATION_MS/1000}s ease-out`
    });

    document.body.appendChild(flyer);

    requestAnimationFrame(() => {
        flyer.style.left = `${toRect.left}px`;
        flyer.style.top = `${toRect.top}px`;
        flyer.style.transform = `rotate(${Math.random() * 4 - 2}deg)`;
    });

    setTimeout(() => {
        flyer.remove();
    }, FLIGHT_DURATION_MS);
}

function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function animatePlayToDraw(gameState: GameStateData) {
    const source = document.getElementById('deck-pile'); // "Play"
    const target = document.getElementById('discard-pile'); // "Draw"
    if (!source || !target) return;
    
    const topCard = gameState.pile?.[gameState.pile.length-1] || null;
    
    animateFlyer(source.getBoundingClientRect(), target, topCard, true);
    await wait(FLIGHT_DURATION_MS);
    
    SoundManager.play('card-land');
    
    // Force a local render of just the pile so the card actually exists to be shown
    const playStack = target.querySelector('.play-stack') as HTMLElement;
    if (playStack && topCard) {
        playStack.innerHTML = '';
        const imgEl = cardImg(topCard, false, undefined, false, false);
        playStack.appendChild(imgEl);
        const countEl = target.querySelector('.pile-count');
        if (countEl) countEl.textContent = '1';
    }
}

async function showStartOverlay() {
    // Create Overlay
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: '10000', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 70%)'
    });

    const text = document.createElement('h1');
    text.textContent = START_MESSAGE_TEXT;
    Object.assign(text.style, {
        color: '#ffc300', fontSize: '5rem', fontFamily: 'Impact, sans-serif',
        textTransform: 'uppercase', textShadow: '0 0 20px rgba(255,195,0,0.5)',
        transform: 'scale(0)', transition: 'transform 0.3s cubic-bezier(0.17, 0.67, 0.83, 0.67)'
    });

    overlay.appendChild(text);
    document.body.appendChild(overlay);

    // Pop In
    requestAnimationFrame(() => text.style.transform = 'scale(1.2)');

    SoundManager.play('game-start');

    await wait(800);
    
    // Fade Out
    text.style.opacity = '0';
    text.style.transform = 'scale(2)';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    
    await wait(300);
    overlay.remove();
}
