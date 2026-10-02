import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { from, map, Observable, of, switchMap } from 'rxjs';
import type {
  AuthDialogData,
  AuthDialogResult,
} from '../components/auth-dialog/auth-dialog.component';
import { AuthStore } from '../stores/auth.store';

@Injectable({
  providedIn: 'root',
})
export class AuthDialogService {
  private dialog = inject(MatDialog);
  private authStore = inject(AuthStore);

  // Lazy loaded to keep the dialog out of the initial bundle; null when dismissed.
  open(data: AuthDialogData = {}): Observable<AuthDialogResult | null> {
    return from(import('../components/auth-dialog/auth-dialog.component')).pipe(
      switchMap(({ AuthDialogComponent }) =>
        this.dialog
          .open<unknown, AuthDialogData, AuthDialogResult>(
            AuthDialogComponent,
            {
              data,
              width: '520px',
              maxWidth: '95vw',
              backdropClass: 'auth-dialog-backdrop',
              autoFocus: 'first-tabbable',
              ariaDescribedBy: data.reason ? 'auth-dialog-reason' : null,
            }
          )
          .afterClosed()
      ),
      map((result) => result ?? (this.authStore.isLoggedIn() ? 'authenticated' : null))
    );
  }

  // Asks only when there is no user and the guest mode was not chosen yet.
  ensureSession(reason: string): Observable<AuthDialogResult | null> {
    if (this.authStore.isLoggedIn()) {
      return of('authenticated');
    }
    if (this.authStore.isGuest()) {
      return of('guest');
    }
    return this.open({ reason });
  }
}
