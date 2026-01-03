// public/scripts/specialEffects.ts
// Focused special card effects for the discard pile

export type SpecialCardType = 'two' | 'five' | 'ten' | 'four' | 'invalid' | 'take';

interface SpecialCardEffect {
  type: SpecialCardType;
}

/**
 * Main function to trigger special card pile effects
 */
export function playSpecialCardEffect(effect: SpecialCardEffect): void {
  console.log('[SpecialEffects] Playing effect:', effect.type);
  
  const pileCard = document.getElementById('pile-top-card');
  const pileContainer = document.getElementById('discard-pile');
  
  console.log('[SpecialEffects] Found elements:', {
    pileCard: !!pileCard,
    pileContainer: !!pileContainer
  });
  
  if (!pileCard && !pileContainer) {
    console.warn('[SpecialEffects] No pile found for special effect');
    return;
  }

  // Haptic feedback for mobile
  triggerHaptics(effect.type);

  // Pile animation based on card type
  if (pileCard) {
    console.log('[SpecialEffects] Adding slam animation to card');
    // Add slam animation to the played card
    pileCard.classList.add('special-card-slam');
    setTimeout(() => pileCard.classList.remove('special-card-slam'), 600);
  }

  // Add glow effect to pile container
  if (pileContainer) {
    const glowColor = getEffectColor(effect.type);
    console.log('[SpecialEffects] Adding glow effect with color:', glowColor);
    pileContainer.style.setProperty('--glow-color', glowColor);
    pileContainer.classList.add('special-glow');
    setTimeout(() => pileContainer.classList.remove('special-glow'), 1000);
  }

  // Explosive effects for 10 and 4-of-a-kind
  if (effect.type === 'ten' || effect.type === 'four') {
    console.log('[SpecialEffects] Creating burst effect');
    if (pileContainer) {
      createPileBurst(pileContainer, effect.type);
    }
    // Quick screen flash
    triggerScreenFlash(getEffectColor(effect.type));
  }
}

/**
 * Create particle burst from pile
 */
function createPileBurst(container: HTMLElement, type: SpecialCardType): void {
  const burst = document.createElement('div');
  burst.className = 'pile-burst';
  
  const color = getEffectColor(type);
  const particleCount = 12;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    const angle = (i / particleCount) * Math.PI * 2;
    const distance = 60 + Math.random() * 40;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    
    particle.className = 'burst-particle';
    particle.style.cssText = `
      position: absolute;
      width: 8px;
      height: 8px;
      background: ${color};
      border-radius: 50%;
      top: 50%;
      left: 50%;
      box-shadow: 0 0 8px ${color};
      --tx: ${tx}px;
      --ty: ${ty}px;
    `;
    burst.appendChild(particle);
  }
  
  container.appendChild(burst);
  setTimeout(() => burst.remove(), 800);
}

/**
 * Subtle screen flash
 */
function triggerScreenFlash(color: string): void {
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
    background: ${color};
    opacity: 0;
    animation: quickFlash 0.4s ease-out;
  `;
  
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 400);
}

/**
 * Trigger haptic feedback on mobile devices
 */
function triggerHaptics(type: SpecialCardType): void {
  if (!('vibrate' in navigator)) return;

  const patterns: Record<SpecialCardType, number[]> = {
    two: [20],
    five: [15, 10, 15],
    ten: [30, 20, 30],
    four: [40, 20, 40],
    invalid: [10],
    take: [15]
  };

  navigator.vibrate(patterns[type]);
}

/**
 * Get color for effect type
 */
function getEffectColor(type: SpecialCardType): string {
  const colors: Record<SpecialCardType, string> = {
    two: '#3b82f6',      // Blue (reset)
    five: '#a855f7',     // Brighter purple (copy)
    ten: '#f97316',      // Orange (burn)
    four: '#ef4444',     // Red (bomb)
    invalid: '#dc2626',  // Dark red
    take: '#fbbf24'      // Yellow/gold
  };
  return colors[type] || '#ffc300';
}

/**
 * Create confetti effect for victories
 */
export function createConfetti(count: number = 300): void {
  const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f7dc6f', '#e74c3c'];
  const container = document.createElement('div');
  container.className = 'confetti-container';
  container.style.cssText = `
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 10000;
  `;
  
  for (let i = 0; i < count; i++) {
    const confetti = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 8 + Math.random() * 6;
    const left = Math.random() * 100;
    const duration = 2 + Math.random() * 3;
    const delay = Math.random() * 0.5;
    const rotation = Math.random() * 360;
    const xMovement = (Math.random() - 0.5) * 100;
    
    confetti.style.cssText = `
      position: fixed;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      left: ${left}%;
      top: -20px;
      opacity: ${0.6 + Math.random() * 0.4};
      transform: rotate(${rotation}deg);
      animation: confettiFall ${duration}s linear forwards;
      animation-delay: ${delay}s;
      --x-movement: ${xMovement}px;
    `;
    container.appendChild(confetti);
  }
  
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 6000);
}

/**
 * Show victory celebration
 */
export function celebrateVictory(playerName: string): void {
  createConfetti(400);
  
  const banner = document.createElement('div');
  banner.className = 'victory-banner';
  banner.innerHTML = `
    <div class="victory-crown">👑</div>
    <h1 class="victory-title">${playerName} Wins!</h1>
    <p class="victory-subtitle">One Crown. Zero Mercy.</p>
  `;
  banner.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.5);
    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%);
    color: #4a2511;
    padding: 3rem 4rem;
    border-radius: 30px;
    text-align: center;
    box-shadow: 
      0 30px 90px rgba(0,0,0,0.4),
      inset 0 2px 0 rgba(255,255,255,0.5);
    animation: victorySlide 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    z-index: 10000;
    border: 4px solid #b8860b;
  `;
  
  document.body.appendChild(banner);
  
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200, 100, 400]);
  }
  
  setTimeout(() => {
    banner.style.animation = 'fadeOutScale 0.5s ease-out forwards';
    setTimeout(() => banner.remove(), 500);
  }, 4000);
}
