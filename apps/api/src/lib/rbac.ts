export const ROLES = ['USER', 'MODERATOR', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'listing:create',
  'listing:update:own',
  'listing:moderate',
  'listing:favorite',
  'deal:create',
  'deal:respond:own',
  'deal:moderate',
  'review:create',
  'wallet:read:own',
  'wallet:topup',
  'wallet:withdraw',
  'profile:update:own',
  'user:read',
  'user:suspend',
  'user:manage',
  'role:manage',
  'stats:read',
  'audit:read',
  'notification:read',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Matrix documented in README — USER is the base role, each role inherits the previous one. */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  USER: [
    'listing:create',
    'listing:update:own',
    'listing:favorite',
    'deal:create',
    'deal:respond:own',
    'review:create',
    'wallet:read:own',
    'wallet:topup',
    'wallet:withdraw',
    'profile:update:own',
    'notification:read',
  ],
  MODERATOR: [
    'listing:create',
    'listing:update:own',
    'listing:favorite',
    'deal:create',
    'deal:respond:own',
    'review:create',
    'wallet:read:own',
    'wallet:topup',
    'wallet:withdraw',
    'profile:update:own',
    'notification:read',
    'listing:moderate',
    'deal:moderate',
    'user:read',
    'user:suspend',
    'stats:read',
    'audit:read',
  ],
  ADMIN: [...PERMISSIONS],
};

export function permissionsFor(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.USER;
}

export function can(role: Role, permission: Permission): boolean {
  if (role === 'ADMIN') return true;
  return permissionsFor(role).includes(permission);
}

export function isAtLeast(role: Role, minimum: Role): boolean {
  return ROLES.indexOf(role) >= ROLES.indexOf(minimum);
}
