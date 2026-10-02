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
import { Observable } from 'rxjs';
import { IMAGE_URL, PLACEHOLDER_IMG } from '../../constants';
import { MovieList } from '../../interfaces/library.interface';
import { Movie } from '../../interfaces/movie.interface';
import { AuthDialogService } from '../../services/auth-dialog.service';
import { GenresService } from '../../services/genres.service';
import { LibraryStore } from '../../stores/library.store';
import { CARD_VARIANT } from '../../types/components.types';
import { apiErrorMessage } from '../../utils/api-error';

const SESSION_REASON =
  'Log in to keep your watchlist, watched movies and lists, or continue as a guest.';

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
  ],
  templateUrl: './movie-card.component.html',
  styleUrl: './movie-card.component.sass',
})
export class MovieCardComponent {
  private _genreService = inject(GenresService);
  private _library = inject(LibraryStore);
  private _snackBar = inject(MatSnackBar);
  private _authDialog = inject(AuthDialogService);

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
    const watchlist = this._library.watchlist();
    const inWatchlist = this.inWatchlist();
    this.run(
      (movie) =>
        inWatchlist && watchlist
          ? this._library.removeFromList(watchlist, movie.tmdbId)
          : this._library.addToWatchlist(movie),
      inWatchlist ? 'Removed from your watchlist.' : 'Added to your watchlist!'
    );
  }

  toggleWatched(): void {
    const watched = !this.isWatched();
    this.run(
      (movie) => this._library.setWatched(movie, watched),
      watched ? 'Marked as watched.' : 'Marked as not watched.'
    );
  }

  addToList(list: MovieList): void {
    this.run(
      (movie) => this._library.addToList(list, movie),
      `Added to ${list.name}!`
    );
  }

  // Every action asks for a session first (login or guest mode).
  private run(action: (movie: Movie) => Observable<void>, success: string): void {
    const movie = this.movie();
    if (!movie) {
      return;
    }
    this._authDialog.ensureSession(SESSION_REASON).subscribe((result) => {
      if (!result) {
        return;
      }
      action(movie).subscribe({
        next: () => this.notify(success),
        error: (error) => this.notify(apiErrorMessage(error)),
      });
    });
  }

  private notify(message: string): void {
    this._snackBar.open(message, 'Dismiss', { duration: 2500 });
  }
}
