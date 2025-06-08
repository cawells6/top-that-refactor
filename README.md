# Top That! Refactor

The most important rule of this project is accuracy. I want whatever code is written by AI to be accurate and holistic. It can take as long as it needs to, but it must be accurate. If it is not accurate, it will be rejected. I want AI to be the expert and dig into issues as much as possible to help me cultivate ideas and build a top-tier game.

This project hosts a refactored implementation of the **Top That!** card game.  The server is written in TypeScript using Express and Socket.IO while the client is served through Vite.

## Getting Started

1. Install all dependencies:

   ```bash
   npm install
   ```

2. Start both the server and client in development mode (with hot reload):

   ```bash
   npm run dev:all
   ```

   The server defaults to port `3000` but will automatically try the next available port if it is already in use.  Open `http://localhost:3000` (or whatever port is chosen) to load the client.

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
**Copy Link** button to quickly send the invite. When everyone has joined press
the **Start Game** button to deal the cards.
