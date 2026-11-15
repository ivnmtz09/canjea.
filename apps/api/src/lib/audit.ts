import { count, run } from './db.js';
import { newId, nowIso } from './ids.js';

export async function logAudit(input: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
  ip?: string | null;
}): Promise<void> {
  await run(
    `INSERT INTO audit_logs (id, actor_id, action, entity, entity_id, meta, ip, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    newId('audit'),
    input.actorId ?? null,
    input.action,
    input.entity,
    input.entityId ?? null,
    JSON.stringify(input.meta ?? {}),
    input.ip ?? null,
    nowIso(),
  );
}

export async function notify(input: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string | null;
}): Promise<void> {
  await run(
    `INSERT INTO notifications (id, user_id, type, title, body, link, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    newId('notification'),
    input.userId,
    input.type,
    input.title,
    input.body ?? '',
    input.link ?? null,
    nowIso(),
  );
}

/** Emits the same notification to several recipients in a single transaction. */
export async function notifyMany(
  userIds: string[],
  input: { type: string; title: string; body?: string; link?: string | null },
): Promise<void> {
  for (const userId of new Set(userIds)) await notify({ userId, ...input });
}

export async function unreadNotifications(userId: string): Promise<number> {
  return count('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL', userId);
}
