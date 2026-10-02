import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Movie } from '../../interfaces/movie.interface';
import { AuthStore } from '../../stores/auth.store';
import { LibraryStore } from '../../stores/library.store';
import { SESSION_KEY } from '../../stores/session.store';
import { MovieCardComponent } from './movie-card.component';

describe('MovieCardComponent', () => {
  let component: MovieCardComponent;
  let fixture: ComponentFixture<MovieCardComponent>;

  beforeEach(async () => {
    sessionStorage.removeItem(SESSION_KEY);
    await TestBed.configureTestingModule({
      imports: [MovieCardComponent],
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

    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem('wtw.guest.v1');
  });
});
