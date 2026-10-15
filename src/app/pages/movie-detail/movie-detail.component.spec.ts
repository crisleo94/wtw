import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { AuthStore } from '../../stores/auth.store';
import { LanguageStore } from '../../stores/language.store';
import { LibraryStore } from '../../stores/library.store';
import { PREFERENCES_KEY } from '../../stores/preferences.store';
import { clearAnonymousStorage } from '../../testing/guest-storage-testing';
import { movieDetails } from '../../testing/movie-details-testing';
import { clearLanguagePreference, getTranslocoTestingModule } from '../../testing/transloco-testing';
import { MovieDetailComponent } from './movie-detail.component';

describe('MovieDetailComponent', () => {
  let fixture: ComponentFixture<MovieDetailComponent>;
  let httpTesting: HttpTestingController;
  let element: HTMLElement;

  beforeEach(async () => {
    localStorage.setItem('wtw.lang', 'en');
    clearAnonymousStorage();
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ region: 'EC', providerIds: [8], includeRentBuy: false }));
    await TestBed.configureTestingModule({
      imports: [MovieDetailComponent, getTranslocoTestingModule()],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MovieDetailComponent);
    element = fixture.nativeElement;
  });

  afterEach(() => {
    localStorage.removeItem(PREFERENCES_KEY);
    clearAnonymousStorage();
    clearLanguagePreference();
  });

  async function open(id = '550') {
    fixture.componentRef.setInput('tmdbId', id);
    await fixture.whenStable();
  }

  function expectDetails(id = 550) {
    return httpTesting.expectOne((request) => request.url === `/api/movies/${id}/details`);
  }

  const text = (selector: string) => element.querySelector(selector)?.textContent?.trim();

  it('should show every section of the movie in the chosen country', async () => {
    await open();
    expect(element.querySelector('app-detail-skeleton')).toBeTruthy();
    const req = expectDetails();
    expect(req.request.params.get('region')).toBe('EC');
    req.flush(movieDetails());
    await fixture.whenStable();

    expect(text('.title')).toBe('Fight Club');
    expect(Array.from(element.querySelectorAll('.facts li')).map((li) => li.textContent!.trim())).toEqual(['1999', '2 h 19 min', '18']);
    expect(element.querySelector('.certification')!.getAttribute('aria-label')).toBe('Rated 18');
    expect(text('.genres')).toContain('Thriller');
    expect(text('.tagline')).toBe('Mischief. Mayhem. Soap.');
    expect(text('.synopsis p')).toContain('soap salesman');
    expect(text('.score-value')).toContain('8.4');
    expect(element.querySelector('.hero')!.getAttribute('style')).toContain('https://image.tmdb.org/t/p/w1280/backdrop.jpg');
    expect(text('app-where-to-watch h3')).toContain('Where to watch in');
    expect(text('app-movie-cast .crew')).toContain('David Fincher');
    expect(text('app-movie-cast .crew')).toContain('Jim Uhls, Chuck Palahniuk');
    expect(element.querySelectorAll('app-movie-cast .person').length).toBe(2);
    expect(element.querySelector('app-movie-cast .no-photo')).toBeTruthy();
    expect(element.querySelector('app-trailer button.play')).toBeTruthy();
    expect(element.querySelector('iframe')).toBeNull();
    expect(element.querySelector('app-movie-strip a')!.getAttribute('href')).toBe('/movie/807');
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('.links a')).map((a) => a.href);
    expect(links).toEqual(['https://www.themoviedb.org/movie/550', 'https://www.imdb.com/title/tt0137523/']);
    expect(TestBed.inject(Title).getTitle()).toBe('Fight Club');
  });

  it('should hide the trailer and IMDb link when there are none', async () => {
    await open();
    expectDetails().flush(movieDetails({ trailer: null, externalIds: { imdbId: null }, recommendations: [], cast: [], crew: [] }));
    await fixture.whenStable();
    expect(element.querySelector('app-trailer')).toBeNull();
    expect(element.querySelector('app-movie-strip')).toBeNull();
    expect(element.querySelector('app-movie-cast')).toBeNull();
    expect(element.querySelectorAll('.links a').length).toBe(1);
  });

  it('should say when the movie does not exist', async () => {
    await open();
    expectDetails().flush({ statusCode: 404 }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    expect(text('.state h2')).toBe('Movie not found');
    expect(element.querySelector('.state a')!.getAttribute('href')).toBe('/');
  });

  it('should not ask the API for an invalid id', async () => {
    await open('abc');
    httpTesting.expectNone((request) => request.url.includes('/details'));
    expect(text('.state h2')).toBe('Movie not found');
  });

  it('should offer to retry after an error', async () => {
    await open();
    expectDetails().flush(null, { status: 502, statusText: 'Bad Gateway' });
    await fixture.whenStable();
    expect(text('.state p')).toBe("Couldn't load this movie.");
    element.querySelector<HTMLButtonElement>('.state button')!.click();
    await fixture.whenStable();
    expectDetails().flush(movieDetails());
    await fixture.whenStable();
    expect(text('.title')).toBe('Fight Club');
  });

  it('should reload in the new language keeping the page on screen', async () => {
    await open();
    expectDetails().flush(movieDetails());
    await fixture.whenStable();
    TestBed.inject(LanguageStore).setLang('es');
    await fixture.whenStable();
    expect(element.querySelector('app-detail-skeleton')).toBeNull();
    const req = expectDetails();
    req.flush(movieDetails({ movie: { ...movieDetails().movie, title: 'El club de la lucha' } }));
    await fixture.whenStable();
    expect(text('.title')).toBe('El club de la lucha');
    expect(text('.back')).toContain('Volver');
  });

  it('should update the library from the actions', async () => {
    TestBed.inject(AuthStore).continueAsGuest();
    await open();
    expectDetails().flush(movieDetails());
    await fixture.whenStable();
    const [watchlist, watched] = Array.from(element.querySelectorAll<HTMLButtonElement>('.actions button'));
    watchlist.click();
    watched.click();
    await fixture.whenStable();
    const library = TestBed.inject(LibraryStore);
    expect(library.watchlistIds().has(550)).toBeTrue();
    expect(library.watchedIds().has(550)).toBeTrue();
    expect(watched.getAttribute('aria-pressed')).toBe('true');
    // Only the light movie data is kept in the session.
    expect(Object.keys(JSON.parse(localStorage.getItem('wtw.session.v1')!).movies['550'])).not.toContain('runtime');
  });

  it('should go back in the history or to the generator when opened directly', async () => {
    await open();
    expectDetails().flush(movieDetails());
    const location = TestBed.inject(Location);
    const back = spyOn(location, 'back');
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    spyOn(location, 'getState').and.returnValue({ navigationId: 1 });
    fixture.componentInstance.back();
    expect(navigate).toHaveBeenCalledWith('/');

    (location.getState as jasmine.Spy).and.returnValue({ navigationId: 3 });
    fixture.componentInstance.back();
    expect(back).toHaveBeenCalled();
  });

  it('should fit a 320px screen without horizontal scroll', async () => {
    element.style.display = 'block';
    element.style.width = '320px';
    await open();
    expectDetails().flush(movieDetails({
      cast: Array.from({ length: 12 }, (_, id) => ({ id, name: `Actor ${id}`, character: 'Someone', profilePath: null })),
    }));
    await fixture.whenStable();
    expect(element.scrollWidth).toBeLessThanOrEqual(320);
    const cast = element.querySelector<HTMLElement>('app-movie-cast ul')!;
    expect(cast.scrollWidth).toBeGreaterThan(cast.clientWidth);
    expect(getComputedStyle(cast).overflowX).toBe('auto');
  });
});
