import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Movie } from '../interfaces/movie.interface';
import { SESSION_KEY, SessionStore } from './session.store';

const movie = (tmdbId: number) =>
  ({ tmdbId, title: `Movie ${tmdbId}`, posterPath: '/p.jpg' }) as Movie;

describe('SessionStore', () => {
  beforeEach(() => sessionStorage.removeItem(SESSION_KEY));
  afterEach(() => sessionStorage.removeItem(SESSION_KEY));

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
});
