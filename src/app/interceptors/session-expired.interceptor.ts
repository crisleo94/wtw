import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../constants';
import { AuthStore } from '../stores/auth.store';

const USER_URLS = [`${API_URL}/me`, `${API_URL}/auth/me`];

// A 401 on user endpoints means the JWT expired; the API already cleared the cookie.
export const sessionExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const snackBar = inject(MatSnackBar);
  const transloco = inject(TranslocoService);
  const isUserRequest = USER_URLS.some(
    (url) => req.url === url || req.url.startsWith(`${url}/`)
  );

  return next(req).pipe(
    catchError((error) => {
      if (
        isUserRequest &&
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        authStore.isLoggedIn()
      ) {
        authStore.clearUser();
        snackBar.open(transloco.translate('errors.sessionExpired'), transloco.translate('common.dismiss'), {
          duration: 5000,
        });
      }
      return throwError(() => error);
    })
  );
};
