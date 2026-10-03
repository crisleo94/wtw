import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Movie } from '../../interfaces/movie.interface';
import { AuthStore } from '../../stores/auth.store';
import { LibraryStore } from '../../stores/library.store';
import { HttpTestingController } from '@angular/common/http/testing';
import { MatTabGroup } from '@angular/material/tabs';
import { By } from '@angular/platform-browser';
import { TranslocoService } from '@jsverse/transloco';
import { SESSION_KEY } from '../../stores/session.store';
import { MoviesOverviewComponent } from './movies-overview.component';
import { getTranslocoTestingModule } from '../../testing/transloco-testing';
import { clearAnonymousStorage } from '../../testing/guest-storage-testing';

describe('MoviesOverviewComponent', () => {
  let component: MoviesOverviewComponent;
  let fixture: ComponentFixture<MoviesOverviewComponent>;

  beforeEach(async () => {
    clearAnonymousStorage();
    await TestBed.configureTestingModule({
      imports: [MoviesOverviewComponent, getTranslocoTestingModule()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MoviesOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  afterEach(() => sessionStorage.removeItem(SESSION_KEY));

  it('should list the session history and remove entries', async () => {
    const movie = { tmdbId: 3, title: 'Up', overview: 'Balloons', genreIds: [], posterPath: '/u.jpg' } as unknown as Movie;
    TestBed.inject(LibraryStore).recordGenerated(movie);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Up');

    component.removeHistory(component.history()[0]);
    await fixture.whenStable();
    expect(component.history().length).toBe(0);
    expect(compiled.textContent).toContain('will show up here');
  });

  it('should show the guest library right away', () => {
    const movie = { tmdbId: 4, title: 'Coco', overview: '', genreIds: [], posterPath: '/c.jpg' } as unknown as Movie;
    TestBed.inject(LibraryStore).recordGenerated(movie);
    const fresh = TestBed.createComponent(MoviesOverviewComponent);
    expect(fresh.componentInstance.history().map((entry) => entry.movie.tmdbId)).toEqual([4]);
  });

  it('should show a loading state instead of the empty message until the library is ready', async () => {
    TestBed.inject(AuthStore).login({ email: 'a@b.co', password: '12345678' }).subscribe();
    TestBed.inject(HttpTestingController).expectOne('/api/auth/login').flush({ user: { id: 'u1' } });
    TestBed.tick();
    await fixture.whenStable();
    expect(component.loaded()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Loading your movies');
  });

  it('should keep the keyboard focus on the stars while rating several steps', async () => {
    TestBed.inject(AuthStore).continueAsGuest();
    const movie = { tmdbId: 5, title: 'Up', overview: '', genreIds: [], posterPath: '/u.jpg' } as unknown as Movie;
    TestBed.inject(LibraryStore).recordGenerated(movie);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const slider = () => host.querySelector<HTMLElement>('tr.movie-row [role="slider"]')!;
    const first = slider();
    first.focus();
    for (let i = 0; i < 7; i++) {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
      );
      await fixture.whenStable();
    }
    expect(TestBed.inject(LibraryStore).ratings().get(5)).toBe(3.5);
    expect(slider()).toBe(first);
    expect(document.activeElement).toBe(first);
    expect(first.getAttribute('aria-valuenow')).toBe('3.5');
    clearAnonymousStorage();
  });

  describe('watched tab', () => {
    const up = { tmdbId: 5, title: 'Up', overview: '', genreIds: [], posterPath: '/u.jpg' } as unknown as Movie;
    const coco = { tmdbId: 6, title: 'Coco', overview: '', genreIds: [], posterPath: '/c.jpg' } as unknown as Movie;

    async function openWatchedTab(): Promise<HTMLElement> {
      const host = fixture.nativeElement as HTMLElement;
      host.querySelectorAll<HTMLElement>('[role="tab"]')[2].click();
      await fixture.whenStable();
      // The tab body swaps its content after Material's slide animation.
      await new Promise((resolve) => setTimeout(resolve, 700));
      await fixture.whenStable();
      expect(fixture.debugElement.query(By.directive(MatTabGroup)).componentInstance.selectedIndex).toBe(2);
      return host;
    }

    afterEach(() => {
      clearAnonymousStorage();
      TestBed.inject(TranslocoService).setActiveLang('en');
    });

    it('should show the empty message in Spanish', async () => {
      TestBed.inject(TranslocoService).setActiveLang('es');
      const host = await openWatchedTab();
      expect(host.querySelectorAll('[role="tab"]')[2].textContent).toContain('Vistas');
      expect(host.textContent).toContain('Las películas que marques como vistas aparecerán aquí.');
    });

    it('should list guest marks made anywhere, newest first, and unmark from the tab', async () => {
      TestBed.inject(AuthStore).continueAsGuest();
      const library = TestBed.inject(LibraryStore);
      library.setWatched(up, true).subscribe();
      library.setWatched(coco, true).subscribe();
      const host = await openWatchedTab();
      const titles = () => Array.from(host.querySelectorAll('app-movie-table .title')).map((t) => t.textContent?.trim());
      expect(titles()).toEqual(['Coco', 'Up']);
      expect(host.querySelector('.load-more')).toBeNull();

      // Only the watched toggle: no separate "remove" doing the same.
      const firstRow = host.querySelector('app-movie-table tr.movie-row')!;
      expect(firstRow.querySelector('.warn-button')).toBeNull();
      const toggle = firstRow.querySelector<HTMLButtonElement>('.inline-actions button[aria-pressed="true"]')!;
      expect(toggle.getAttribute('aria-label')).toBe('You watched it: click to undo');
      toggle.click();
      await fixture.whenStable();
      expect(titles()).toEqual(['Up']);
      expect(library.watchedIds().has(6)).toBeFalse();
    });

    it('should offer more pages to a user', async () => {
      const httpTesting = TestBed.inject(HttpTestingController);
      TestBed.inject(AuthStore).login({ email: 'a@b.co', password: '12345678' }).subscribe();
      httpTesting.expectOne('/api/auth/login').flush({ user: { id: 'u1' } });
      TestBed.tick();
      httpTesting.expectOne((req) => req.url === '/api/me/history').flush({ items: [], total: 0, limit: 50, offset: 0 });
      httpTesting.expectOne('/api/me/lists').flush([]);
      httpTesting.expectOne('/api/me/movies').flush({ watched: [5, 6] });
      httpTesting
        .expectOne((req) => req.url === '/api/me/movies/watched')
        .flush({ items: [{ movie: up, watchedAt: '2026-10-02T10:00:00.000Z', rating: null }], total: 2, page: 1, limit: 20 });
      const host = await openWatchedTab();
      const button = host.querySelector<HTMLButtonElement>('.load-more button')!;
      expect(button.textContent).toContain('Load more');
      button.click();
      const next = httpTesting.expectOne((req) => req.url === '/api/me/movies/watched');
      expect(next.request.params.get('page')).toBe('2');
      next.flush({ items: [{ movie: coco, watchedAt: '2026-10-01T10:00:00.000Z', rating: null }], total: 2, page: 2, limit: 20 });
      await fixture.whenStable();
      expect(host.querySelectorAll('app-movie-table tr.movie-row').length).toBe(2);
      expect(host.querySelector('.load-more')).toBeNull();
    });
  });

  it('should list the history in the compact table', async () => {
    const movie = { tmdbId: 4, title: 'Coco', overview: 'Miguel', genreIds: [], posterPath: '/c.jpg', releaseDate: '2017-10-27', voteAverage: 8.2 } as unknown as Movie;
    TestBed.inject(LibraryStore).recordGenerated(movie);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('app-movie-table tr.movie-row').length).toBe(1);
    expect(host.querySelector('app-movie-table .title')?.textContent).toContain('Coco');
  });
});
