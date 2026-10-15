import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { catchError, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { DetailSkeletonComponent } from '../../components/detail-skeleton/detail-skeleton.component';
import { MovieCastComponent } from '../../components/movie-cast/movie-cast.component';
import { MovieStripComponent } from '../../components/movie-strip/movie-strip.component';
import { StarRatingComponent } from '../../components/star-rating/star-rating.component';
import { TrailerComponent } from '../../components/trailer/trailer.component';
import { WhereToWatchComponent } from '../../components/where-to-watch/where-to-watch.component';
import { BACKDROP_URL } from '../../constants';
import { MovieList } from '../../interfaces/library.interface';
import { MovieDetails } from '../../interfaces/movie-details.interface';
import { Movie } from '../../interfaces/movie.interface';
import { MovieActionsService } from '../../services/movie-actions.service';
import { MoviesService } from '../../services/movies.service';
import { LanguageStore } from '../../stores/language.store';
import { LibraryStore } from '../../stores/library.store';
import { PreferencesStore } from '../../stores/preferences.store';
import { posterUrl } from '../../utils/image-url';

type Status = 'loading' | 'ready' | 'notFound' | 'error';

// Route `/movie/:tmdbId`: everything about one movie (GET /api/movies/:id/details).
@Component({
  selector: 'app-movie-detail',
  imports: [
    DetailSkeletonComponent,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MovieCastComponent,
    MovieStripComponent,
    RouterLink,
    StarRatingComponent,
    TrailerComponent,
    TranslocoPipe,
    WhereToWatchComponent,
  ],
  templateUrl: './movie-detail.component.html',
  styleUrl: './movie-detail.component.sass',
})
export class MovieDetailComponent {
  private moviesService = inject(MoviesService);
  private preferences = inject(PreferencesStore);
  private languageStore = inject(LanguageStore);
  private library = inject(LibraryStore);
  private actions = inject(MovieActionsService);
  private titleService = inject(Title);
  private transloco = inject(TranslocoService);
  private location = inject(Location);
  private router = inject(Router);

  // Bound from the route by withComponentInputBinding.
  tmdbId = input.required<string>();

  status = signal<Status>('loading');
  details = signal<MovieDetails | null>(null);
  private retries = signal(0);

  private id = computed(() => {
    const id = Number(this.tmdbId());
    return Number.isInteger(id) && id > 0 ? id : null;
  });

  // Lighter than the full details: what the library stores and the actions need.
  movie = computed<Movie | null>(() => {
    const movie = this.details()?.movie;
    return movie
      ? {
          tmdbId: movie.tmdbId,
          title: movie.title,
          overview: movie.overview,
          posterPath: movie.posterPath,
          backdropPath: movie.backdropPath,
          releaseDate: movie.releaseDate,
          voteAverage: movie.voteAverage,
          voteCount: movie.voteCount,
          genreIds: movie.genreIds ?? movie.genres?.map((genre) => genre.id) ?? [],
        }
      : null;
  });

  year = computed(() => this.details()?.movie.releaseDate?.slice(0, 4) ?? null);
  backdrop = computed(() => {
    const path = this.details()?.movie.backdropPath ?? this.details()?.backdrops[0];
    return path ? `url("${posterUrl(path, BACKDROP_URL)}")` : null;
  });

  isWatched = computed(() => this.library.watchedIds().has(this.id() ?? 0));
  inWatchlist = computed(() => this.library.watchlistIds().has(this.id() ?? 0));
  rating = computed(() => this.library.ratings().get(this.id() ?? 0) ?? null);
  customLists = computed(() => this.library.lists().filter((list) => !list.isSystem));

  constructor() {
    // Same movie again after a language or country change: the old data stays on screen.
    toObservable(
      computed(() => ({
        id: this.id(),
        region: this.preferences.region(),
        lang: this.languageStore.lang(),
        retry: this.retries(),
      }))
    )
      .pipe(
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        switchMap(({ id, region }) => {
          if (id === null) {
            return of<Status>('notFound');
          }
          if (this.details()?.movie.tmdbId !== id) {
            this.details.set(null);
            this.status.set('loading');
          }
          return this.moviesService.getDetails(id, region).pipe(
            map((details) => {
              this.details.set(details);
              return 'ready' as Status;
            }),
            catchError((error: unknown) =>
              of<Status>(
                error instanceof HttpErrorResponse && [400, 404].includes(error.status)
                  ? 'notFound'
                  : this.details()
                    ? 'ready'
                    : 'error'
              )
            )
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe((status) => this.status.set(status));

    effect(() => {
      const title = this.details()?.movie.title;
      if (title) {
        this.titleService.setTitle(title);
      }
    });
    inject(DestroyRef).onDestroy(() =>
      this.titleService.setTitle(this.transloco.translate('header.title'))
    );
  }

  // Back to where the user came from; a page opened directly goes to the generator.
  back(): void {
    const state = this.location.getState() as { navigationId?: number } | null;
    if ((state?.navigationId ?? 1) > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/');
    }
  }

  retry(): void {
    this.retries.update((count) => count + 1);
  }

  runtime(): string | null {
    const minutes = this.details()?.movie.runtime;
    if (!minutes) {
      return null;
    }
    const hours = Math.floor(minutes / 60);
    return hours
      ? this.transloco.translate('detail.runtime', { hours, minutes: minutes % 60 })
      : this.transloco.translate('detail.runtimeMinutes', { minutes });
  }

  poster(path: string | null | undefined): string {
    return posterUrl(path);
  }

  toggleWatchlist(): void {
    this.withMovie((movie) => this.actions.toggleWatchlist(movie));
  }

  toggleWatched(): void {
    this.withMovie((movie) => this.actions.toggleWatched(movie));
  }

  addToList(list: MovieList): void {
    this.withMovie((movie) => this.actions.addToList(movie, list));
  }

  rate(rating: number | null): void {
    this.withMovie((movie) => this.actions.rate(movie, rating));
  }

  inList(list: MovieList): boolean {
    return list.items.some((item) => item.tmdbId === this.id());
  }

  private withMovie(action: (movie: Movie) => void): void {
    const movie = this.movie();
    if (movie) {
      action(movie);
    }
  }
}
