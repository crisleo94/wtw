import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { Movie } from '../interfaces/movie.interface';
import { AuthStore } from './auth.store';
import { LibraryStore, toImportBody } from './library.store';
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

  afterEach(() => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem('wtw.session.rejected.v1');
  });

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
    expect(importReq.request.body.history[0].movie).toEqual({
      tmdbId: 7,
      title: 'Alien',
      posterPath: '/a.jpg',
    });
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

  it('should offer to discard a session the API rejects instead of retrying', () => {
    const action = new Subject<void>();
    const snackBar = TestBed.inject(MatSnackBar);
    spyOn(snackBar, 'open').and.returnValue({ onAction: () => action } as never);
    library.recordGenerated(movie);
    login();
    httpTesting
      .expectOne('/api/me/import')
      .flush({ message: 'Too big' }, { status: 413, statusText: 'Payload Too Large' });
    flushReload();
    expect(session.importRejected()).toBeTrue();
    expect(snackBar.open).toHaveBeenCalledWith(
      jasmine.stringContaining('Discard it?'),
      'Discard',
      jasmine.anything()
    );

    library.importSession().subscribe();
    httpTesting.expectNone('/api/me/import');

    action.next();
    expect(session.isEmpty()).toBeTrue();
  });

  it('should add to the remote watchlist with only the tmdbId', () => {
    login();
    flushReload();
    library.addToWatchlist(movie).subscribe();
    const req = httpTesting.expectOne('/api/me/lists/w1/items');
    expect(req.request.body).toEqual({ tmdbId: 7 });
    req.flush({});
    httpTesting.expectOne('/api/me/lists').flush([]);
  });

  it('should strip duplicated movie data from history entries', () => {
    const body = toImportBody({
      history: [{ movie: { ...movie, overview: 'long' }, generatedAt: 'x' }],
      watched: [],
      lists: [],
      movies: { 7: { ...movie, overview: 'long' } },
    });
    expect(body.history[0].movie).toEqual({ tmdbId: 7, title: 'Alien', posterPath: '/a.jpg' } as Movie);
    expect(body.movies['7'].overview).toBe('long');
  });

  it('should reject duplicates and remove guest history', () => {
    library.addToWatchlist(movie).subscribe();
    let message = '';
    library.addToWatchlist(movie).subscribe({ error: (error) => (message = error.message) });
    expect(message).toContain('already in Watchlist');

    library.recordGenerated(movie);
    library.removeHistory(library.history()[0]).subscribe();
    expect(library.history().length).toBe(0);
  });

  it('should treat an expired session (/me 401) as anonymous', () => {
    auth.load().subscribe();
    httpTesting
      .expectOne('/api/auth/me')
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    TestBed.tick();
    expect(auth.isLoggedIn()).toBeFalse();
    library.recordGenerated(movie);
    expect(session.data().history.length).toBe(1);
    httpTesting.verify();
  });

  it('should explain the guest watched limit', () => {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        history: [],
        watched: Array.from({ length: 2000 }, (_, i) => i + 100),
        lists: [],
        movies: {},
      })
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    let message = '';
    TestBed.inject(LibraryStore)
      .setWatched(movie, true)
      .subscribe({ error: (error) => (message = error.message) });
    expect(message).toContain('up to 2000');
  });

  it('should be ready for guests and only after loading for users', () => {
    expect(library.ready()).toBeTrue();
    login();
    expect(library.ready()).toBeFalse();
    flushReload();
    expect(library.ready()).toBeTrue();
  });
});
