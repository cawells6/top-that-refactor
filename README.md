# Top That! Refactor

This project hosts the refactored **Top That!** card game. It includes a Node.js/Express backend with Socket.IO and a Vite powered front end located in the `public/` folder.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start both the server and Vite dev server:
   ```bash
   npm run dev:all
   ```
   The backend will choose an open port starting at `3000` and Vite serves the client on `http://localhost:5173`.

You can also run just the server with `npm run dev:server` or build the client with `npm run build:client`.

## Lobby Flow

Opening the site shows the lobby form where you enter your name and choose how many human and CPU players will take part. After clicking **LET'S PLAY** the client sends `join-game` to the server and switches to a waiting screen. The waiting view displays a shareable link and QR code so friends can join the same room. When everyone is ready the host presses **Start Game** which sends `start-game` with the selected CPU count. The server then deals the cards and pushes the initial game state.

## CPU Only Games

A bot–vs–bot match can be started from the command line. Run the smoke test script and set all players to CPUs:

```bash
node scripts/smoke-socket-client.cjs
```

Edit the player counts inside the script if you want more than two bots. Human players can join later by visiting the URL from the waiting screen or the link printed by the script. They connect using the same share link used in the regular lobby flow.
