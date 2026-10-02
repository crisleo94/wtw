import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Movie } from '../interfaces/movie.interface';
import { AuthStore } from './auth.store';
import { LibraryStore } from './library.store';
import { SESSION_KEY, SessionStore } from './session.store';

const movie = { tmdbId: 7, title: 'Alien', posterPath: '/a.jpg' } as Movie;
const user = { id: 'u1', email: 'a@b.co', fullName: 'Ana' };

describe('LibraryStore', () => {
  let library: LibraryStore;
  let session: SessionStore;
  let auth: AuthStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    sessionStorage.removeItem(SESSION_KEY);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    library = TestBed.inject(LibraryStore);
    session = TestBed.inject(SessionStore);
    auth = TestBed.inject(AuthStore);
    httpTesting = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });

  afterEach(() => sessionStorage.removeItem(SESSION_KEY));

  function login(): void {
    auth.login({ email: user.email, password: '12345678' }).subscribe();
    httpTesting.expectOne('/api/auth/login').flush({ user });
    TestBed.tick();
  }

  function flushReload(): void {
    httpTesting
      .expectOne((req) => req.url === '/api/me/history')
      .flush({ items: [], total: 0, limit: 50, offset: 0 });
    httpTesting
      .expectOne('/api/me/lists')
      .flush([{ id: 'w1', name: 'Watchlist', isSystem: true, position: 0, items: [] }]);
    httpTesting.expectOne('/api/me/movies').flush({ watched: [7] });
  }

  it('should keep guest activity in the session', () => {
    library.recordGenerated(movie, { yearFrom: 1990 });
    library.setWatched(movie, true).subscribe();
    library.addToWatchlist(movie).subscribe();

    expect(library.history()[0].movie.tmdbId).toBe(7);
    expect(library.history()[0].watched).toBeTrue();
    expect(library.watchlist()?.items.map((item) => item.tmdbId)).toEqual([7]);
    httpTesting.verify();
  });

  it('should import the session on login, clear it and load the library', () => {
    library.recordGenerated(movie);
    login();

    const importReq = httpTesting.expectOne('/api/me/import');
    expect(importReq.request.method).toBe('POST');
    expect(importReq.request.body.history[0].movie.tmdbId).toBe(7);
    expect(importReq.request.body.movies['7'].title).toBe('Alien');
    importReq.flush({ history: 1, watched: 0, lists: 0, items: 0 });

    expect(session.isEmpty()).toBeTrue();
    flushReload();
    expect(library.watchedIds().has(7)).toBeTrue();
    expect(library.watchlist()?.id).toBe('w1');
  });

  it('should skip the import when the session is empty', () => {
    login();
    httpTesting.expectNone('/api/me/import');
    flushReload();
  });

  it('should keep the session when the import fails', () => {
    library.recordGenerated(movie);
    login();
    httpTesting
      .expectOne('/api/me/import')
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

    expect(session.isEmpty()).toBeFalse();
    expect(sessionStorage.getItem(SESSION_KEY)).toContain('Alien');
    flushReload();
  });

  it('should not send the import twice while one is in progress', () => {
    library.recordGenerated(movie);
    login();
    library.importSession().subscribe();
    expect(httpTesting.match('/api/me/import').length).toBe(1);
  });
});
