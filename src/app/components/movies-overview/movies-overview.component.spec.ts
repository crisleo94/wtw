import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Movie } from '../../interfaces/movie.interface';
import { AuthStore } from '../../stores/auth.store';
import { LibraryStore } from '../../stores/library.store';
import { HttpTestingController } from '@angular/common/http/testing';
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

  it('should list the history in the compact table', async () => {
    const movie = { tmdbId: 4, title: 'Coco', overview: 'Miguel', genreIds: [], posterPath: '/c.jpg', releaseDate: '2017-10-27', voteAverage: 8.2 } as unknown as Movie;
    TestBed.inject(LibraryStore).recordGenerated(movie);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('app-movie-table tr.movie-row').length).toBe(1);
    expect(host.querySelector('app-movie-table .title')?.textContent).toContain('Coco');
  });
});
