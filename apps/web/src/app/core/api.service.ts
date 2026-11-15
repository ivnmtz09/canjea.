import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

export interface ApiErrorInfo {
  status: number;
  code: string;
  message: string;
  details?: Record<string, string>;
}

export class ApiError extends Error implements ApiErrorInfo {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof HttpErrorResponse) {
    const payload = error.error as { error?: { code?: string; message?: string; details?: Record<string, string> } } | null;
    const code = payload?.error?.code ?? (error.status === 0 ? 'NETWORK' : 'HTTP_ERROR');
    const message =
      payload?.error?.message ??
      (error.status === 0
        ? 'No pudimos conectar con el servidor. Revisa tu conexión.'
        : 'Ocurrió un error inesperado. Intenta de nuevo.');
    return new ApiError(error.status, code, message, payload?.error?.details);
  }
  return new ApiError(0, 'UNKNOWN', 'Ocurrió un error inesperado.');
}

export function errorMessage(error: unknown): string {
  return toApiError(error).message;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly base = '/api';

  get<T>(path: string, params?: Record<string, unknown>): Observable<T> {
    return this.http.get<T>(`${this.base}${path}`, { params: this.toParams(params) }).pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body).pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  patch<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.patch<T>(`${this.base}${path}`, body).pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}${path}`).pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  private toParams(params?: Record<string, unknown>): HttpParams {
    let httpParams = new HttpParams();
    if (!params) return httpParams;
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      httpParams = httpParams.set(key, String(value));
    }
    return httpParams;
  }
}
