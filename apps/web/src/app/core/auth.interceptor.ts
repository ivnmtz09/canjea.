import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

const AUTH_FREE_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/check-username',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const isApi = req.url.startsWith('/api');

  const authorized =
    token && isApi ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;
      const isFree = AUTH_FREE_ENDPOINTS.some((endpoint) => req.url.includes(endpoint));

      if (!isApi || !isUnauthorized || isFree) return throwError(() => error);

      return auth.refresh().pipe(
        switchMap((user) => {
          if (!user) return throwError(() => error);
          const retry = req.clone({ setHeaders: { Authorization: `Bearer ${auth.token()}` } });
          return next(retry);
        }),
      );
    }),
  );
};
