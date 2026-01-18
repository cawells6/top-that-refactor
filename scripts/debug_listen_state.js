#!/usr/bin/env node
import fs from 'fs';
import { io } from 'socket.io-client';

async function getPort() {
  try {
    const txt = await fs.promises.readFile('current-port.txt', 'utf8');
    return txt.trim();
  } catch (e) {
    return '3000';
  }
}

async function main() {
  const port = await getPort();
  const url = `http://localhost:${port}`;
  console.log('Connecting to', url);
  const socket = io(url, { transports: ['websocket'] });
  socket.on('connect', () => console.log('connected', socket.id));
  socket.on('state-update', (data) => {
    console.log('state-update received. Players:');
    (data.players || []).forEach((p) => {
      console.log('-', p.id, 'name:', p.name, 'avatar:', p.avatar);
    });
  });
  socket.on('connect_error', (err) => {
    console.error('connect_error', err.message || err);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
