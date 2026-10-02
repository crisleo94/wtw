import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../constants';
import { AuthStore } from '../stores/auth.store';

const USER_URLS = [`${API_URL}/me`, `${API_URL}/auth/me`];

// A 401 on user endpoints means the JWT expired; the BFF already cleared the cookie.
export const sessionExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const snackBar = inject(MatSnackBar);
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
        snackBar.open('Your session expired. Please log in again.', 'Dismiss', {
          duration: 5000,
        });
      }
      return throwError(() => error);
    })
  );
};
