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
import { LanguageStore } from './language.store';
import { LibraryStore, toImportBody } from './library.store';
import { SESSION_KEY, SessionStore } from './session.store';
import { clearLanguagePreference, getTranslocoTestingModule } from '../testing/transloco-testing';
import { clearAnonymousStorage } from '../testing/guest-storage-testing';

const movie = { tmdbId: 7, title: 'Alien', posterPath: '/a.jpg' } as Movie;
const user = { id: 'u1', email: 'a@b.co', fullName: 'Ana' };

describe('LibraryStore', () => {
  let library: LibraryStore;
  let session: SessionStore;
  let auth: AuthStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    clearAnonymousStorage();
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    library = TestBed.inject(LibraryStore);
    session = TestBed.inject(SessionStore);
    auth = TestBed.inject(AuthStore);
    httpTesting = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });

  afterEach(() => {
    clearLanguagePreference();
    clearAnonymousStorage();
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

  it('should rate as a guest in the session, import the ratings and use the API after login', () => {
    library.setRating(movie, 3.5).subscribe();
    expect(library.ratings().get(7)).toBe(3.5);
    library.setRating(movie, null).subscribe();
    expect(library.ratings().has(7)).toBeFalse();
    library.setRating(movie, 4).subscribe();

    login();
    const importReq = httpTesting.expectOne('/api/me/import');
    expect(importReq.request.body.ratings).toEqual([{ tmdbId: 7, rating: 4 }]);
    importReq.flush({ history: 0, watched: 0, lists: 0, items: 0 });
    httpTesting.expectOne((req) => req.url === '/api/me/history').flush({ items: [], total: 0, limit: 50, offset: 0 });
    httpTesting.expectOne('/api/me/lists').flush([]);
    httpTesting.expectOne('/api/me/movies').flush({ watched: [], ratings: [{ tmdbId: 7, rating: 4 }] });
    expect(library.ratings().get(7)).toBe(4);

    library.setRating(movie, 2.5).subscribe();
    const patch = httpTesting.expectOne('/api/me/movies/7');
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ rating: 2.5 });
    patch.flush({ tmdbId: 7, watched: false, watchedAt: null, rating: 2.5 });
    expect(library.ratings().get(7)).toBe(2.5);

    library.setRating(movie, null).subscribe();
    const clear = httpTesting.expectOne('/api/me/movies/7');
    expect(clear.request.body).toEqual({ rating: null });
    clear.flush({ tmdbId: 7, watched: false, watchedAt: null, rating: null });
    expect(library.ratings().has(7)).toBeFalse();
  });

  it('should load without ratings from an API that does not send them yet', () => {
    login();
    flushReload();
    expect(library.ratings().size).toBe(0);
    expect(library.watchedIds().has(7)).toBeTrue();
  });

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

  it('should reload the library in the new language', () => {
    login();
    flushReload();
    TestBed.inject(LanguageStore).setLang('es');
    const history = httpTesting.expectOne((req) => req.url === '/api/me/history');
    history.flush({ items: [{ id: 'h1', movie: { ...movie, title: 'Alien, el octavo pasajero' }, generatedAt: '2026-10-02' }], total: 1, limit: 50, offset: 0 });
    httpTesting.expectOne('/api/me/lists').flush([]);
    httpTesting.expectOne('/api/me/movies').flush({ watched: [] });
    expect(library.history()[0].movie.title).toBe('Alien, el octavo pasajero');
  });

  it('should not call the API for guests when the language changes', () => {
    TestBed.inject(LanguageStore).setLang('es');
    httpTesting.verify();
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
      watchedAt: { 7: '2026-10-02T10:00:00.000Z' },
      ratings: [{ tmdbId: 7, rating: 4.5 }],
      lists: [],
      movies: { 7: { ...movie, overview: 'long' } },
    });
    expect('watchedAt' in body).toBeFalse();
    expect(body.ratings).toEqual([{ tmdbId: 7, rating: 4.5 }]);
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
      imports: [getTranslocoTestingModule()],
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

  it('should manage guest lists with the API rules', () => {
    const errors: string[] = [];
    const fail = { error: (error: Error) => errors.push(error.message) };
    library.createList(' Fun ').subscribe();
    library.createList('fun').subscribe(fail);
    library.createList('   ').subscribe(fail);
    expect(library.lists().map((list) => list.name)).toEqual(['Watchlist', 'Fun']);

    const fun = library.lists()[1];
    library.renameList(fun, 'Weekend').subscribe();
    library.renameList(library.watchlist()!, 'Other').subscribe(fail);
    library.deleteList(library.watchlist()!).subscribe(fail);
    expect(errors).toEqual([
      'A list named "fun" already exists.',
      'The list name cannot be empty.',
      'The Watchlist cannot be renamed.',
      'The Watchlist cannot be deleted.',
    ]);

    library.deleteList(library.lists()[1]).subscribe();
    expect(library.lists().length).toBe(1);
  });

  it('should move guest movies between lists and reorder them', () => {
    const other = { ...movie, tmdbId: 8, title: 'Aliens' };
    library.addToWatchlist(movie).subscribe();
    library.addToWatchlist(other).subscribe();
    library.createList('Later').subscribe();

    library.moveItem(library.watchlist()!, 8, library.watchlist()!, 0).subscribe();
    expect(library.watchlist()!.items.map((item) => item.tmdbId)).toEqual([8, 7]);

    library.moveItem(library.watchlist()!, 7, library.lists()[1], 0).subscribe();
    expect(library.watchlist()!.items.map((item) => item.tmdbId)).toEqual([8]);
    expect(library.lists()[1].items.map((item) => item.tmdbId)).toEqual([7]);
  });

  it('should move remote items optimistically and send toListId', () => {
    login();
    flushReload();
    library['remoteLists'].set([
      { id: 'w1', name: 'Watchlist', isSystem: true, position: 0, items: [
        { tmdbId: 7, position: 0, watched: false, movie },
      ] },
      { id: 'l2', name: 'Later', isSystem: false, position: 1, items: [] },
    ]);
    const [watchlist, later] = library.lists();
    library.moveItem(watchlist, 7, later, 0).subscribe();

    expect(library.lists()[1].items.map((item) => item.tmdbId)).toEqual([7]);
    const req = httpTesting.expectOne('/api/me/lists/w1/items/7');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ toListId: 'l2', position: 0 });
    req.flush({});
  });
});
