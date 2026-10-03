import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { AuthDialogResult } from '../auth-dialog/auth-dialog.component';
import { AuthDialogService } from '../../services/auth-dialog.service';

import { Movie } from '../../interfaces/movie.interface';
import { AuthStore } from '../../stores/auth.store';
import { LibraryStore } from '../../stores/library.store';
import { SESSION_KEY } from '../../stores/session.store';
import { MovieCardComponent } from './movie-card.component';
import {
  getTranslocoTestingModule,
  overflowingElements,
} from '../../testing/transloco-testing';
import { GenresService } from '../../services/genres.service';
import { TranslocoService } from '@jsverse/transloco';
import { clearAnonymousStorage } from '../../testing/guest-storage-testing';

describe('MovieCardComponent', () => {
  let component: MovieCardComponent;
  let fixture: ComponentFixture<MovieCardComponent>;

  beforeEach(async () => {
    clearAnonymousStorage();
    await TestBed.configureTestingModule({
      imports: [MovieCardComponent, getTranslocoTestingModule()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MovieCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the movie input', async () => {
    const movie = { tmdbId: 1, title: 'Alien', genreIds: [], overview: '' };
    fixture.componentRef.setInput('movie', movie as unknown as Movie);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('mat-card-title')?.textContent).toContain('Alien');
  });

  it('should toggle watchlist and watched state for a guest', async () => {
    const movie = { tmdbId: 9, title: 'Heat', genreIds: [], overview: '', posterPath: '/h.jpg' };
    TestBed.inject(AuthStore).continueAsGuest();
    fixture.componentRef.setInput('movie', movie as unknown as Movie);
    await fixture.whenStable();

    component.toggleWatchlist();
    component.toggleWatched();
    await fixture.whenStable();

    const library = TestBed.inject(LibraryStore);
    expect(library.watchlistIds().has(9)).toBeTrue();
    expect(library.watchedIds().has(9)).toBeTrue();
    expect(component.inWatchlist()).toBeTrue();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Watched');
    expect(compiled.textContent).toContain('bookmark');

    clearAnonymousStorage();
  });

  it('should rate the movie from the card as a guest', async () => {
    const movie = { tmdbId: 9, title: 'Heat', genreIds: [], overview: '', posterPath: '/h.jpg' };
    TestBed.inject(AuthStore).continueAsGuest();
    fixture.componentRef.setInput('movie', movie as unknown as Movie);
    await fixture.whenStable();
    component.rate(4.5);
    await fixture.whenStable();
    expect(TestBed.inject(LibraryStore).ratings().get(9)).toBe(4.5);
    const slider = (fixture.nativeElement as HTMLElement).querySelector('[role="slider"]');
    expect(slider?.getAttribute('aria-valuenow')).toBe('4.5');
    expect(slider?.getAttribute('aria-label')).toBe('Your rating for Heat');
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('wtw.guest.v1');
  });

  describe('anonymous -> dialog -> login -> action', () => {
    const heat = { tmdbId: 9, title: 'Heat', genreIds: [], overview: '', posterPath: '/h.jpg' } as unknown as Movie;
    let httpTesting: HttpTestingController;
    let dialogResult: Subject<AuthDialogResult | null>;

    beforeEach(async () => {
      httpTesting = TestBed.inject(HttpTestingController);
      dialogResult = new Subject();
      spyOn(TestBed.inject(AuthDialogService), 'ensureSession').and.returnValue(dialogResult);
      fixture.componentRef.setInput('movie', heat);
      await fixture.whenStable();
    });

    function loginAndLoad(lists: object[]): void {
      TestBed.inject(AuthStore).login({ email: 'a@b.co', password: '12345678' }).subscribe();
      httpTesting.expectOne('/api/auth/login').flush({ user: { id: 'u1' } });
      TestBed.tick();
      dialogResult.next('authenticated');
      httpTesting.expectNone((req) => req.url.includes('/items'));
      httpTesting.expectOne((req) => req.url === '/api/me/history').flush({ items: [] });
      httpTesting.expectOne('/api/me/lists').flush(lists);
      httpTesting.expectOne('/api/me/movies').flush({ watched: [] });
      TestBed.tick();
    }

    it('should wait for the library and add to the account watchlist', () => {
      component.toggleWatchlist();
      loginAndLoad([{ id: 'w1', name: 'Watchlist', isSystem: true, position: 0, items: [] }]);
      const req = httpTesting.expectOne('/api/me/lists/w1/items');
      expect(req.request.body).toEqual({ tmdbId: 9 });
    });

    it('should resolve the chosen list again by name after logging in', () => {
      component.addToList({ name: 'later', isSystem: false, position: 1, items: [] });
      loginAndLoad([
        { id: 'w1', name: 'Watchlist', isSystem: true, position: 0, items: [] },
        { id: 'l2', name: 'Later', isSystem: false, position: 1, items: [] },
      ]);
      httpTesting.expectOne('/api/me/lists/l2/items');
    });

    it('should say the session expired when an action gets a 401', () => {
      const snackBar = spyOn(TestBed.inject(MatSnackBar), 'open');
      component.toggleWatched();
      loginAndLoad([{ id: 'w1', name: 'Watchlist', isSystem: true, position: 0, items: [] }]);
      httpTesting
        .expectOne('/api/me/movies/9')
        .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
      expect(snackBar).toHaveBeenCalledWith(
        'Your session expired. Please log in again.',
        jasmine.any(String),
        jasmine.any(Object)
      );
    });
  });

  it('should keep chips under the title and the card inside 288px', async () => {
    spyOn(TestBed.inject(GenresService), 'getGenre').and.callFake((id: number) => ({
      id,
      name: `Ciencia ficción ${id}`,
    }));
    TestBed.inject(TranslocoService).setActiveLang('es');
    const host = fixture.nativeElement as HTMLElement;
    host.style.width = '288px';
    fixture.componentRef.setInput('movie', {
      tmdbId: 1,
      title: 'Alien, el octavo pasajero',
      genreIds: [1, 2, 3, 4],
      overview: 'Una tripulación espacial recibe una señal desconocida. '.repeat(8),
      posterPath: '',
      releaseDate: '1979-05-25',
      voteAverage: 8.2,
      voteCount: 15000,
    } as Movie);
    await fixture.whenStable();
    const title = host.querySelector('mat-card-title-group')!.getBoundingClientRect();
    const chips = host.querySelector('mat-chip-set')!.getBoundingClientRect();
    expect(chips.top).toBeGreaterThanOrEqual(title.bottom - 1);
    expect(overflowingElements(host)).toEqual([]);
  });

  it('should build poster URLs without a double slash', () => {
    expect(component.buildImageUrl('/abc.jpg')).toBe('https://image.tmdb.org/t/p/w500/abc.jpg');
  });

  it('should disable lists that already have the movie', () => {
    fixture.componentRef.setInput('movie', { tmdbId: 9 } as Movie);
    const item = { tmdbId: 9, position: 0, watched: false, movie: {} as Movie };
    expect(component.inList({ name: 'Later', isSystem: false, position: 1, items: [item] })).toBeTrue();
    expect(component.inList({ name: 'Other', isSystem: false, position: 2, items: [] })).toBeFalse();
  });
});
