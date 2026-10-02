import { computed, Injectable, signal } from '@angular/core';
import {
  SessionData,
  SessionList,
  WATCHLIST_NAME,
} from '../interfaces/library.interface';
import { MovieFilters } from '../interfaces/movie-filters.interface';
import { Movie } from '../interfaces/movie.interface';
import { injectSessionStorage } from '../utils/browser-storage';

export const SESSION_KEY = 'wtw.session.v1';
export const SESSION_HISTORY_LIMIT = 500;

export const emptySession = (): SessionData => ({
  history: [],
  watched: [],
  lists: [{ name: WATCHLIST_NAME, isSystem: true, items: [] }],
  movies: {},
});

// Library of the anonymous user, kept in sessionStorage (`wtw.session.v1`).
@Injectable({
  providedIn: 'root',
})
export class SessionStore {
  private storage = injectSessionStorage();
  private state = signal<SessionData>(this.read());

  readonly data = this.state.asReadonly();
  readonly isEmpty = computed(() => {
    const { history, watched, lists } = this.state();
    return (
      !history.length &&
      !watched.length &&
      lists.every((list) => list.isSystem && !list.items.length)
    );
  });

  addHistory(movie: Movie, filters?: MovieFilters): void {
    this.commit((data) => ({
      ...data,
      history: [
        { movie, filters, generatedAt: new Date().toISOString() },
        ...data.history,
      ].slice(0, SESSION_HISTORY_LIMIT),
      movies: { ...data.movies, [movie.tmdbId]: movie },
    }));
  }

  setWatched(movie: Movie, watched: boolean): void {
    this.commit((data) => ({
      ...data,
      watched: watched
        ? [...new Set([...data.watched, movie.tmdbId])]
        : data.watched.filter((id) => id !== movie.tmdbId),
      movies: { ...data.movies, [movie.tmdbId]: movie },
    }));
  }

  addToList(name: string, movie: Movie): void {
    this.commit((data) => {
      const exists = data.lists.some((list) => list.name === name);
      const lists: SessionList[] = exists
        ? data.lists
        : [...data.lists, { name, isSystem: false, items: [] }];
      return {
        ...data,
        lists: lists.map((list) =>
          list.name === name && !list.items.includes(movie.tmdbId)
            ? { ...list, items: [...list.items, movie.tmdbId] }
            : list
        ),
        movies: { ...data.movies, [movie.tmdbId]: movie },
      };
    });
  }

  removeFromList(name: string, tmdbId: number): void {
    this.commit((data) => ({
      ...data,
      lists: data.lists.map((list) =>
        list.name === name
          ? { ...list, items: list.items.filter((id) => id !== tmdbId) }
          : list
      ),
    }));
  }

  clear(): void {
    this.state.set(emptySession());
    this.storage.remove(SESSION_KEY);
  }

  private commit(updater: (data: SessionData) => SessionData): void {
    const data = withoutOrphanMovies(updater(this.state()));
    this.state.set(data);
    this.storage.set(SESSION_KEY, JSON.stringify(data));
  }

  private read(): SessionData {
    try {
      const raw = JSON.parse(this.storage.get(SESSION_KEY) ?? 'null');
      return isSessionData(raw) ? raw : emptySession();
    } catch {
      return emptySession();
    }
  }
}

function isSessionData(value: unknown): value is SessionData {
  const data = value as SessionData | null;
  return (
    !!data &&
    Array.isArray(data.history) &&
    Array.isArray(data.watched) &&
    Array.isArray(data.lists) &&
    typeof data.movies === 'object' &&
    data.movies !== null
  );
}

// Keeps only the movies still referenced, so the import body stays small.
function withoutOrphanMovies(data: SessionData): SessionData {
  const used = new Set<number>([
    ...data.history.map((entry) => entry.movie.tmdbId),
    ...data.watched,
    ...data.lists.flatMap((list) => list.items),
  ]);
  const movies = Object.fromEntries(
    Object.entries(data.movies).filter(([id]) => used.has(Number(id)))
  );
  return { ...data, movies };
}
