import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Movie } from '../interfaces/movie.interface';
import { AuthStore } from './auth.store';
import { SESSION_KEY, SESSION_LIMITS, SessionStore } from './session.store';
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

  it('should not touch sessionStorage on the server', () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    const store = TestBed.inject(SessionStore);
    store.addHistory(movie(1));
    expect(store.data().history.length).toBe(1);
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
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
