import { pathToFileURL } from 'url';
import { startServer, closeServer } from './server.js';

const DEFAULT_PORT = 3000;
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;

// Only auto-start if executed directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(PORT).catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

  // Graceful shutdown logic
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT', 'SIGUSR2'];
  signals.forEach((signal) => {
    process.on(signal, () => {
      console.log(`\n${signal} signal received...`);
      closeServer()
        .then(() => {
          if (signal === 'SIGUSR2') {
            process.kill(process.pid, 'SIGUSR2');
          } else {
            process.exit(0);
          }
        })
        .catch((err) => {
          console.error('Error during shutdown:', err);
          process.exit(1);
        });
    });
  });
}
