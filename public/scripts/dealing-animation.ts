import { GameStateData, ClientStatePlayer, Card } from '../../src/shared/types.js';
import { cardImg } from './render.js';

// --- CONFIGURATION ---
const DEAL_SPEED_MS = 100; // Delay between launching cards (Machine Gun effect)
const FLIGHT_DURATION_MS = 600; // How long a card is in the air
const START_MESSAGE_TEXT = "GAME ON!"; // <--- WORDSMITH HERE

/**
 * The Master Orchestrator for the Opening Ceremony.
 */
export async function performOpeningDeal(gameState: GameStateData, myPlayerId: string): Promise<void> {
    const deckElem = document.getElementById('deck-pile');
    if (!deckElem) return; // Safety check

    const deckRect = deckElem.getBoundingClientRect();

    // 1. Deal Face-Down Cards (Batch Style)
    // We deal ALL face-downs to Player 1, then ALL to Player 2...
    for (const player of gameState.players) {
        // We assume 3 face-down cards. Adjust if your game changes.
        for (let i = 0; i < 3; i++) {
            // Target the specific slot in the grid
            const targetId = getSlotId(player.id, 'down', i, myPlayerId);
            const targetElem = document.getElementById(targetId);
            
            if (targetElem) {
                // Deal it!
                animateFlyer(deckRect, targetElem, null, false); // null card = face down
                await wait(DEAL_SPEED_MS);
            }
        }
    }

    // 2. Deal Face-Up Cards (Batch Style)
    for (const player of gameState.players) {
        const upCards = player.upCards || [];
        for (let i = 0; i < 3; i++) {
            const targetId = getSlotId(player.id, 'up', i, myPlayerId);
            const targetElem = document.getElementById(targetId);
            
            if (targetElem && upCards[i]) {
                // Pass the actual card data so it flies face-up
                animateFlyer(deckRect, targetElem, upCards[i], true);
                await wait(DEAL_SPEED_MS);
            }
        }
    }

    // 3. Deal Hand Cards (Batch Style)
    for (const player of gameState.players) {
        const handCount = player.handCount || player.hand?.length || 0;
        
        // Optimization: Don't fly 20 cards if they have a huge hand. Cap it visually.
        const visualCount = Math.min(handCount, 5);
        
        // Target: Either their specific hand cards (local) or their avatar (opponent)
        const isMe = player.id === myPlayerId;
        
        for (let k = 0; k < visualCount; k++) {
            let targetElem: HTMLElement | null = null;
            
            if (isMe) {
                // For me, aim at specific hand slots if possible, or just the hand tray
                const handRow = document.querySelector('#my-area .hand-row');
                if (handRow && handRow.children[k]) {
                    targetElem = handRow.children[k] as HTMLElement;
                } else {
                    targetElem = handRow as HTMLElement;
                }
            } else {
                // For opponents, aim at their avatar/hand-stack
                targetElem = document.querySelector(`.player-area[data-player-id="${player.id}"] .hand-stack`);
                if (!targetElem) {
                    targetElem = document.querySelector(`.player-area[data-player-id="${player.id}"] .player-avatar`);
                }
            }

            if (targetElem) {
                // Hands are private, so fly face-down unless it's mine? 
                // Actually, usually in poker dealing, cards fly face-down to hands.
                // If you want YOUR cards to flip up on arrival, pass card data.
                const cardData = (isMe && player.hand && player.hand[k]) ? player.hand[k] : null;
                animateFlyer(deckRect, targetElem, cardData, !!cardData); 
                await wait(DEAL_SPEED_MS);
            }
        }
    }

    // 4. Wait for the last card to land + a tiny beat
    await wait(FLIGHT_DURATION_MS);

    // 5. Flash the "GAME ON!" Message
    await showStartOverlay();
}

/**
 * Creates a temporary flying card element
 */
function animateFlyer(fromRect: DOMRect, toElem: HTMLElement, cardData: Card | null, isFaceUp: boolean) {
    // TODO: SoundManager.play('deal-slide'); 

    const toRect = toElem.getBoundingClientRect();
    
    // Create the flyer
    const flyer = document.createElement('div');
    flyer.className = 'flying-card'; // Reuses your existing CSS
    
    // If it's face up, we need to render the front
    if (isFaceUp && cardData) {
        // We reuse your render logic to generate the inner HTML
        // But since cardImg returns a complex container, we simplify for the flyer
        // Or we just append the result of cardImg!
        const cardContent = cardImg(cardData, false);
        
        // Strip the container wrapper styles to fit the flyer
        flyer.style.background = 'none';
        flyer.style.border = 'none';
        flyer.appendChild(cardContent);
        
        // Ensure the inner image is visible immediately
        const img = cardContent.querySelector('img');
        if(img) img.style.visibility = 'visible';
    } 
    // If face down, the .flying-card CSS class already looks like a card back!

    // Position Start
    flyer.style.position = 'fixed';
    flyer.style.left = `${fromRect.left}px`;
    flyer.style.top = `${fromRect.top}px`;
    flyer.style.width = `${fromRect.width}px`;
    flyer.style.height = `${fromRect.height}px`;
    flyer.style.zIndex = '9999';
    flyer.style.transition = `all ${FLIGHT_DURATION_MS/1000}s cubic-bezier(0.2, 0.8, 0.2, 1)`;

    document.body.appendChild(flyer);

    // Trigger Animation (Next Frame)
    requestAnimationFrame(() => {
        flyer.style.left = `${toRect.left}px`;
        flyer.style.top = `${toRect.top}px`;
        // Optional: Add a slight rotation for flair
        flyer.style.transform = `rotate(${Math.random() * 10 - 5}deg)`;
    });

    // Cleanup
    setTimeout(() => {
        // TODO: SoundManager.play('card-land');
        flyer.remove();
    }, FLIGHT_DURATION_MS);
}

/**
 * Helper to get ID for grid slots. 
 * NOTE: You must update render.ts to add these IDs to the slots!
 */
function getSlotId(playerId: string, type: 'up' | 'down', index: number, myPlayerId: string): string {
    // Logic to match how render.ts creates elements.
    // We will update render.ts to add data-deal-target attributes to make this easier.
    return `deal-target-${playerId}-${type}-${index}`;
}

function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

    // TODO: SoundManager.play('game-start-gong');

    await wait(800);
    
    // Fade Out
    text.style.opacity = '0';
    text.style.transform = 'scale(2)';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    
    await wait(300);
    overlay.remove();
}
