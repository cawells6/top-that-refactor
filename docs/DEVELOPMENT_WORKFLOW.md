# Development Workflow Checklist

## Before Starting Any Feature

### 1. Contract Definition (5 minutes)

- [ ] What does this feature need from other layers?
- [ ] What does this feature provide to other layers?
- [ ] Are there existing similar patterns to follow?
- [ ] Document the expected interface in TypeScript

### 2. Domain Clarity (5 minutes)

- [ ] Is this a new domain or extending existing?
- [ ] What are the clear boundaries of this feature?
- [ ] How does this relate to other domains?
- [ ] Are we mixing concerns that should be separate?

### 3. Layer Identification (5 minutes)

- [ ] Which layer does this feature belong in?
- [ ] What layers does it depend on?
- [ ] What layers depend on it?
- [ ] Are we skipping layers inappropriately?

### 4. Test Strategy (10 minutes)

- [ ] What should the test environment provide?
- [ ] Which layer should tests mock?
- [ ] What are the success/failure scenarios?
- [ ] Write at least one failing test before implementing

## During Implementation

### 5. Interface First (15 minutes)

- [ ] Define TypeScript interfaces for all public methods
- [ ] Make tests pass with minimal implementation
- [ ] Ensure interface matches the contract defined in step 1

### 6. Implementation (varies)

- [ ] Follow the layer boundaries identified in step 3
- [ ] Don't add features not covered by tests
- [ ] Keep the domain boundaries clean from step 2

### 7. Integration Testing (10 minutes)

- [ ] Test crosses layer boundaries correctly
- [ ] Environment assumptions are documented
- [ ] No hardcoded values that should be configurable

## After Implementation

### 8. Architecture Review (10 minutes)

- [ ] Does this follow existing patterns?
- [ ] Are layer boundaries still clear?
- [ ] Would a new developer understand this code?
- [ ] Update documentation if patterns changed

### 9. Contract Verification (5 minutes)

- [ ] Run tests to ensure contracts are satisfied
- [ ] Check that no existing contracts were broken
- [ ] Update contract documentation if needed

## Red Flags to Watch For

🚨 **Stop and reconsider if you see:**

- Tests mocking different layers than production code uses
- Validation logic duplicated between client and server
- Business logic mixed with UI concerns
- Direct calls across multiple layers (UI → Transport)
- Tests requiring extensive DOM setup for unit tests
- Multiple unrelated responsibilities in one function
- Hardcoded values that vary between environments

## Example Application

```typescript
// ❌ Bad: Mixed concerns, skipped layers, unclear domain
function handleJoinGameClick() {
  // Validation + UI + Network all mixed together
  if (!nameInput.value) {
    /* validation */
  }
  joinButton.disabled = true; /* UI */
  socket.emit('join-game', payload); /* Network - skipped app layer */
}

// ✅ Good: Clear separation, proper layering
function handleJoinGameClick() {
  const payload = validateJoinForm(); // UI layer validation
  if (!payload.isValid) {
    showValidationErrors(payload.errors);
    return;
  }

  gameService
    .joinExistingGame(payload) // Application layer
    .then((result) => showJoinSuccess(result)) // UI layer
    .catch((error) => showJoinError(error)); // UI layer
}
```

## Time Investment

- **Setup time**: ~30 minutes per feature upfront
- **Implementation time**: Same or slightly longer initially
- **Debugging time**: Dramatically reduced
- **Refactoring time**: Much easier and safer
- **Onboarding time**: New developers understand faster

## ROI Calculation

**Cost**: 30 minutes upfront planning
**Savings**: Hours of debugging, days of refactoring, weeks of onboarding

The debugging session we just completed would have been avoided entirely with this workflow.

---

## UI/CSS Debugging Best Practices

### Critical Rules for Preventing Click Interception Issues

#### 1. Use Data Attributes for Application State

Instead of relying on complex CSS classes that might conflict, use data attributes on `<body>` or main wrapper:

```css
/* Clear, explicit state management */
body[data-game-state='lobby'] #game-table {
  display: none !important;
  pointer-events: none !important;
}

body[data-game-state='playing'] #lobby-container {
  display: none !important;
  pointer-events: none !important;
}
```

**Why this matters:**

- Single source of truth for UI state
- Eliminates CSS specificity battles
- Easy to debug: `console.log(document.body.dataset.gameState)`
- TypeScript: `document.body.dataset.gameState = 'playing'`

#### 2. Always Use `pointer-events: none` on Hidden Elements

For any element that is hidden, faded, or transitioning out, **always** add `pointer-events: none`:

```css
.modal.hidden,
.overlay.fading-out,
[data-game-state='playing'] #lobby-container {
  opacity: 0;
  pointer-events: none !important; /* ← Critical! */
}
```

**Why this matters:**

- `opacity: 0` makes elements invisible but still clickable
- `display: none` can be overridden by `!important` elsewhere
- `pointer-events: none` ensures clicks pass through even if element is visible
- Prevents "invisible overlay" bugs like we just fixed

#### 3. The Visual Debugger Snippet

When buttons feel "dead" or clicks aren't registering, use this in your browser console:

```javascript
// Outlines every element on the page with a random color
$$('*').forEach(
  (el) =>
    (el.style.outline =
      '1px solid #' + Math.floor(Math.random() * 16777215).toString(16))
);
```

**Alternative for detailed analysis:**

```javascript
// Click event listener that logs everything
document.addEventListener(
  'click',
  (e) => {
    console.log('Clicked:', e.target);
    console.log(
      'All buttons:',
      Array.from(document.querySelectorAll('button')).map((b) => ({
        id: b.id,
        text: b.textContent?.trim(),
        visible: window.getComputedStyle(b).display !== 'none',
      }))
    );
  },
  true
);
```

#### 4. Debugging Checklist for "Button Not Working" Issues

Before assuming the button's logic is broken:

1. **Verify the click reaches the element:**

   ```javascript
   document.addEventListener(
     'click',
     (e) => console.log('Clicked:', e.target.id, e.target.className),
     true
   );
   ```

2. **Check computed styles:**

   ```javascript
   const btn = document.getElementById('your-button');
   console.log('Display:', window.getComputedStyle(btn).display);
   console.log('Pointer-events:', window.getComputedStyle(btn).pointerEvents);
   console.log('Z-index:', window.getComputedStyle(btn).zIndex);
   ```

3. **List all elements at click position:**

   ```javascript
   document.addEventListener(
     'click',
     (e) => {
       const elements = document.elementsFromPoint(e.clientX, e.clientY);
       console.log(
         'Elements at click point:',
         elements.map((el) => el.id || el.className)
       );
     },
     true
   );
   ```

4. **Check for overlays:**
   - Use the visual debugger snippet above
   - Look for elements with `opacity: 0` but no `pointer-events: none`
   - Check `z-index` values and stacking contexts

#### 5. CSS Specificity Rules

When using `!important` (use sparingly):

- State-based hiding rules should use `!important` if base styles do
- Always pair with `pointer-events: none !important`
- Document why `!important` is needed in comments

```css
/* !important needed because lobby-container has display: flex !important for layout */
body[data-game-state='playing'] #lobby-container {
  display: none !important;
  pointer-events: none !important;
}
```

### Lesson from Recent Bug Fix

**Problem**: Take button appeared to work intermittently
**Root Cause**: Hidden lobby overlay (`opacity: 0`) was still clickable and intercepting events
**Solution**: Added `pointer-events: none !important` to hidden states
**Prevention**: Follow rules 1, 2, and 4 above

**Key Insight**: When a button "doesn't work," debug in this order:

1. Click event reaching correct element? (Event propagation)
2. Element in correct state? (CSS computed styles)
3. Handler executing? (JavaScript logic)
4. Logic correct? (Business rules)

Don't skip to step 4 first!
