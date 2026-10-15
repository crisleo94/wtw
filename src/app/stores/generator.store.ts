import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, switchMap } from 'rxjs';
import { MovieFilters } from '../interfaces/movie-filters.interface';
import { Movie } from '../interfaces/movie.interface';
import { MoviesService } from '../services/movies.service';
import { LanguageStore } from './language.store';

// State of the generator page, kept while visiting a movie detail and coming back.
@Injectable({
  providedIn: 'root',
})
export class GeneratorStore {
  private moviesService = inject(MoviesService);

  readonly movie = signal<Movie | null>(null);
  readonly isLoading = signal(false);
  // Translation key, so the message follows the active language.
  readonly message = signal<string | null>(null);
  // Last filters of the form, restored when the page is shown again.
  readonly filters = signal<MovieFilters | null>(null);

  constructor() {
    // Shows the same movie in the new language instead of generating another.
    inject(LanguageStore)
      .changed$.pipe(
        switchMap(() => {
          const movie = this.movie();
          return movie
            ? this.moviesService.getMovie(movie.tmdbId).pipe(catchError(() => EMPTY))
            : EMPTY;
        }),
        takeUntilDestroyed()
      )
      .subscribe((movie) => {
        const current = this.movie();
        if (current?.tmdbId === movie.tmdbId) {
          // GET /movies/:id has no "where to watch"; keep the generated one.
          this.movie.set({ ...movie, watchProviders: movie.watchProviders ?? current.watchProviders });
        }
      });
  }

  showMovie(movie: Movie | null): void {
    this.movie.set(movie);
    this.message.set(movie ? null : 'errors.noMovies');
  }

  showError(message = 'errors.fetchError'): void {
    this.movie.set(null);
    this.message.set(message);
  }
}
