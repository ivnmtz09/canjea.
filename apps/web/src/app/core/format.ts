export function formatMoney(cents: number, currency = 'USD', forceDecimals = false): string {
  const value = (cents ?? 0) / 100;
  const decimals = forceDecimals || Math.round(value * 100) % 100 !== 0 ? 2 : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-MX').format(value ?? 0);
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso).getTime();
  const diff = Date.now() - date;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export function formatDate(iso: string | null | undefined, withYear = true): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  }).format(new Date(iso));
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export const CONDITION_LABELS = {
  NEW: 'Nuevo',
  LIKE_NEW: 'Casi nuevo',
  GOOD: 'Buen estado',
  FAIR: 'Con uso',
  SERVICE: 'Servicio / habilidad',
} as const;

export const MODALITY_LABELS = {
  BARTER: 'Solo trueque',
  CASH: 'Solo dinero',
  BOTH: 'Trueque o dinero',
} as const;

export const STATUS_LABELS = {
  ACTIVE: 'Activa',
  PAUSED: 'Pausada',
  MATCHED: 'En canje',
  ARCHIVED: 'Archivada',
  REMOVED: 'Retirada',
} as const;

export const DEAL_LABELS = {
  PROPOSED: 'Propuesta',
  ACCEPTED: 'Aceptada',
  COMPLETED: 'Completada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
  DISPUTED: 'En disputa',
} as const;

export const ROLE_LABELS = {
  USER: 'Miembro',
  MODERATOR: 'Moderación',
  ADMIN: 'Administración',
} as const;

export const CATEGORY_ICONS: Record<string, string> = {
  tecnologia: 'cpu',
  hogar: 'home',
  bicicletas: 'bike',
  musica: 'music',
  diseno: 'pen-tool',
  servicios: 'wrench',
  comida: 'coffee',
  libros: 'book-open',
  gaming: 'gamepad-2',
  moda: 'shirt',
};

export const TRANSACTION_LABELS: Record<string, string> = {
  TOPUP: 'Recarga',
  ESCROW_HOLD: 'Garantía retenida',
  ESCROW_RELEASE: 'Garantía liberada',
  ESCROW_REFUND: 'Garantía devuelta',
  FEE: 'Comisión',
  PAYOUT: 'Retiro',
  BONUS: 'Bono',
};

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
