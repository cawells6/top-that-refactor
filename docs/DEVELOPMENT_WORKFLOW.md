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
  if (!nameInput.value) { /* validation */ }
  joinButton.disabled = true /* UI */
  socket.emit('join-game', payload) /* Network - skipped app layer */
}

// ✅ Good: Clear separation, proper layering
function handleJoinGameClick() {
  const payload = validateJoinForm() // UI layer validation
  if (!payload.isValid) {
    showValidationErrors(payload.errors)
    return
  }
  
  gameService.joinExistingGame(payload) // Application layer
    .then(result => showJoinSuccess(result)) // UI layer
    .catch(error => showJoinError(error))   // UI layer
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
