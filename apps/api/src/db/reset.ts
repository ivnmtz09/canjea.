import { closeDatabase, initializeDatabase, pool, waitForDatabase } from '../lib/db.js';

await waitForDatabase();
await pool.query('DROP SCHEMA public CASCADE');
await pool.query('CREATE SCHEMA public');
console.info('  · Esquema público eliminado y recreado.');

await initializeDatabase();
console.info('  · Esquema PostgreSQL aplicado.');

const { seed } = await import('./seed.js');
await seed();
await closeDatabase();
