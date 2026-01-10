# TODO — Top That Refactor
Random
Top of cards is cut off in hand on mobile. need to extend it.
Reduce size of cpu avatar
Computer doesn't always take it's turn when it's first

This is the short list of high-value improvements to keep us from losing track between sessions.

## 1) Multi‑Card Selection Is “Finicky” (Highest Priority)

We need to spread cards out so they can be clicked without affecting other cards

## 2) Terminology & Naming Consistency

- Standardize names across UI/logs/types: **Deck/Draw Pile** vs **Play/Discard Pile**.
- 

## 3) CSS Ownership Cleanup (Reduce “Frankenstein” Risk)

- Consolidate local-hand layout rules to a single source (avoid `layout.css` vs `game-board.css` duplication).
- Remove duplicate/conflicting selectors for `.hand-row--local .card-container`.

Discord Feedback Form
Task 1: Update server.ts (Backend)

    Add app.use(express.json()); near the top of the file (before routes) so we can parse JSON bodies.

    Create a POST endpoint /api/feedback.

        It should accept { type: string, message: string, context: object }.

        It should validate the input (ensure message isn't empty).

        It should send a fetch request to a Discord Webhook URL (stored in process.env.DISCORD_WEBHOOK_URL).

        Important: Use a "fire and forget" strategy—return success to the client immediately, don't make the user wait for Discord to respond.

Task 2: Create public/scripts/components/FeedbackModal.ts

    Create a class FeedbackModal that extends your existing Modal class (if applicable) or mimics the style of InSessionLobbyModal.

    UI Requirements:

        Title: "TELL THE DEV"

        Dropdown: "Bug Report" vs "Feature Idea" vs "General Love".

        Textarea: Large input for their message.

        Buttons: "Cancel" and "Send Feedback".

    Logic:

        On send, POST the data to /api/feedback.

        Show a toast or success message: "Thanks! The dev heard you."

        Close the modal.

Task 3: Expose the Button

    In the Lobby (public/index.html): Add a small "Feedback" link or icon in the footer or near the "Rules" button.

    In the Game (public/index.html): Add a "Feedback" option to the hamburger menu (#table-menu-button).

Technical Constraints:

    Do not expose the Discord Webhook URL to the client (browser). It must stay on the server.

    Match the CSS classes used in lobby.css (e.g., .header-btn, .modal, .game-setup-content) so it looks native.
