# Join Game Button – Source Map

This repo currently has **two** Join Game button representations:

1) **App button (authoritative)**: the one rendered in `public/index.html`.
2) **Standalone export**: `exports/button-export/join-button.html` + `exports/button-export/button.css`.

## Figma-ready bundle (app-accurate)

- Markup: `exports/button-export/join-game-button.template.html`
- Styles: `exports/button-export/join-game-button.template.css`
- App click logic excerpt: `exports/button-export/join-game-button.logic.snippet.ts`

## App sources that affect the button

### Markup

- `public/index.html` (the `#join-enter-button` element + nested layers)

### CSS (load order in `public/index.html`)

1. `public/styles/components.css`
   - Defines the reusable `.pill-button` template, variants (like `.pill-button--green`), and internal layers:
     `.deep-shadow`, `.pulsing-glow`, `.outer-gold-ring`, `.button-base`,
     `.gloss-sweep`, `.top-highlight`, `.text-container`, `.text-shadow`,
     `.text-main`, `.bottom-shadow`.

2. `public/style.css`
   - Contains ID-based rules that include `#join-enter-button` (font + gold hover/active).

3. `public/styles/lobby.css`
   - Contains **Figma v1 scaling wrapper** rules:
     `#lobby-container .host-selection-rectangle #join-enter-button.lets-play-btn.play-button-container { ... }`
   - Contains `:disabled` behavior (opacity/cursor) for the scaled button.
   - Contains `.lobby-actions button { font-family: inherit !important; }` which overrides the `font-family` set in `public/style.css`.
   - Contains **conflicting legacy/alternate** `#join-enter-button { ... !important }` rules (blue background/border) that override the gold hover/active from `public/style.css`.

### Fonts / inherited defaults

- `public/index.html` loads Google Fonts (`Space Grotesk`, `Bebas Neue`, etc).
- `public/style.css` sets `body { font-family: var(--game-font); }` where `--game-font` defaults to `Space Grotesk`.

### JS

- `public/scripts/events.ts` wires the click handler and toggles the `disabled` state (which changes CSS `:disabled`).
