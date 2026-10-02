import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Movie } from '../../interfaces/movie.interface';
import { LibraryStore } from '../../stores/library.store';
import { SESSION_KEY } from '../../stores/session.store';
import { MoviesOverviewComponent } from './movies-overview.component';

describe('MoviesOverviewComponent', () => {
  let component: MoviesOverviewComponent;
  let fixture: ComponentFixture<MoviesOverviewComponent>;

  beforeEach(async () => {
    sessionStorage.removeItem(SESSION_KEY);
    await TestBed.configureTestingModule({
      imports: [MoviesOverviewComponent],
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

  it('should render an empty library until hydration finishes', () => {
    const movie = { tmdbId: 4, title: 'Coco', overview: '', genreIds: [], posterPath: '/c.jpg' } as unknown as Movie;
    TestBed.inject(LibraryStore).recordGenerated(movie);
    const fresh = TestBed.createComponent(MoviesOverviewComponent);
    expect(fresh.componentInstance.history()).toEqual([]);
  });
});
