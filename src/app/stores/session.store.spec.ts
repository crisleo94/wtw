import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Movie } from '../interfaces/movie.interface';
import { SESSION_KEY, SESSION_LIMITS, SessionStore } from './session.store';

const movie = (tmdbId: number) =>
  ({ tmdbId, title: `Movie ${tmdbId}`, posterPath: '/p.jpg' }) as Movie;

describe('SessionStore', () => {
  const reset = () => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem('wtw.session.rejected.v1');
  };
  beforeEach(reset);
  afterEach(reset);

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
