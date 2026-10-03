import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  computed,
  effect,
  inject,
  Injectable,
  signal,
  untracked,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@jsverse/transloco';
import {
  catchError,
  filter,
  finalize,
  forkJoin,
  map,
  Observable,
  of,
  switchMap,
  take,
  tap,
  throwError,
} from 'rxjs';
import { API_URL } from '../constants';
import {
  HistoryEntry,
  HistoryPage,
  ImportSummary,
  MovieList,
  MovieListItem,
  MovieRating,
  SessionData,
  WatchedEntry,
  WatchedPage,
} from '../interfaces/library.interface';
import { MovieFilters } from '../interfaces/movie-filters.interface';
import { Movie } from '../interfaces/movie.interface';
import { LibraryError } from '../utils/api-error';
import { AuthStore } from './auth.store';
import { LanguageStore } from './language.store';
import { SessionStore, watchedOrder } from './session.store';

export const HISTORY_PAGE_SIZE = 50;
export const MAX_LISTS = 50;
export const MAX_LIST_ITEMS = 500;
export const MAX_WATCHED = 2000;
const WATCHED_PAGE_SIZE = 20;

// Facade over the user library: the API when logged in, the session otherwise.
@Injectable({
  providedIn: 'root',
})
export class LibraryStore {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);
  private session = inject(SessionStore);
  private snackBar = inject(MatSnackBar);
  private transloco = inject(TranslocoService);

  private remoteHistory = signal<HistoryEntry[]>([]);
  private remoteLists = signal<MovieList[]>([]);
  private remoteWatched = signal<number[]>([]);
  private remoteRatings = signal<MovieRating[]>([]);
  private remoteWatchedItems = signal<WatchedEntry[]>([]);
  private watchedTotal = signal(0);
  private watchedPage = signal(0);
  private watchedLoadingState = signal(false);
  private watchedFailedState = signal(false);

  readonly watchedLoading = this.watchedLoadingState.asReadonly();
  readonly watchedFailed = this.watchedFailedState.asReadonly();
  private importInProgress = signal(false);
  private remoteLoaded = signal(false);

  readonly importing = this.importInProgress.asReadonly();
  // False while a logged user's library is being imported or loaded.
  readonly ready = computed(
    () => !this.authStore.isLoggedIn() || this.remoteLoaded()
  );
  private ready$ = toObservable(this.ready);

  readonly watchedIds = computed(
    () =>
      new Set(
        this.authStore.isLoggedIn()
          ? this.remoteWatched()
          : this.session.data().watched
      )
  );

  // tmdbId -> rating (0.5 to 5); movies without an entry are not rated.
  readonly ratings = computed(
    () =>
      new Map(
        (this.authStore.isLoggedIn() ? this.remoteRatings() : this.session.data().ratings).map(
          ({ tmdbId, rating }) => [tmdbId, rating]
        )
      )
  );

  // Watched tab, newest first: API pages for users, the session for guests.
  readonly watchedMovies = computed<WatchedEntry[]>(() => {
    if (this.authStore.isLoggedIn()) {
      return this.remoteWatchedItems();
    }
    const data = this.session.data();
    return watchedOrder(data)
      .filter((tmdbId) => data.movies[tmdbId])
      .map((tmdbId) => ({ movie: data.movies[tmdbId], watchedAt: data.watchedAt?.[tmdbId] ?? null }));
  });

  readonly hasMoreWatched = computed(
    () => this.authStore.isLoggedIn() && this.remoteWatchedItems().length < this.watchedTotal()
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

  readonly watchlistIds = computed(
    () => new Set(this.watchlist()?.items.map((item) => item.tmdbId) ?? [])
  );

  constructor() {
    // Runs on startup, login and register: import leftovers, then load.
    effect(() => {
      const user = this.authStore.user();
      untracked(() => {
        if (user) {
          this.remoteLoaded.set(false);
          this.importSession().subscribe(() => this.reload());
        } else {
          this.clearRemote();
        }
      });
    });
    // Titles and synopses come back in the new language.
    inject(LanguageStore).changed$.subscribe(() => {
      if (this.authStore.isLoggedIn() && this.remoteLoaded()) {
        this.reload();
      }
    });
  }

  recordGenerated(movie: Movie, filters?: MovieFilters): void {
    if (!this.authStore.isLoggedIn()) {
      this.session.addHistory(movie, filters);
      return;
    }
    // The API already saved it while generating; reload to get the entry id.
    this.loadHistory().subscribe();
  }

  removeHistory(entry: HistoryEntry): Observable<void> {
    if (!this.authStore.isLoggedIn()) {
      this.session.removeHistory(entry.movie.tmdbId, entry.generatedAt);
      return of(undefined);
    }
    if (!entry.id) {
      return throwError(() => new LibraryError(this.transloco.translate('errors.tryAgain')));
    }
    return this.http.delete<void>(`${API_URL}/me/history/${entry.id}`).pipe(
      tap(() =>
        this.remoteHistory.update((history) =>
          history.filter((item) => item.id !== entry.id)
        )
      )
    );
  }

  setWatched(movie: Movie, watched: boolean): Observable<void> {
    if (!this.authStore.isLoggedIn()) {
      const ids = this.session.data().watched;
      if (watched && !ids.includes(movie.tmdbId) && ids.length >= MAX_WATCHED) {
        return throwError(
          () =>
            new LibraryError(
              this.transloco.translate('errors.maxWatchedGuest', { max: MAX_WATCHED })
            )
        );
      }
      this.session.setWatched(movie, watched);
      return of(undefined);
    }
    return this.http
      .patch<unknown>(`${API_URL}/me/movies/${movie.tmdbId}`, { watched })
      .pipe(
        tap(() => {
          this.remoteWatched.update((ids) =>
            watched
              ? [...new Set([...ids, movie.tmdbId])]
              : ids.filter((id) => id !== movie.tmdbId)
          );
          this.updateWatchedTab(movie, watched);
        }),
        map(() => undefined)
      );
  }

  // null clears the rating; `watched` is not touched (same as the API).
  setRating(movie: Movie, rating: number | null): Observable<void> {
    if (!this.authStore.isLoggedIn()) {
      this.session.setRating(movie, rating);
      return of(undefined);
    }
    return this.http
      .patch<unknown>(`${API_URL}/me/movies/${movie.tmdbId}`, { rating })
      .pipe(
        tap(() =>
          this.remoteRatings.update((ratings) => [
            ...ratings.filter((entry) => entry.tmdbId !== movie.tmdbId),
            ...(rating === null ? [] : [{ tmdbId: movie.tmdbId, rating }]),
          ])
        ),
        map(() => undefined)
      );
  }

  addToWatchlist(movie: Movie): Observable<void> {
    const watchlist = this.watchlist();
    if (!watchlist) {
      return throwError(
        () => new LibraryError(this.transloco.translate('errors.watchlistLoading'))
      );
    }
    return this.addToList(watchlist, movie);
  }

  // The API resolves the movie from TMDB; it only accepts tmdbId (and position).
  addToList(list: MovieList, movie: Movie): Observable<void> {
    if (list.items.some((item) => item.tmdbId === movie.tmdbId)) {
      return throwError(
        () => new LibraryError(this.transloco.translate('errors.movieAlreadyInList', { title: movie.title, list: list.name }))
      );
    }
    if (list.items.length >= MAX_LIST_ITEMS) {
      return throwError(
        () =>
          new LibraryError(this.transloco.translate('errors.listFull', { list: list.name, max: MAX_LIST_ITEMS }))
      );
    }
    if (!this.authStore.isLoggedIn()) {
      this.session.addToList(list.name, movie);
      return of(undefined);
    }
    return this.http
      .post<unknown>(`${API_URL}/me/lists/${list.id}/items`, {
        tmdbId: movie.tmdbId,
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

  createList(rawName: string): Observable<void> {
    const name = rawName.trim();
    const invalid = this.validateListName(name);
    if (invalid) {
      return throwError(() => new LibraryError(invalid));
    }
    if (this.lists().length >= MAX_LISTS) {
      return throwError(
        () => new LibraryError(this.transloco.translate('errors.maxLists', { max: MAX_LISTS }))
      );
    }
    if (!this.authStore.isLoggedIn()) {
      this.session.createList(name);
      return of(undefined);
    }
    return this.http
      .post<unknown>(`${API_URL}/me/lists`, { name })
      .pipe(switchMap(() => this.loadLists()));
  }

  renameList(list: MovieList, rawName: string): Observable<void> {
    const name = rawName.trim();
    if (list.isSystem) {
      return throwError(() => new LibraryError(this.transloco.translate('errors.watchlistCannotRename')));
    }
    if (name === list.name) {
      return of(undefined);
    }
    const invalid = this.validateListName(name, list);
    if (invalid) {
      return throwError(() => new LibraryError(invalid));
    }
    if (!this.authStore.isLoggedIn()) {
      this.session.renameList(list.name, name);
      return of(undefined);
    }
    return this.http
      .patch<unknown>(`${API_URL}/me/lists/${list.id}`, { name })
      .pipe(switchMap(() => this.loadLists()));
  }

  deleteList(list: MovieList): Observable<void> {
    if (list.isSystem) {
      return throwError(() => new LibraryError(this.transloco.translate('errors.watchlistCannotDelete')));
    }
    if (!this.authStore.isLoggedIn()) {
      this.session.deleteList(list.name);
      return of(undefined);
    }
    return this.http
      .delete<void>(`${API_URL}/me/lists/${list.id}`)
      .pipe(switchMap(() => this.loadLists()));
  }

  // Moves inside a list or to another one; remote moves are optimistic.
  moveItem(
    from: MovieList,
    tmdbId: number,
    to: MovieList,
    position: number
  ): Observable<void> {
    const sameList = listKey(from) === listKey(to);
    if (!sameList && to.items.some((item) => item.tmdbId === tmdbId)) {
      return throwError(
        () => new LibraryError(this.transloco.translate('errors.movieAlreadyInTarget', { list: to.name }))
      );
    }
    if (!sameList && to.items.length >= MAX_LIST_ITEMS) {
      return throwError(
        () => new LibraryError(this.transloco.translate('errors.listFull', { list: to.name, max: MAX_LIST_ITEMS }))
      );
    }
    if (!this.authStore.isLoggedIn()) {
      this.session.moveItem(from.name, tmdbId, to.name, position);
      return of(undefined);
    }
    this.remoteLists.update((lists) =>
      moveListItem(lists, from, tmdbId, to, position)
    );
    return this.http
      .patch<unknown>(`${API_URL}/me/lists/${from.id}/items/${tmdbId}`, {
        ...(sameList ? {} : { toListId: to.id }),
        position,
      })
      .pipe(
        map(() => undefined),
        catchError((error) => {
          this.loadLists().subscribe();
          return throwError(() => error);
        })
      );
  }

  // Idempotent on the API. Network/5xx errors keep the session to retry on the next
  // login; a 4xx will not change by retrying, so the user is offered to discard it.
  importSession(): Observable<ImportSummary | null> {
    if (this.session.isEmpty() || this.importInProgress()) {
      return of(null);
    }
    if (this.session.importRejected()) {
      this.offerDiscard();
      return of(null);
    }
    this.importInProgress.set(true);
    return this.http
      .post<ImportSummary>(`${API_URL}/me/import`, toImportBody(this.session.data()))
      .pipe(
        tap(() => {
          this.session.clear();
          this.notify(this.transloco.translate('errors.guestActivitySaved'));
        }),
        catchError((error) => {
          if (isPermanentError(error)) {
            this.session.markImportRejected();
            this.offerDiscard();
          } else {
            this.notify(
              this.transloco.translate('errors.guestActivityFailed')
            );
          }
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
      movies: this.http.get<{ watched: number[]; ratings?: MovieRating[] }>(
        `${API_URL}/me/movies`
      ),
    }).subscribe({
      next: ({ history, lists, movies }) => {
        this.remoteHistory.set(history);
        this.remoteLists.set(lists);
        this.remoteWatched.set(movies.watched);
        // An API without ratings yet answers only `watched`.
        this.remoteRatings.set(movies.ratings ?? []);
        this.remoteLoaded.set(true);
        this.loadWatched(1);
      },
      error: () => {
        this.remoteLoaded.set(true);
        this.notify(this.transloco.translate('errors.libraryFailed'));
      },
    });
  }

  loadMoreWatched(): void {
    if (this.hasMoreWatched() && !this.watchedLoadingState()) {
      this.loadWatched(this.watchedPage() + 1);
    }
  }

  // Page 1 replaces the list (login, language change); later pages are appended.
  private loadWatched(page: number): void {
    this.watchedLoadingState.set(true);
    this.watchedFailedState.set(false);
    this.http
      .get<WatchedPage>(`${API_URL}/me/movies/watched`, {
        params: { page, limit: WATCHED_PAGE_SIZE },
      })
      .pipe(finalize(() => this.watchedLoadingState.set(false)))
      .subscribe({
        next: (result) => {
          this.remoteWatchedItems.update((items) => {
            const current = page === 1 ? [] : items;
            const known = new Set(current.map((item) => item.movie.tmdbId));
            return [...current, ...result.items.filter((item) => !known.has(item.movie.tmdbId))];
          });
          this.watchedTotal.set(result.total);
          this.watchedPage.set(page);
        },
        error: () => this.watchedFailedState.set(true),
      });
  }

  // Keeps the loaded pages in sync with marks made anywhere, without a request.
  private updateWatchedTab(movie: Movie, watched: boolean): void {
    const present = this.remoteWatchedItems().some((item) => item.movie.tmdbId === movie.tmdbId);
    if (watched && !present) {
      const entry = { movie, watchedAt: new Date().toISOString(), rating: this.ratings().get(movie.tmdbId) ?? null };
      this.remoteWatchedItems.update((items) => [entry, ...items]);
      this.watchedTotal.update((total) => total + 1);
    } else if (!watched && present) {
      this.remoteWatchedItems.update((items) => items.filter((item) => item.movie.tmdbId !== movie.tmdbId));
      this.watchedTotal.update((total) => Math.max(0, total - 1));
    }
  }

  // Emits once the library matches the current user (right away if it already does).
  whenReady(): Observable<void> {
    if (this.ready()) {
      return of(undefined);
    }
    return this.ready$.pipe(
      filter(Boolean),
      take(1),
      map(() => undefined)
    );
  }

  // Names are unique per user, ignoring case (same rule as the API).
  private validateListName(name: string, current?: MovieList): string | null {
    if (!name) {
      return this.transloco.translate('errors.listNameEmpty');
    }
    if (name.length > 50) {
      return this.transloco.translate('errors.listNameLength');
    }
    const taken = this.lists().some(
      (list) =>
        list !== current && list.name.toLowerCase() === name.toLowerCase()
    );
    return taken ? this.transloco.translate('errors.listNameExists', { name }) : null;
  }

  private loadHistory(): Observable<void> {
    return this.http
      .get<HistoryPage>(`${API_URL}/me/history`, {
        params: { limit: HISTORY_PAGE_SIZE },
      })
      .pipe(
        tap((page) => this.remoteHistory.set(page.items)),
        map(() => undefined),
        catchError(() => of(undefined))
      );
  }

  private loadLists(): Observable<void> {
    return this.http.get<MovieList[]>(`${API_URL}/me/lists`).pipe(
      tap((lists) => this.remoteLists.set(lists)),
      map(() => undefined)
    );
  }

  private clearRemote(): void {
    this.remoteLoaded.set(false);
    this.remoteHistory.set([]);
    this.remoteLists.set([]);
    this.remoteWatched.set([]);
    this.remoteRatings.set([]);
    this.remoteWatchedItems.set([]);
    this.watchedTotal.set(0);
    this.watchedPage.set(0);
    this.watchedFailedState.set(false);
  }

  private offerDiscard(): void {
    this.snackBar
      .open(
        this.transloco.translate('errors.guestImportRejected'),
        this.transloco.translate('common.discard'),
        { duration: 10000 }
      )
      .onAction()
      .subscribe(() => {
        this.session.clear();
        this.notify(this.transloco.translate('errors.guestActivityDiscarded'));
      });
  }

  private notify(message: string): void {
    this.snackBar.open(message, this.transloco.translate('common.dismiss'), { duration: 5000 });
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

// History entries only carry the required movie fields: the full data goes in `movies`.
// `watchedAt` stays in the browser: the import contract has no such field.
export function toImportBody(data: SessionData): SessionData {
  const { watchedAt: _dates, ...body } = data;
  return {
    ...body,
    history: data.history.map(({ movie, ...entry }) => ({
      ...entry,
      movie: {
        tmdbId: movie.tmdbId,
        title: movie.title,
        posterPath: movie.posterPath,
      } as Movie,
    })),
  };
}

// 401 means an expired session (handled elsewhere); other 4xx are permanent.
function isPermanentError(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 401
  );
}

export function listKey(list: MovieList): string {
  return list.id ?? list.name;
}

function moveListItem(
  lists: MovieList[],
  from: MovieList,
  tmdbId: number,
  to: MovieList,
  position: number
): MovieList[] {
  const moving = from.items.find((item) => item.tmdbId === tmdbId);
  if (!moving) {
    return lists;
  }
  const renumber = (items: MovieListItem[]) =>
    items.map((item, index) => ({ ...item, position: index }));
  const withoutItem = lists.map((list) =>
    listKey(list) === listKey(from)
      ? { ...list, items: list.items.filter((item) => item.tmdbId !== tmdbId) }
      : list
  );
  return withoutItem.map((list) => {
    if (listKey(list) !== listKey(to)) {
      return listKey(list) === listKey(from)
        ? { ...list, items: renumber(list.items) }
        : list;
    }
    const items = [...list.items];
    items.splice(Math.min(position, items.length), 0, moving);
    return { ...list, items: renumber(items) };
  });
}
