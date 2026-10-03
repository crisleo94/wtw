import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Movie } from '../interfaces/movie.interface';
import { AuthStore } from './auth.store';
import { SESSION_KEY, SESSION_LIMITS, SessionStore, watchedOrder } from './session.store';
import { clearAnonymousStorage } from '../testing/guest-storage-testing';

const movie = (tmdbId: number) =>
  ({ tmdbId, title: `Movie ${tmdbId}`, posterPath: '/p.jpg' }) as Movie;

describe('SessionStore', () => {
  const reset = () => {
    clearAnonymousStorage();
    sessionStorage.removeItem('wtw.session.rejected.v1');
  };
  beforeEach(() => {
    reset();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(reset);

  describe('guest mode', () => {
    it('should keep a guest library in localStorage', () => {
      TestBed.inject(AuthStore).continueAsGuest();
      const store = TestBed.inject(SessionStore);
      TestBed.tick();
      store.addHistory(movie(1));
      expect(localStorage.getItem(SESSION_KEY)).toContain('Movie 1');
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    });

    it('should move what the tab had to localStorage when guest mode is chosen', () => {
      const store = TestBed.inject(SessionStore);
      store.addToList('Watchlist', movie(7));
      expect(sessionStorage.getItem(SESSION_KEY)).toContain('Movie 7');

      TestBed.inject(AuthStore).continueAsGuest();
      TestBed.tick();

      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
      expect(localStorage.getItem(SESSION_KEY)).toContain('Movie 7');
      expect(store.data().lists[0].items).toEqual([7]);
    });

    it('should postpone the guest expiry on every change', () => {
      TestBed.inject(AuthStore).continueAsGuest();
      const store = TestBed.inject(SessionStore);
      TestBed.tick();
      localStorage.setItem('wtw.guest.activeAt.v1', '1');
      store.setWatched(movie(2), true);
      expect(Number(localStorage.getItem('wtw.guest.activeAt.v1'))).toBeGreaterThan(1);
    });

    it('should pick up changes made by a guest in another tab', () => {
      TestBed.inject(AuthStore).continueAsGuest();
      const store = TestBed.inject(SessionStore);
      TestBed.tick();
      const other = {
        history: [],
        watched: [9],
        lists: [{ name: 'Watchlist', isSystem: true, items: [9] }],
        movies: { 9: movie(9) },
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(other));
      window.dispatchEvent(new StorageEvent('storage', { key: SESSION_KEY }));
      expect(store.data().watched).toEqual([9]);
      expect(store.data().lists[0].items).toEqual([9]);
    });

    it('should clear the library from both storages', () => {
      TestBed.inject(AuthStore).continueAsGuest();
      const store = TestBed.inject(SessionStore);
      TestBed.tick();
      store.addHistory(movie(3));
      sessionStorage.setItem(SESSION_KEY, '{}');
      store.clear();
      expect(localStorage.getItem(SESSION_KEY)).toBeNull();
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    });
  });

  it('should start empty with the Watchlist', () => {
    const store = TestBed.inject(SessionStore);
    expect(store.isEmpty()).toBeTrue();
    expect(store.data().lists).toEqual([
      { name: 'Watchlist', isSystem: true, items: [] },
    ]);
  });

  it('should persist history, watched and lists with their movies', () => {
    const store = TestBed.inject(SessionStore);
    store.addHistory(movie(1), { yearFrom: 1990 });
    store.setWatched(movie(2), true);
    store.addToList('Watchlist', movie(3));
    store.addToList('Watchlist', movie(3));

    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY)!);
    expect(saved.history[0].movie.tmdbId).toBe(1);
    expect(saved.history[0].filters).toEqual({ yearFrom: 1990 });
    expect(saved.watched).toEqual([2]);
    expect(saved.lists[0].items).toEqual([3]);
    expect(Object.keys(saved.movies).sort()).toEqual(['1', '2', '3']);
    expect(store.isEmpty()).toBeFalse();
  });

  it('should drop movies no longer referenced and clear everything', () => {
    const store = TestBed.inject(SessionStore);
    store.addToList('Watchlist', movie(3));
    store.removeFromList('Watchlist', 3);
    expect(store.data().movies).toEqual({});

    store.addHistory(movie(1));
    store.clear();
    expect(store.isEmpty()).toBeTrue();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('should restore the session and ignore corrupted data', () => {
    sessionStorage.setItem(SESSION_KEY, '{"history": "bad"}');
    expect(TestBed.inject(SessionStore).isEmpty()).toBeTrue();
  });

  it('should rate, change and clear ratings and keep the rated movie', () => {
    const store = TestBed.inject(SessionStore);
    store.setRating(movie(1), 4.5);
    store.setRating(movie(1), 3);
    store.setRating(movie(2), 0.5);
    expect(store.data().ratings).toEqual([
      { tmdbId: 1, rating: 3 },
      { tmdbId: 2, rating: 0.5 },
    ]);
    expect(store.data().movies['1'].title).toBe('Movie 1');
    expect(store.isEmpty()).toBeFalse();
    store.setRating(movie(1), null);
    store.setRating(movie(2), null);
    expect(store.data().ratings).toEqual([]);
    expect(store.isEmpty()).toBeTrue();
  });

  it('should read sessions saved before ratings and drop invalid ratings', () => {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ history: [], watched: [], lists: [], movies: {} })
    );
    expect(TestBed.inject(SessionStore).data().ratings).toEqual([]);
    TestBed.resetTestingModule();
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        history: [],
        watched: [],
        lists: [],
        movies: {},
        ratings: [{ tmdbId: 1, rating: 4 }, { tmdbId: 2, rating: 4.2 }, { tmdbId: 3, rating: 0 }, { rating: 5 }],
      })
    );
    expect(TestBed.inject(SessionStore).data().ratings).toEqual([{ tmdbId: 1, rating: 4 }]);
  });

  it('should keep the ratings within the import limit', () => {
    const ratings = Array.from({ length: SESSION_LIMITS.ratings + 3 }, (_, i) => ({ tmdbId: i + 1, rating: 5 }));
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ history: [], watched: [], lists: [], movies: {}, ratings })
    );
    expect(TestBed.inject(SessionStore).data().ratings.length).toBe(SESSION_LIMITS.ratings);
  });

  it('should date watched movies, keep the first date and drop it when unmarked', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-10-01T10:00:00Z'));
    const store = TestBed.inject(SessionStore);
    store.setWatched(movie(1), true);
    jasmine.clock().mockDate(new Date('2026-10-02T10:00:00Z'));
    store.setWatched(movie(2), true);
    store.setWatched(movie(1), true);
    jasmine.clock().uninstall();
    expect(store.data().watchedAt).toEqual({
      '1': '2026-10-01T10:00:00.000Z',
      '2': '2026-10-02T10:00:00.000Z',
    });
    expect(watchedOrder(store.data())).toEqual([2, 1]);
    store.setWatched(movie(2), false);
    expect(store.data().watchedAt).toEqual({ '1': '2026-10-01T10:00:00.000Z' });
  });

  it('should order old sessions without dates by position, newest first', () => {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ history: [], watched: [3, 1, 2], lists: [], movies: {}, ratings: [] })
    );
    const store = TestBed.inject(SessionStore);
    expect(store.data().watched).toEqual([3, 1, 2]);
    expect(watchedOrder(store.data())).toEqual([2, 1, 3]);

    // New marks get a date and go first; the undated ones keep their order after them.
    store.setWatched(movie(9), true);
    expect(watchedOrder(store.data())).toEqual([9, 2, 1, 3]);
  });

  it('should drop invalid or orphan dates when reading a session', () => {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        history: [],
        watched: [1, 2],
        watchedAt: { 1: 'not a date', 2: '2026-10-02T10:00:00.000Z', 7: '2026-10-02T10:00:00.000Z' },
        lists: [],
        movies: {},
        ratings: [],
      })
    );
    expect(TestBed.inject(SessionStore).data().watchedAt).toEqual({ '2': '2026-10-02T10:00:00.000Z' });
  });

  it('should keep the session within the API import limits', () => {
    const store = TestBed.inject(SessionStore);
    for (let id = 1; id <= SESSION_LIMITS.history + 5; id++) {
      store.addHistory(movie(id));
    }
    expect(store.data().history.length).toBe(SESSION_LIMITS.history);
    expect(store.data().history[0].movie.tmdbId).toBe(SESSION_LIMITS.history + 5);

    const watched = Array.from({ length: SESSION_LIMITS.watched + 3 }, (_, i) => i + 1);
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ history: [], watched, lists: [], movies: {} })
    );
    TestBed.resetTestingModule();
    expect(TestBed.inject(SessionStore).data().watched.length).toBe(SESSION_LIMITS.watched);
  });

  it('should forget a rejected import on new activity', () => {
    const store = TestBed.inject(SessionStore);
    store.addHistory(movie(1));
    store.markImportRejected();
    expect(store.importRejected()).toBeTrue();
    store.setWatched(movie(1), true);
    expect(store.importRejected()).toBeFalse();
  });
});
