# 🎮 How to Adjust Game Timing

## Enable Timing Diagnostics

### In Your Browser (While Game is Running):

1. **Open Developer Console:** Press `F12` (or `Ctrl+Shift+I`)
2. **Go to Console tab**
3. **Enable diagnostics:**
   ```javascript
   localStorage.setItem('DEBUG_TIMING', '1')
   ```
4. **Refresh the page:** `F5` or `Ctrl+R`

Now every timing event will be logged! Look for messages like:
```
[TIMING +0ms] SPECIAL_CARD_EFFECT received
[TIMING +450ms] ANIMATION_DELAY_MS expired
[TIMING +1000ms] BURN_TURN_HOLD_MS expired
```

### To See a Full Report:
```javascript
window.timingDiag.getReport()
```

### To Disable:
```javascript
localStorage.removeItem('DEBUG_TIMING')
```

---

## ⚡ Tweak Timing Constants

### File to Edit: `src/shared/constants.ts`

Open that file and find these lines (around lines 75-95):

```typescript
/**
 * General animation delay between sequential card plays
 * Currently: 450ms
 */
export const ANIMATION_DELAY_MS = 450;

/**
 * Duration the UI pauses after a burn (invalid play) before continuing
 * Currently: 1000ms
 */
export const BURN_TURN_HOLD_MS = 1000;
```

### Recommended Changes for Faster Gameplay:

#### Option 1: Conservative (Slightly Faster)

```typescript
export const ANIMATION_DELAY_MS = 350;     // Was 450 (-100ms)
export const BURN_TURN_HOLD_MS = 700;      // Was 1000 (-300ms)
```
**Total reduction: ~400ms**

#### Option 2: Snappy (Noticeably Faster)

```typescript
export const ANIMATION_DELAY_MS = 250;     // Was 450 (-200ms)
export const BURN_TURN_HOLD_MS = 500;      // Was 1000 (-500ms)
```
**Total reduction: ~700ms**

#### Option 3: Very Fast (Power User)

```typescript
export const ANIMATION_DELAY_MS = 150;     // Was 450 (-300ms)
export const BURN_TURN_HOLD_MS = 300;      // Was 1000 (-700ms)
```
**Total reduction: ~1000ms (1 second faster!)**

---

## 🔄 After Changing Constants

1. **Save the file**
2. The dev server should **auto-reload** (if you're using `npm run dev` or `./run`)
3. **Refresh your browser** to see the changes
4. **Play a 10 card** and see if it feels better!

---

## 💡 Pro Tips

1. **Start conservative** (Option 1) and work your way faster
2. **Test with CPU players** - they use `CPU_SPECIAL_DELAY_MS` which is 3000ms!
3. **Watch for "too fast"** - players need time to see what happened
4. **Different delays for different cards?** - You could add special handling in `socketService.ts` to use different delays based on card type

---

## 📊 All Adjustable Constants

Here are all the timing constants you can adjust in `src/shared/constants.ts`:

| Constant | Default | Description |
|----------|---------|-------------|
| `TURN_TRANSITION_DELAY_MS` | 400ms | Server delay between turns |
| `CPU_TURN_DELAY_MS` | 2000ms | CPU thinking time (normal moves) |
| `CPU_SPECIAL_DELAY_MS` | 3000ms | CPU thinking time (special cards) |
| `TAKE_PILE_BLANK_MS` | 1000ms | Pile blank duration when picked up |
| `DECK_TO_PILE_ANIMATION_MS` | 550ms | Card flip from deck to pile |
| `POST_FLIP_RENDER_BUFFER_MS` | 50ms | Buffer after flip animation |
| `ANIMATION_DELAY_MS` | 450ms | General card play delay ⭐ |
| `BURN_TURN_HOLD_MS` | 1000ms | Hold after burn effect ⭐ |
| `BOT_THINKING_TIME` | 450ms | Bot animation thinking time |
| `SAFETY_UNLOCK_MS` | 10000ms | Failsafe unlock timeout |

⭐ = Most impactful for gameplay feel
