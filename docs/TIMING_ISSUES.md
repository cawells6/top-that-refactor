# 🐛 TIMING ISSUE ANALYSIS - 10 Card Delays

## 🔍 Problem Identified

When playing a "10" card (which burns/clears the pile), there's a **compound delay** of approximately **1.9-2.4 seconds** before the next action happens. This is caused by multiple layers of intentional delays stacking together.

## ⏱️ Timing Breakdown for "10" Card

### Current Flow:
1. **Server processes 10 card** → Emits `SPECIAL_CARD_EFFECT`
2. **Client receives event** → Waits 50ms, shows card icon
3. **Animation delay** → `setTimeout(..., ANIMATION_DELAY_MS)` = **450ms**
4. **Ten-specific logic**:
   - Checks if pile is empty
   - Calls `renderGameState()` with held player ID
   - Calls `aqScheduleBurnHold()` → **Additional 1000ms (BURN_TURN_HOLD_MS)**
5. **Finally calls** `aqFinishAnimationSequence()`

### Total Delay: ~1.5-2.5 seconds

```
Event Trigger → 50ms → 450ms (ANIMATION_DELAY_MS) → 1000ms (BURN_TURN_HOLD_MS) → Action
```

## 📊 Relevant Constants

From `src/shared/constants.ts`:

```typescript
export const ANIMATION_DELAY_MS = 450;        // General animation delay
export const BURN_TURN_HOLD_MS = 1000;        // Burn effect hold time
export const TURN_TRANSITION_DELAY_MS = 400;  // Server turn transition
export const CPU_SPECIAL_DELAY_MS = 3000;     // CPU special card delay
```

## 🔧 Diagnostic Tools

### Enable Timing Diagnostics:

Open browser console and run:
```javascript
localStorage.setItem('DEBUG_TIMING', '1');
// Then refresh the page
```

### View Timing Report:
```javascript
window.timingDiag.getReport();
```

### Disable Diagnostics:
```javascript
localStorage.removeItem('DEBUG_TIMING');
// Or use: window.timingDiag.disable();
```

## 🎯 Key Code Locations

### 1. Special Card Effect Handler
**File:** `public/scripts/socketService.ts` (lines ~285-390)

```typescript
state.socket.on(SPECIAL_CARD_EFFECT, async (payload) => {
  // ... effect setup ...
  
  setTimeout(async () => {
    // This is where the ANIMATION_DELAY_MS happens (450ms)
    
    if (effectType === 'ten' || effectType === 'four-of-a-kind') {
      // ... render burn state ...
      
      // THIS adds another 1000ms (BURN_TURN_HOLD_MS)
      aqScheduleBurnHold(async () => {
        aqFinishAnimationSequence();
        await waitForTestContinue();
      });
      return;
    }
    // ...
  }, ANIMATION_DELAY_MS); // <-- 450ms delay
});
```

### 2. Burn Hold Scheduler
**File:** `public/scripts/animationQueue.ts` (line 176)

```typescript
export function scheduleBurnHold(callback: () => Promise<void> | void) {
  if (burnHoldTimer) clearTimeout(burnHoldTimer);
  burnHoldTimer = setTimeout(async () => {
    burnHoldTimer = null;
    await callback();
  }, BURN_TURN_HOLD_MS); // <-- Additional 1000ms
}
```

### 3. Server-Side Special Card Handler
**File:** `utils/CardLogic.ts` (lines ~48-55)

```typescript
else if (fourOfKindPlayed || isTenCard(lastPlayedNormalizedValue)) {
  const effectType = isTenCard(lastPlayedNormalizedValue) ? 'ten' : 'four-of-a-kind';
  io.to(roomId).emit(SPECIAL_CARD_EFFECT, {
    type: effectType,
    value: lastPlayedNormalizedValue,
  });
  burnPileAndForgetLastCard(gameState);
  pileClearedBySpecial = true;
}
```

## 🚨 Potential Issues

### 1. **Double Hold on Burns**
The "ten" card goes through:
- General animation delay (450ms)
- Burn-specific hold (1000ms)
- **Total: 1450ms** before turn advances

### 2. **Async Import Race Conditions**
```typescript
const latestState = (await import('./animationQueue.js')).getPendingStateUpdate();
const holdPlayerId = (await import('./animationQueue.js')).getCardsBeingAnimatedPlayerId();
```
These dynamic imports could add unpredictable delays (usually <50ms, but can spike).

### 3. **CPU Special Delay Multiplier**
If the next player is a CPU and a special card was played:
```typescript
this.processTurnTransition(this.turnTransitionDelayMs, {
  cpuDelayMs: specialEffectTriggered ? this.cpuSpecialDelayMs : undefined,
});
// cpuSpecialDelayMs = 3000ms!
```

## 💡 Potential Solutions

### Option 1: Reduce Burn Hold Time (Quick Fix)
```typescript
// In src/shared/constants.ts
export const BURN_TURN_HOLD_MS = 600; // Reduce from 1000ms
```

### Option 2: Eliminate Double Delay
Remove the `ANIMATION_DELAY_MS` wrapper for burn effects since they already have their own hold:

```typescript
// In socketService.ts, SPECIAL_CARD_EFFECT handler
if (effectType === 'ten' || effectType === 'four-of-a-kind') {
  // Handle immediately, don't wait for ANIMATION_DELAY_MS
  // Move this logic outside the setTimeout
}
```

### Option 3: Make Timing Configurable
Add a setting to let players choose animation speed:
- Fast: All delays × 0.5
- Normal: Current
- Cinematic: All delays × 1.5

## 📝 Testing Checklist

After making timing changes, test:

- [ ] 10 card burns pile with reasonable delay
- [ ] 4-of-a-kind burns pile
- [ ] 5 copies a 10 and burns pile
- [ ] CPU plays special cards (check CPU_SPECIAL_DELAY_MS)
- [ ] Multiple players playing in sequence
- [ ] Pile pickup after burn
- [ ] Game doesn't feel stuck or frozen

## 🎮 How to Reproduce Issue

1. Enable timing diagnostics: `localStorage.setItem('DEBUG_TIMING', '1')`
2. Start a game
3. Play a "10" card
4. Watch console for timing events
5. Note the delay between "SPECIAL_CARD_EFFECT:END" and next action

## 📊 Expected Console Output (with DEBUG_TIMING=1)

```
[TIMING +0ms] SPECIAL_CARD_EFFECT received
[TIMING +50ms] Showing card event icon
[TIMING +450ms] ANIMATION_DELAY_MS expired
[TIMING +10ms] Checking burn conditions
[TIMING +1000ms] BURN_TURN_HOLD_MS expired
[TIMING +5ms] finishAnimationSequence called
[TIMING +200ms] Next turn started
```

Total: ~1.7 seconds for the effect to complete.

## 🔗 Related Files

- `src/shared/constants.ts` - All timing constants
- `public/scripts/socketService.ts` - Network event handlers
- `public/scripts/animationQueue.ts` - Animation sequencing
- `utils/CardLogic.ts` - Server-side special card logic
- `controllers/GameController.ts` - Server game loop

---

**Last Updated:** Task #17 completion
**Status:** Issue documented, diagnostics added, solutions proposed
