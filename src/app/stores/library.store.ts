import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  computed,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  untracked,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  catchError,
  finalize,
  forkJoin,
  map,
  Observable,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { API_URL } from '../constants';
import {
  HistoryEntry,
  HistoryPage,
  ImportSummary,
  MovieList,
  SessionData,
  WATCHLIST_NAME,
} from '../interfaces/library.interface';
import { MovieFilters } from '../interfaces/movie-filters.interface';
import { Movie } from '../interfaces/movie.interface';
import { AuthStore } from './auth.store';
import { SessionStore } from './session.store';

export const HISTORY_PAGE_SIZE = 50;

// Facade over the user library: the API when logged in, the session otherwise.
@Injectable({
  providedIn: 'root',
})
export class LibraryStore {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);
  private session = inject(SessionStore);
  private snackBar = inject(MatSnackBar);

  private remoteHistory = signal<HistoryEntry[]>([]);
  private remoteLists = signal<MovieList[]>([]);
  private remoteWatched = signal<number[]>([]);
  private importInProgress = signal(false);

  readonly importing = this.importInProgress.asReadonly();

  readonly watchedIds = computed(
    () =>
      new Set(
        this.authStore.isLoggedIn()
          ? this.remoteWatched()
          : this.session.data().watched
      )
  );

  readonly history = computed<HistoryEntry[]>(() => {
    const watched = this.watchedIds();
    const entries = this.authStore.isLoggedIn()
      ? this.remoteHistory()
      : this.session.data().history;
    return entries.map((entry) => ({
      ...entry,
      watched: watched.has(entry.movie.tmdbId),
    }));
  });

  readonly lists = computed<MovieList[]>(() =>
    this.authStore.isLoggedIn()
      ? this.remoteLists()
      : toMovieLists(this.session.data(), this.watchedIds())
  );

  readonly watchlist = computed(() =>
    this.lists().find((list) => list.isSystem)
  );

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }
    // Runs on hydration, login and register: import leftovers, then load.
    effect(() => {
      const user = this.authStore.user();
      untracked(() => {
        if (user) {
          this.importSession().subscribe(() => this.reload());
        } else {
          this.clearRemote();
        }
      });
    });
  }

  recordGenerated(movie: Movie, filters?: MovieFilters): void {
    if (!this.authStore.isLoggedIn()) {
      this.session.addHistory(movie, filters);
      return;
    }
    // The API already saved it while generating.
    this.remoteHistory.update((history) => [
      { movie, filters, generatedAt: new Date().toISOString(), watched: false },
      ...history,
    ]);
  }

  setWatched(movie: Movie, watched: boolean): Observable<void> {
    if (!this.authStore.isLoggedIn()) {
      this.session.setWatched(movie, watched);
      return of(undefined);
    }
    return this.http
      .patch<unknown>(`${API_URL}/me/movies/${movie.tmdbId}`, { watched })
      .pipe(
        tap(() =>
          this.remoteWatched.update((ids) =>
            watched
              ? [...new Set([...ids, movie.tmdbId])]
              : ids.filter((id) => id !== movie.tmdbId)
          )
        ),
        map(() => undefined)
      );
  }

  addToWatchlist(movie: Movie): Observable<void> {
    if (!this.authStore.isLoggedIn()) {
      this.session.addToList(WATCHLIST_NAME, movie);
      return of(undefined);
    }
    const watchlist = this.watchlist();
    if (!watchlist?.id) {
      return throwError(() => new Error('The watchlist is not loaded yet'));
    }
    return this.http
      .post<unknown>(`${API_URL}/me/lists/${watchlist.id}/items`, {
        tmdbId: movie.tmdbId,
        movie,
      })
      .pipe(switchMap(() => this.loadLists()));
  }

  removeFromList(list: MovieList, tmdbId: number): Observable<void> {
    if (!this.authStore.isLoggedIn()) {
      this.session.removeFromList(list.name, tmdbId);
      return of(undefined);
    }
    return this.http
      .delete<void>(`${API_URL}/me/lists/${list.id}/items/${tmdbId}`)
      .pipe(switchMap(() => this.loadLists()));
  }

  // Idempotent on the API; on failure the session is kept to retry on the next login.
  importSession(): Observable<ImportSummary | null> {
    if (this.session.isEmpty() || this.importInProgress()) {
      return of(null);
    }
    this.importInProgress.set(true);
    return this.http
      .post<ImportSummary>(`${API_URL}/me/import`, this.session.data())
      .pipe(
        tap(() => {
          this.session.clear();
          this.notify('Your guest activity was saved to your account.');
        }),
        catchError(() => {
          this.notify(
            'We could not save your guest activity. It stays in this tab and we will retry on your next login.'
          );
          return of(null);
        }),
        finalize(() => this.importInProgress.set(false))
      );
  }

  reload(): void {
    forkJoin({
      history: this.http
        .get<HistoryPage>(`${API_URL}/me/history`, {
          params: { limit: HISTORY_PAGE_SIZE },
        })
        .pipe(map((page) => page.items)),
      lists: this.http.get<MovieList[]>(`${API_URL}/me/lists`),
      watched: this.http
        .get<{ watched: number[] }>(`${API_URL}/me/movies`)
        .pipe(map((response) => response.watched)),
    }).subscribe({
      next: ({ history, lists, watched }) => {
        this.remoteHistory.set(history);
        this.remoteLists.set(lists);
        this.remoteWatched.set(watched);
      },
      error: () => this.notify('We could not load your library. Please reload the page.'),
    });
  }

  private loadLists(): Observable<void> {
    return this.http.get<MovieList[]>(`${API_URL}/me/lists`).pipe(
      tap((lists) => this.remoteLists.set(lists)),
      map(() => undefined)
    );
  }

  private clearRemote(): void {
    this.remoteHistory.set([]);
    this.remoteLists.set([]);
    this.remoteWatched.set([]);
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 5000 });
  }
}

function toMovieLists(data: SessionData, watched: Set<number>): MovieList[] {
  return data.lists.map((list, position) => ({
    name: list.name,
    isSystem: !!list.isSystem,
    position,
    items: list.items
      .filter((tmdbId) => data.movies[tmdbId])
      .map((tmdbId, index) => ({
        tmdbId,
        position: index,
        watched: watched.has(tmdbId),
        movie: data.movies[tmdbId],
      })),
  }));
}
