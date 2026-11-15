import { HttpErrorResponse } from '@angular/common/http';

export interface FieldErrors {
  [field: string]: string;
}

export function errorMessage(error: unknown, fallback = 'Algo salió mal. Intenta de nuevo.'): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { error?: { message?: string } } | string | null;
    if (body && typeof body === 'object' && body.error?.message) return body.error.message;
    if (typeof body === 'string' && body.trim()) return body;
    if (error.status === 0) return 'No pudimos conectar con el servidor. Revisa que la API esté corriendo.';
    return error.statusText || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function errorDetails(error: unknown): FieldErrors | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body = error.error as { error?: { details?: FieldErrors } } | null;
  const details = body?.error?.details;
  if (!details || typeof details !== 'object') return null;
  return details;
}

export function errorCode(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body = error.error as { error?: { code?: string } } | null;
  return body?.error?.code ?? null;
}
