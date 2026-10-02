import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { Observable, switchMap, throwError } from 'rxjs';
import { IMAGE_URL, PLACEHOLDER_IMG } from '../../constants';
import { MovieList } from '../../interfaces/library.interface';
import { Movie } from '../../interfaces/movie.interface';
import { AuthDialogService } from '../../services/auth-dialog.service';
import { GenresService } from '../../services/genres.service';
import { LibraryStore } from '../../stores/library.store';
import { CARD_VARIANT } from '../../types/components.types';
import { apiErrorMessage, LibraryError } from '../../utils/api-error';

interface CardAction {
  request: Observable<void>;
  success: string;
}

@Component({
  selector: 'app-movie-card',
  imports: [
    NgTemplateOutlet,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatChipsModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    TranslocoDirective,
  ],
  templateUrl: './movie-card.component.html',
  styleUrl: './movie-card.component.sass',
})
export class MovieCardComponent {
  private _genreService = inject(GenresService);
  private _library = inject(LibraryStore);
  private _snackBar = inject(MatSnackBar);
  private _authDialog = inject(AuthDialogService);
  private _transloco = inject(TranslocoService);

  private readonly sessionReason = 'Log in to keep your watchlist, watched movies and lists, or continue as a guest.';

  variant = input<CARD_VARIANT>('simple');
  movie = input<Movie | null>(null);
  removable = input(false);
  removeLabel = input('Remove');
  remove = output<void>();
  showMore = signal(false);

  movieGenres = computed(() =>
    (this.movie()?.genreIds ?? []).map(
      (genre) => this._genreService.getGenre(genre)?.name || ''
    )
  );

  isWatched = computed(() => {
    const movie = this.movie();
    return !!movie && this._library.watchedIds().has(movie.tmdbId);
  });

  inWatchlist = computed(() => {
    const movie = this.movie();
    return !!movie && this._library.watchlistIds().has(movie.tmdbId);
  });

  customLists = computed(() =>
    this._library.lists().filter((list) => !list.isSystem)
  );

  buildImageUrl(path: string): string {
    return path ? `${IMAGE_URL}/${path}` : PLACEHOLDER_IMG;
  }

  toggleReadMore(): void {
    this.showMore.update((showMore) => !showMore);
  }

  toggleWatchlist(): void {
    this.run((movie) => {
      const watchlist = this._library.watchlist();
      const removed = this._transloco.translate('card.inWatchlist');
      const added = this._transloco.translate('card.inWatchlist');
      return watchlist && this._library.watchlistIds().has(movie.tmdbId)
        ? {
            request: this._library.removeFromList(watchlist, movie.tmdbId),
            success: removed,
          }
        : {
            request: this._library.addToWatchlist(movie),
            success: added,
          };
    });
  }

  toggleWatched(): void {
    this.run((movie) => {
      const watched = !this._library.watchedIds().has(movie.tmdbId);
      const marked = this._transloco.translate(watched ? 'card.watched' : 'card.unwatchedToggle');
      return {
        request: this._library.setWatched(movie, watched),
        success: marked,
      };
    });
  }

  // The menu list may be a session list; after logging in use the account's one.
  addToList(list: MovieList): void {
    this.run((movie) => {
      const name = list.name.toLowerCase();
      const target = this._library
        .lists()
        .find((candidate) => candidate.name.toLowerCase() === name);
      const added = this._transloco.translate('card.inWatchlist');
      return {
        request: target
          ? this._library.addToList(target, movie)
          : throwError(() => new LibraryError(`The list "${list.name}" is no longer available.`)),
        success: added,
      };
    });
  }

  // Asks for a session, waits for the library (import + load after a login) and
  // only then reads the current state to build the request.
  private run(action: (movie: Movie) => CardAction): void {
    const movie = this.movie();
    if (!movie) {
      return;
    }
    this._authDialog.ensureSession(this.sessionReason).subscribe((result) => {
      if (!result) {
        return;
      }
      let success = '';
      this._library
        .whenReady()
        .pipe(
          switchMap(() => {
            const next = action(movie);
            success = next.success;
            return next.request;
          })
        )
        .subscribe({
          next: () => this.notify(success),
          error: (error) => this.notify(apiErrorMessage(error)),
        });
    });
  }

  private notify(message: string): void {
    this._snackBar.open(message, 'Dismiss', { duration: 2500 });
  }
}
