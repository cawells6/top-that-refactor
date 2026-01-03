# Special Card Icon Visibility Fix

## Problem Identified

The 5 and 10 special card icons were not showing reliably because of a fundamental timing issue in the event sequence.

### Root Cause

The original flow was:
1. Card added to pile
2. `handleSpecialCard()` called - **modifies game state immediately** (clears pile for 10, adds copied card for 5)
3. `pushState()` called once - emits STATE_UPDATE with **already-modified** state

Result: Client received only ONE STATE_UPDATE (with the final result), never seeing the original special card.

### Why 2 Worked But 5/10 Didn't

- **2 (reset)**: Pile doesn't change - card stays visible → icon had time to display ✅
- **5 (copy)**: Pile changes (copied card added) → original 5 replaced immediately ❌
- **10 (burn)**: Pile cleared → card removed immediately ❌

The client-side delay mechanism was waiting for a second STATE_UPDATE that never came.

## Solution

Modified the server to emit **two STATE_UPDATEs** for special cards:

### New Event Sequence

1. Card added to pile
2. **STATE_UPDATE #1** emitted → Client sees special card on pile
3. SPECIAL_CARD_EFFECT emitted → Client shows icon animation
4. `handleSpecialCard()` modifies game state (burn/copy/reset)
5. **STATE_UPDATE #2** emitted → Client sees result

### Code Changes

**controllers/GameController.ts**
```typescript
// Before calling handleSpecialCard
if (specialEffectTriggered) {
  this.pushState(); // STATE_UPDATE #1 - show card on pile
}

handleSpecialCard(...); // Modify game state

// After handleSpecialCard
if (specialEffectTriggered) {
  this.pushState(); // STATE_UPDATE #2 - show result
}

// Skip final pushState for special cards (already emitted)
if (!specialEffectTriggered) {
  this.pushState();
}
```

**public/scripts/socketService.ts**
- Removed client-side delay mechanism (expectingBurnResult flag)
- Removed delayedStateUpdate tracking
- STATE_UPDATE now renders immediately
- Server handles all timing

## Testing Checklist

- [ ] 2 card shows icon, pile resets correctly
- [ ] 5 card shows icon, then shows copied card
- [ ] 10 card shows icon, then shows burned (empty) pile
- [ ] 4-of-a-kind shows burn icon, pile burns
- [ ] Multiple special cards in sequence work correctly
- [ ] CPU plays special cards without issues
- [ ] No visual glitches or timing issues

## Expected Behavior

All three special card types (2, 5, 10) should now work identically:
1. Card appears on pile
2. Icon animates for ~2 seconds
3. Result appears (reset/copy/burn)

The icon and special effects should be clearly visible before the pile changes.
