import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@jsverse/transloco';
import { Observable, switchMap, throwError } from 'rxjs';
import { MovieList } from '../interfaces/library.interface';
import { Movie } from '../interfaces/movie.interface';
import { LibraryStore } from '../stores/library.store';
import { apiErrorMessage, LibraryError } from '../utils/api-error';
import { AuthDialogService } from './auth-dialog.service';

interface MovieAction {
  request: Observable<void>;
  success: string;
}

// Library actions on one movie, shared by the main card and the overview table.
@Injectable({
  providedIn: 'root',
})
export class MovieActionsService {
  private library = inject(LibraryStore);
  private snackBar = inject(MatSnackBar);
  private authDialog = inject(AuthDialogService);
  private transloco = inject(TranslocoService);

  toggleWatchlist(movie: Movie): void {
    this.run(movie, () => {
      const watchlist = this.library.watchlist();
      return watchlist && this.library.watchlistIds().has(movie.tmdbId)
        ? {
            request: this.library.removeFromList(watchlist, movie.tmdbId),
            success: this.transloco.translate('card.removedFromWatchlist'),
          }
        : {
            request: this.library.addToWatchlist(movie),
            success: this.transloco.translate('card.addedToWatchlist'),
          };
    });
  }

  toggleWatched(movie: Movie): void {
    this.run(movie, () => {
      const watched = !this.library.watchedIds().has(movie.tmdbId);
      return {
        request: this.library.setWatched(movie, watched),
        success: this.transloco.translate(watched ? 'card.markedWatched' : 'card.markedNotWatched'),
      };
    });
  }

  // The menu list may be a session list; after logging in use the account's one.
  addToList(movie: Movie, list: MovieList): void {
    this.run(movie, () => {
      const name = list.name.toLowerCase();
      const target = this.library
        .lists()
        .find((candidate) => candidate.name.toLowerCase() === name);
      return {
        request: target
          ? this.library.addToList(target, movie)
          : throwError(
              () =>
                new LibraryError(this.transloco.translate('errors.listUnavailable', { name: list.name }))
            ),
        success: this.transloco.translate('card.addedToList', { list: list.name }),
      };
    });
  }

  rate(movie: Movie, rating: number | null): void {
    this.run(movie, () => ({
      request: this.library.setRating(movie, rating),
      success: this.transloco.translate(rating === null ? 'rating.cleared' : 'rating.saved'),
    }));
  }

  // Asks for a session, waits for the library (import + load after a login) and
  // only then reads the current state to build the request.
  private run(movie: Movie, action: () => MovieAction): void {
    this.authDialog.ensureSession(this.transloco.translate('auth.reasonCard')).subscribe((result) => {
      if (!result) {
        return;
      }
      let success = '';
      this.library
        .whenReady()
        .pipe(
          switchMap(() => {
            const next = action();
            success = next.success;
            return next.request;
          })
        )
        .subscribe({
          next: () => this.notify(success),
          error: (error) => this.notify(apiErrorMessage(error, this.transloco)),
        });
    });
  }

  private notify(message: string): void {
    this.snackBar.open(message, this.transloco.translate('common.dismiss'), { duration: 2500 });
  }
}
