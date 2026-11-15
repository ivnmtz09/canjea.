import fs from 'node:fs';
import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_SIZE,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (error) => {
  console.error('[db:pool]', error);
});

export type Row = Record<string, unknown>;

interface TransactionContext {
  client: pg.PoolClient;
  depth: number;
}

const transactionStorage = new AsyncLocalStorage<TransactionContext>();

/**
 * Convierte marcadores `?` en parámetros posicionales de PostgreSQL ($1, $2…).
 * Todo el código de la aplicación mantiene una sintaxis única y portable.
 */
function toPgSql(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

async function execute(sql: string, params: unknown[]): Promise<pg.QueryResult<Row>> {
  const context = transactionStorage.getStore();
  const text = toPgSql(sql);
  if (context) return context.client.query<Row>(text, params as never[]);
  return pool.query<Row>(text, params as never[]);
}

export async function all<T = Row>(sql: string, ...params: unknown[]): Promise<T[]> {
  const result = await execute(sql, params);
  return result.rows as T[];
}

export async function get<T = Row>(sql: string, ...params: unknown[]): Promise<T | undefined> {
  const result = await execute(sql, params);
  return result.rows[0] as T | undefined;
}

export async function run(sql: string, ...params: unknown[]): Promise<{ changes: number; rows: Row[] }> {
  const result = await execute(sql, params);
  return { changes: result.rowCount ?? 0, rows: result.rows };
}

export async function count(sql: string, ...params: unknown[]): Promise<number> {
  const row = await get<{ n: number | string }>(sql, ...params);
  return Number(row?.n ?? 0);
}

/**
 * Ejecuta una transacción. Si ya existe una transacción activa en el mismo
 * contexto asíncrono, usa un SAVEPOINT para permitir composición segura entre
 * servicios (por ejemplo, un canje que retiene fondos y notifica).
 */
export async function tx<T>(fn: () => Promise<T> | T): Promise<T> {
  const current = transactionStorage.getStore();

  if (current) {
    const savepoint = `sp_${current.depth}`;
    current.depth += 1;
    await current.client.query(`SAVEPOINT ${savepoint}`);
    try {
      const result = await fn();
      await current.client.query(`RELEASE SAVEPOINT ${savepoint}`);
      return result;
    } catch (error) {
      await current.client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
      throw error;
    } finally {
      current.depth -= 1;
    }
  }

  const client = await pool.connect();
  const context: TransactionContext = { client, depth: 0 };
  try {
    await client.query('BEGIN');
    const result = await transactionStorage.run(context, fn);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function initializeDatabase(): Promise<void> {
  const schemaSql = fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
  await pool.query(schemaSql);
}

export async function waitForDatabase(maxAttempts = 30, delayMs = 1000): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      console.info(`  · Esperando PostgreSQL (${attempt}/${maxAttempts})…`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
