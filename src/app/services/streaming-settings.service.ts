import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@jsverse/transloco';
import { filter, from, map, Observable, switchMap, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StreamingSettingsService {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private transloco = inject(TranslocoService);

  // Lazy loaded like the auth dialog; emits once, only when the user saved.
  open(): Observable<void> {
    return from(
      import('../components/streaming-settings-dialog/streaming-settings-dialog.component')
    ).pipe(
      switchMap(({ StreamingSettingsDialogComponent }) =>
        this.dialog
          .open<unknown, void, boolean>(StreamingSettingsDialogComponent, {
            width: '640px',
            maxWidth: '95vw',
            autoFocus: 'first-tabbable',
          })
          .afterClosed()
      ),
      filter((saved) => saved === true),
      tap(() =>
        this.snackBar.open(
          this.transloco.translate('streaming.saved'),
          this.transloco.translate('common.ok'),
          { duration: 3000 }
        )
      ),
      map(() => undefined)
    );
  }
}
