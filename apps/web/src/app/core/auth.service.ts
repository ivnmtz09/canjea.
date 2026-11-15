import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, firstValueFrom, map, of, shareReplay, tap } from 'rxjs';
import { ApiError, ApiService, toApiError } from './api.service';
import type { AuthUser, Permission, Role, SessionResponse } from './models';

export interface RegisterPayload {
  displayName: string;
  username: string;
  email: string;
  password: string;
  city: string;
  country: string;
  acceptedTerms: boolean;
  ageConfirmed: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  private readonly _user = signal<AuthUser | null>(null);
  private readonly _token = signal<string | null>(null);
  private readonly _ready = signal(false);
  private readonly _busy = signal(false);
  private refreshRequest$: Observable<AuthUser | null> | null = null;

  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly ready = this._ready.asReadonly();
  readonly busy = this._busy.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly permissions = computed<Permission[]>(() => this._user()?.permissions ?? []);
  readonly role = computed<Role | null>(() => this._user()?.role ?? null);
  readonly verified = computed(() => this._user()?.emailVerified ?? false);
  readonly isStaff = computed(() => this.role() === 'ADMIN' || this.role() === 'MODERATOR');
  readonly unread = computed(() => this._user()?.unreadNotifications ?? 0);

  /** Solo en desarrollo: el API devuelve el código de verificación para probar el flujo. */
  readonly lastDevCode = signal<string | null>(null);

  has(permission: Permission | Permission[]): boolean {
    const required = Array.isArray(permission) ? permission : [permission];
    return required.every((item) => this.permissions().includes(item));
  }

  hasRole(...roles: Role[]): boolean {
    const role = this.role();
    return role !== null && roles.includes(role);
  }

  async restore(): Promise<void> {
    if (this._ready()) return;
    try {
      await firstValueFrom(
        this.http
          .post<SessionResponse>('/api/auth/refresh', {}, { withCredentials: true })
          .pipe(
            tap((session) => this.applySession(session)),
            catchError(() => of(null)),
          ),
      );
    } finally {
      this._ready.set(true);
    }
  }

  login(identifier: string, password: string): Observable<AuthUser> {
    this._busy.set(true);
    return this.api.post<SessionResponse>('/auth/login', { identifier, password }).pipe(
      tap((session) => this.applySession(session)),
      map((session) => session.user),
      finalize(() => this._busy.set(false)),
    );
  }

  register(payload: RegisterPayload): Observable<SessionResponse> {
    this._busy.set(true);
    return this.api.post<SessionResponse>('/auth/register', payload).pipe(
      tap((session) => {
        this.applySession(session);
        if (session.verification?.devCode) this.lastDevCode.set(session.verification.devCode);
      }),
      finalize(() => this._busy.set(false)),
    );
  }

  refresh(): Observable<AuthUser | null> {
    if (this.refreshRequest$) return this.refreshRequest$;
    this.refreshRequest$ = this.http
      .post<SessionResponse>('/api/auth/refresh', {}, { withCredentials: true })
      .pipe(
        tap((session) => this.applySession(session)),
        map((session) => session.user),
        catchError(() => {
          this.clear();
          return of(null);
        }),
        finalize(() => {
          this.refreshRequest$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.refreshRequest$;
  }

  loadMe(): Observable<AuthUser> {
    return this.api.get<{ user: AuthUser } & Record<string, unknown>>('/auth/me').pipe(
      tap((response) => {
        this._user.set(response.user);
      }),
      map((response) => response.user),
    );
  }

  verifyEmail(code: string): Observable<{ verified: boolean; user: AuthUser }> {
    return this.api.post<{ verified: boolean; user: AuthUser; accessToken: string; permissions: Permission[] }>('/auth/verify-email', { code }).pipe(
      tap((response) => {
        if (response.accessToken) this._token.set(response.accessToken);
        this._user.set({ ...response.user, permissions: response.permissions });
        this.lastDevCode.set(null);
      }),
    );
  }

  resendCode(purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET' = 'EMAIL_VERIFY') {
    return this.api.post<{ sent: boolean; expiresAt: string; devCode?: string }>('/auth/resend-code', { purpose }).pipe(
      tap((response) => {
        if (response.devCode) this.lastDevCode.set(response.devCode);
      }),
    );
  }

  verifyPassword(password: string): Observable<{ valid: boolean }> {
    return this.api.post<{ valid: boolean }>('/auth/verify-password', { password });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ changed: boolean }> {
    return this.api
      .post<{ changed: boolean }>('/auth/change-password', { currentPassword, newPassword })
      .pipe(tap(() => this.clear()));
  }

  forgotPassword(email: string) {
    return this.api.post<{ sent: boolean; expiresAt: string | null; devCode?: string }>('/auth/forgot-password', { email });
  }

  resetPassword(email: string, code: string, password: string) {
    return this.api.post<{ reset: boolean }>('/auth/reset-password', { email, code, password });
  }

  checkUsername(username: string) {
    return this.api.get<{ username: string; available: boolean }>('/auth/check-username', { username });
  }

  logout(): Observable<unknown> {
    return this.http.post('/api/auth/logout', {}, { withCredentials: true }).pipe(
      catchError(() => of(null)),
      tap(() => this.clear()),
    );
  }

  clear(): void {
    this._token.set(null);
    this._user.set(null);
  }

  updateLocalUser(patch: Partial<AuthUser>): void {
    const user = this._user();
    if (!user) return;
    this._user.set({ ...user, ...patch });
  }

  updateProfile(payload: {
    displayName?: string;
    bio?: string;
    city?: string;
    country?: string;
    phone?: string;
    avatarUrl?: string;
  }): Observable<AuthUser> {
    return this.api.patch<AuthUser>('/users/me', payload).pipe(
      tap((updated) => {
        const user = this._user();
        if (!user) return;
        this._user.set({
          ...user,
          ...updated,
          permissions: user.permissions,
          unreadNotifications: user.unreadNotifications,
        });
      }),
    );
  }

  setUnread(count: number): void {
    this.updateLocalUser({ unreadNotifications: Math.max(0, count) });
  }

  private applySession(session: SessionResponse): void {
    if (!session?.accessToken || !session?.user) return;
    this._token.set(session.accessToken);
    this._user.set({
      ...session.user,
      permissions: session.permissions ?? session.user.permissions ?? [],
    });
  }
}

export function isApiError(error: unknown): error is ApiError {
  return toApiError(error) instanceof ApiError;
}
