import { createApp } from './app.js';
import { env } from './config/env.js';
import { pruneExpiredTokens } from './lib/tokens.js';
import { closeDatabase, initializeDatabase, waitForDatabase } from './lib/db.js';
import { maybeSeed } from './db/seed.js';

await waitForDatabase();
await initializeDatabase();
await maybeSeed();

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`\n  CANJEA API · http://localhost:${env.PORT}/api  ·  ${env.NODE_ENV}\n`);
});

const cleanup = setInterval(() => {
  void pruneExpiredTokens().catch((error) => console.error('[tokens:prune]', error));
}, 6 * 60 * 60 * 1000);
cleanup.unref();

let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n  ${signal} recibido, cerrando servidor…`);
  server.close(() => {
    void closeDatabase().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 8000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
