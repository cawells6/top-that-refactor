# Top That! Refactor

The most important rule of this project is accuracy. I want whatever code is written by AI to be accurate and holistic. It can take as long as it needs to, but it must be accurate. If it is not accurate, it will be rejected. I want AI to be the expert and dig into issues as much as possible to help me cultivate ideas and build a top-tier game.

This project hosts a refactored implementation of the **Top That!** card game. The server is written in TypeScript using Express and Socket.IO while the client is served through Vite.

## Getting Started

1. Install all dependencies:

   ```bash
   npm install
   ```

2. Start both the server and client in development mode (with hot reload):

   ```bash
   npm run dev:all
   ```

   The server defaults to port `3000` but will automatically try the next available port if it is already in use. Open `http://localhost:3000` (or whatever port is chosen) to load the client.

3. To run only the server in development you can use:

   ```bash
   npm run dev
   ```

   or run the server and client separately using `npm run dev:server` and `npm run dev:client`.

4. Build for production and start the compiled server:

   ```bash
   npm run build       # compile TypeScript
   npm run build:client
   npm start           # start server from dist/
   ```

5. Run the test suite with Jest:

   ```bash
   npm test
   ```

## Project Structure

- **server.ts** – application entry point creating the Express/Socket.IO server
- **controllers**, **models**, **utils** – game logic and helpers
- **public/** – front‑end assets served via Vite
- **tests/** – unit tests

Enjoy the game and feel free to contribute!

## Lobby and Invite Links

After clicking **LET'S PLAY** the game creates a room. If you selected bots and
are the only human, the match begins automatically. When additional humans are
expected a waiting screen shows a join link and QR code you can share. Use the
**Copy Link** or **Share** button to quickly invite friends. Players may also
enter the six character code from the lobby screen and press **Join Game** to
enter the room manually.

## Lobby Layout & Stabilization: Maintenance Guide

**All lobby centering, sizing, and stabilization is now handled by CSS and HTML classes.**

### If you need to update the lobby layout (centering, sizing, or fix a layout bug):

1. **Edit these CSS files:**
   - `public/styles/immediate-fix.css` – Ensures the lobby modal is centered and visible from the first render. Prevents jumps or flashes.
   - `public/style.css` – Controls main modal and content sizing (`.lobby-modal-container`, `.game-setup-content`).
   - `public/styles/modals.css` – Ensures modal content is flex-centered vertically and horizontally.

2. **Initial hiding/reveal:**
   - The `.preload` and `.loaded` classes on `<html>` in `public/index.html` control initial hiding and reveal to prevent FOUC (flash of unstyled content).
   - The inline script in `index.html` removes `.preload` after all resources load.

3. **No JavaScript stabilization scripts are needed.**
   - All legacy JS stabilization scripts have been removed.
   - If you see references to `position-fix.js`, `layout-stabilizer.js`, `simple-layout-stabilizer.js`, or `initial-layout-stabilizer.js`, they are obsolete and can be ignored or deleted.

4. **How to debug or update:**
   - If the lobby appears off-center, jumps, or has sizing issues, start by checking the three CSS files above.
   - Each file now contains a comment block at the top explaining its role and what to update.
   - The HTML structure for the lobby modal is in `public/index.html` (look for `#lobby-container`, `.lobby-modal-container`, `.game-setup-content`).

5. **For future maintainers:**
   - If you need to change the lobby/modal layout, update the CSS files above. The comment blocks will guide you.
   - No JS changes are required for layout/stabilization.
   - If you add new modals or containers, follow the same CSS patterns for centering and sizing.

**Summary:**

- All lobby layout and stabilization is now clean, modern, and CSS-driven.
- See the top of each relevant CSS file for maintenance instructions.
- No JS stabilization code remains or is needed.

If you have questions or need to update the lobby layout, start with the files above!
