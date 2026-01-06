import { GameStateData, Card } from '../../src/shared/types.js';
import { cardImg } from './render.js';
import { SoundManager } from './SoundManager.js';

// --- CONFIGURATION ---
const DEAL_INTERVAL_MS = 150; // Speed between cards in a batch
const FLIGHT_DURATION_MS = 600; // Time in air
const PHASE_PAUSE_MS = 300; // Pause after a player finishes a phase
const START_MESSAGE_TEXT = "LET'S PLAY!";

/**
 * The Master Orchestrator for the Opening Ceremony.
 * Implements strict Phase → Player → Group Reveal sequence.
 */
export async function performOpeningDeal(gameState: GameStateData, myPlayerId: string): Promise<void> {
    const deckElem = document.getElementById('deck-pile');
    if (!deckElem) return;

    const deckRect = deckElem.getBoundingClientRect();

    // 1. Sort: Human First, then CPUs
    const myPlayer = gameState.players.find(p => p.id === myPlayerId);
    const opponents = gameState.players.filter(p => p.id !== myPlayerId);
    const dealingOrder = myPlayer ? [myPlayer, ...opponents] : opponents;
    const dealingOrder = myPlayer ? [myPlayer, ...opponents] : opponents;

    // --- PHASE A: DOWN CARDS (Player by Player) ---
    for (const player of dealingOrder) {
        const cardCount = 3; // Always 3 down cards
        
        // 1. Launch the batch
        for (let i = 0; i < cardCount; i++) {
            const target = getTarget(player.id, 'down', i);
            if (target) {
                animateFlyer(deckRect, target, null, false); // Face down
                await wait(DEAL_INTERVAL_MS);
            }
        }
        
        // 2. Wait for the last card to land
        await wait(FLIGHT_DURATION_MS - DEAL_INTERVAL_MS);
        
        // 3. REVEAL GROUP
        revealGroup(player.id, 'down', 3);
        await wait(PHASE_PAUSE_MS);
    }

    // --- PHASE B: UP CARDS (Player by Player) ---
    for (const player of dealingOrder) {
        const upCards = player.upCards || [];
        
        // 1. Launch the batch
        for (let i = 0; i < 3; i++) {
            const target = getTarget(player.id, 'up', i);
            if (target && upCards[i]) {
                // Face up flyer
                animateFlyer(deckRect, target, upCards[i], true);
                await wait(DEAL_INTERVAL_MS);
            }
        }
        
        // 2. Wait for land
        await wait(FLIGHT_DURATION_MS - DEAL_INTERVAL_MS);
        
        // 3. REVEAL GROUP (And Special Icons)
        revealGroup(player.id, 'up', 3);
        await wait(PHASE_PAUSE_MS);
    }

    // --- PHASE C: HAND CARDS (Player by Player) ---
    for (const player of dealingOrder) {
        const isMe = player.id === myPlayerId;
        const handCount = player.handCount || player.hand?.length || 0;
        const visualCount = Math.min(handCount, 5); // Cap at 5 for animation

        // 1. Launch the batch
        for (let k = 0; k < visualCount; k++) {
            let target: HTMLElement | null = null;
            
            if (isMe) {
                // My hand slots
                const handRow = document.querySelector('#my-area .hand-row');
                if (handRow && handRow.children[k]) target = handRow.children[k] as HTMLElement;
            } else {
                // Opponent stack
                target = document.querySelector(`.player-area[data-player-id="${player.id}"] .hand-stack`);
                if (!target) target = document.querySelector(`.player-area[data-player-id="${player.id}"] .player-avatar`);
            }

            if (target) {
                const cardData = (isMe && player.hand) ? player.hand[k] : null;
                animateFlyer(deckRect, target, cardData, isMe); // Face up for me, down for them
                await wait(DEAL_INTERVAL_MS);
            }
        }

        // 2. Wait for land
        await wait(FLIGHT_DURATION_MS - DEAL_INTERVAL_MS);
        
        // 3. REVEAL GROUP
        if (isMe) {
            revealMyHand(visualCount);
        } else {
            revealOpponentHand(player.id);
        }
        await wait(PHASE_PAUSE_MS);
    }

    // --- FINISH ---
    await wait(200);
    await animateDeckToDiscard(gameState);
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

function revealGroup(playerId: string, type: 'up'|'down', count: number) {
    SoundManager.play('card-land');
    for(let i=0; i<count; i++) {
        const target = getTarget(playerId, type, i);
        if (target) {
            // Reveal Card Image
            const img = target.querySelector('.card-img') as HTMLElement;
            if (img) img.style.visibility = 'visible';
            
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

function revealMyHand(count: number) {
    SoundManager.play('card-land');
    const handRow = document.querySelector('#my-area .hand-row');
    if (!handRow) return;
    
    for(let i=0; i<count; i++) {
        const slot = handRow.children[i];
        if (slot) {
            const img = slot.querySelector('.card-img') as HTMLElement;
            if (img) img.style.visibility = 'visible';
            const icon = slot.querySelector('.card-ability-icon') as HTMLElement;
            if (icon) icon.style.visibility = 'visible';
        }
    }
}

function revealOpponentHand(playerId: string) {
    SoundManager.play('card-land');
    const area = document.querySelector(`.player-area[data-player-id="${playerId}"]`);
    if (!area) return;
    
    // Reveal all stacked cards
    const cards = area.querySelectorAll('.hand-stack .card-img');
    cards.forEach(c => (c as HTMLElement).style.visibility = 'visible');
    
    const badge = area.querySelector('.hand-count-badge') as HTMLElement;
    if (badge) badge.style.visibility = 'visible';
}
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

async function animateDeckToDiscard(gameState: GameStateData) {
    const deck = document.getElementById('deck-pile');
    const discard = document.getElementById('discard-pile');
    if (!deck || !discard) return;
    
    const topCard = gameState.pile?.[gameState.pile.length-1] || null;
    
    // Fly it
    animateFlyer(deck.getBoundingClientRect(), discard, topCard, true);
    await wait(FLIGHT_DURATION_MS);
    
    // Reveal it
    SoundManager.play('card-land');
    if (discard) discard.style.opacity = '1';
    const img = discard.querySelector('.card-img') as HTMLElement;
    if (img) img.style.visibility = 'visible';
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
