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
const REJECTED_KEY = 'wtw.session.rejected.v1';

// Same limits as POST /api/me/import, so a session never grows past them.
export const SESSION_LIMITS = {
  history: 500,
  watched: 2000,
  lists: 50,
  listItems: 500,
};

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
  private rejected = signal(this.storage.get(REJECTED_KEY) === 'true');

  readonly data = this.state.asReadonly();
  // The API refused this exact session (4xx); it changes back on any new activity.
  readonly importRejected = this.rejected.asReadonly();
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
      ],
      movies: { ...data.movies, [movie.tmdbId]: movie },
    }));
  }

  removeHistory(tmdbId: number, generatedAt: string): void {
    this.commit((data) => ({
      ...data,
      history: data.history.filter(
        (entry) =>
          entry.movie.tmdbId !== tmdbId || entry.generatedAt !== generatedAt
      ),
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

  createList(name: string): void {
    this.commit((data) => ({
      ...data,
      lists: [...data.lists, { name, isSystem: false, items: [] }],
    }));
  }

  renameList(name: string, newName: string): void {
    this.commit((data) => ({
      ...data,
      lists: data.lists.map((list) =>
        list.name === name ? { ...list, name: newName } : list
      ),
    }));
  }

  deleteList(name: string): void {
    this.commit((data) => ({
      ...data,
      lists: data.lists.filter((list) => list.isSystem || list.name !== name),
    }));
  }

  // Moves (or reorders) a movie; `position` is the index in the target list.
  moveItem(from: string, tmdbId: number, to: string, position: number): void {
    this.commit((data) => {
      const lists = data.lists.map((list) =>
        list.name === from
          ? { ...list, items: list.items.filter((id) => id !== tmdbId) }
          : list
      );
      return {
        ...data,
        lists: lists.map((list) => {
          if (list.name !== to) {
            return list;
          }
          const items = [...list.items];
          items.splice(Math.min(position, items.length), 0, tmdbId);
          return { ...list, items };
        }),
      };
    });
  }

  markImportRejected(): void {
    this.rejected.set(true);
    this.storage.set(REJECTED_KEY, 'true');
  }

  clear(): void {
    this.state.set(emptySession());
    this.storage.remove(SESSION_KEY);
    this.clearRejected();
  }

  private commit(updater: (data: SessionData) => SessionData): void {
    const data = withoutOrphanMovies(withinLimits(updater(this.state())));
    this.state.set(data);
    this.storage.set(SESSION_KEY, JSON.stringify(data));
    this.clearRejected();
  }

  private clearRejected(): void {
    this.rejected.set(false);
    this.storage.remove(REJECTED_KEY);
  }

  private read(): SessionData {
    try {
      const raw = JSON.parse(this.storage.get(SESSION_KEY) ?? 'null');
      return isSessionData(raw)
        ? withoutOrphanMovies(withinLimits(raw))
        : emptySession();
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

// Newest history first; new watched ids, lists and items beyond the limits are dropped.
function withinLimits(data: SessionData): SessionData {
  const lists = [
    ...data.lists.filter((list) => list.isSystem).slice(0, 1),
    ...data.lists.filter((list) => !list.isSystem),
  ].slice(0, SESSION_LIMITS.lists);
  return {
    ...data,
    history: data.history.slice(0, SESSION_LIMITS.history),
    watched: data.watched.slice(0, SESSION_LIMITS.watched),
    lists: lists.map((list) => ({
      ...list,
      items: list.items.slice(0, SESSION_LIMITS.listItems),
    })),
  };
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
