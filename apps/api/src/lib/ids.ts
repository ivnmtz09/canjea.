import { randomUUID } from 'node:crypto';

const PREFIX: Record<string, string> = {
  user: 'usr',
  listing: 'lst',
  deal: 'deal',
  wallet: 'wal',
  transaction: 'txn',
  review: 'rev',
  notification: 'ntf',
  code: 'code',
  token: 'rt',
  category: 'cat',
  favorite: 'fav',
  audit: 'log',
};

export function newId(entity: keyof typeof PREFIX | string): string {
  const prefix = PREFIX[entity] ?? 'id';
  return `${prefix}_${randomUUID().replaceAll('-', '').slice(0, 22)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function addDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
