import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Movie } from '../../interfaces/movie.interface';
import { GeneratorStore } from '../../stores/generator.store';
import { LanguageStore } from '../../stores/language.store';
import { clearLanguagePreference, getTranslocoTestingModule } from '../../testing/transloco-testing';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let generator: GeneratorStore;

  afterEach(() => clearLanguagePreference());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, getTranslocoTestingModule()],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    generator = TestBed.inject(GeneratorStore);
  });

  it('should show a friendly message when there are no results', async () => {
    const fixture = TestBed.createComponent(HomeComponent);
    generator.showMovie(null);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.message')?.textContent).toContain(
      'No movies match these filters'
    );
  });

  it('should translate the message when the language changes', async () => {
    const fixture = TestBed.createComponent(HomeComponent);
    generator.showMovie(null);
    TestBed.inject(LanguageStore).setLang('es');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.message')?.textContent).not.toContain(
      'No movies match these filters'
    );
  });

  it('should reload the same movie in the new language', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    const httpTesting = TestBed.inject(HttpTestingController);
    const movie = { tmdbId: 603, title: 'The Matrix', genreIds: [] } as unknown as Movie;
    generator.showMovie(movie);

    TestBed.inject(LanguageStore).setLang('es');
    httpTesting.match('/api/genres');
    httpTesting.expectOne('/api/movies/603').flush({ ...movie, overview: 'Neo descubre la verdad' });
    httpTesting.expectNone('/api/movies/generate');
    expect(generator.movie()?.overview).toBe('Neo descubre la verdad');
  });

  it('should explain when the chosen platforms have no movie', async () => {
    const fixture = TestBed.createComponent(HomeComponent);
    generator.showError('errors.noProvidersMatch');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.message')?.textContent).toContain(
      'Only my platforms'
    );
  });

  it('should keep where to watch when the movie comes back in another language', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    const httpTesting = TestBed.inject(HttpTestingController);
    const watchProviders = { region: 'EC', link: null, flatrate: [], free: [], ads: [], rent: [], buy: [] };
    const movie = { tmdbId: 603, title: 'The Matrix', genreIds: [], watchProviders } as unknown as Movie;
    generator.showMovie(movie);
    TestBed.inject(LanguageStore).setLang('es');
    httpTesting.match('/api/genres');
    httpTesting.expectOne('/api/movies/603').flush({ ...movie, watchProviders: undefined, title: 'Matrix' });
    expect(generator.movie()?.title).toBe('Matrix');
    expect(generator.movie()?.watchProviders).toEqual(watchProviders);
  });

  it('should keep the movie and the filters after leaving the page', async () => {
    let fixture = TestBed.createComponent(HomeComponent);
    await fixture.whenStable();
    generator.showMovie({ tmdbId: 603, title: 'The Matrix', genreIds: [], overview: '' } as unknown as Movie);
    const form = fixture.debugElement.nativeElement.querySelector('app-form');
    expect(form).toBeTruthy();
    const yearFrom = fixture.nativeElement.querySelector('#yearFrom') as HTMLInputElement;
    yearFrom.value = '2001';
    yearFrom.dispatchEvent(new Event('input'));
    fixture.destroy();

    fixture = TestBed.createComponent(HomeComponent);
    await fixture.whenStable();
    expect((fixture.nativeElement.querySelector('#yearFrom') as HTMLInputElement).value).toBe('2001');
    expect(fixture.nativeElement.querySelector('mat-card-title')?.textContent).toContain('The Matrix');
  });
});
