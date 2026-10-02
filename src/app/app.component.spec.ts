import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { Movie } from './interfaces/movie.interface';
import { LanguageStore } from './stores/language.store';
import { getTranslocoTestingModule } from './testing/transloco-testing';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, getTranslocoTestingModule()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('What to Watch?');
  });

  it('should show a friendly message when there are no results', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.recieveMovie(null);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.message')?.textContent).toContain(
      'No movies match these filters'
    );
  });

  it('should translate the message when the language changes', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.recieveMovie(null);
    TestBed.inject(LanguageStore).setLang('es');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.message')?.textContent).not.toContain(
      'No movies match these filters'
    );
    localStorage.removeItem('wtw.lang');
  });

  it('should reload the same movie in the new language', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const httpTesting = TestBed.inject(HttpTestingController);
    const movie = { tmdbId: 603, title: 'The Matrix', genreIds: [] } as unknown as Movie;
    fixture.componentInstance.recieveMovie(movie);

    TestBed.inject(LanguageStore).setLang('es');
    httpTesting.match('/api/genres');
    httpTesting.expectOne('/api/movies/603').flush({ ...movie, overview: 'Neo descubre la verdad' });
    httpTesting.expectNone('/api/movies/generate');
    expect(fixture.componentInstance.movie()?.overview).toBe('Neo descubre la verdad');
    localStorage.removeItem('wtw.lang');
  });

  describe('header layout', () => {
    it('should show a round logo on the left of the centered title', async () => {
      const { header, title, logo, logoElement } = await measure('1280px');
      expect(Math.abs(logo.left - header.left - 16)).toBeLessThan(1);
      expect(logo.right).toBeLessThanOrEqual(title.left);
      expect(getComputedStyle(logoElement).borderRadius).toBe('50%');
    });

    it('should keep the logo in the top row on a 320px screen', async () => {
      const { title, actions, logo } = await measure('320px');
      expect(logo.right).toBeLessThanOrEqual(actions.left);
      expect(title.top).toBeGreaterThanOrEqual(logo.bottom);
    });

    async function measure(width: string) {
      const fixture = TestBed.createComponent(AppComponent);
      const host = fixture.nativeElement as HTMLElement;
      host.style.display = 'block';
      host.style.width = width;
      await fixture.whenStable();
      const header = host.querySelector('.header')!.getBoundingClientRect();
      const title = host.querySelector('h1')!.getBoundingClientRect();
      const actions = host.querySelector('.header-actions')!.getBoundingClientRect();
      const logoElement = host.querySelector('app-logo') as HTMLElement;
      const logo = logoElement.getBoundingClientRect();
      return { header, title, actions, logo, logoElement };
    }

    it('should keep the title centered and the actions top right on desktop', async () => {
      const { header, title, actions } = await measure('1280px');
      const center = (rect: DOMRect) => rect.left + rect.width / 2;
      expect(Math.abs(center(title) - center(header))).toBeLessThan(1);
      expect(Math.abs(header.right - actions.right - 16)).toBeLessThan(1);
      expect(Math.abs(actions.top - title.top)).toBeLessThan(1);
    });

    it('should stack the actions above the title on a 320px screen', async () => {
      const { header, title, actions } = await measure('320px');
      expect(title.top).toBeGreaterThanOrEqual(actions.bottom);
      expect(actions.right).toBeLessThanOrEqual(header.right);
      expect(actions.left).toBeGreaterThanOrEqual(header.left);
    });

    it('should show Login without a session and the avatar with one', async () => {
      const fixture = TestBed.createComponent(AppComponent);
      const host = fixture.nativeElement as HTMLElement;
      await fixture.whenStable();
      expect(host.querySelector('.login-button')?.textContent).toContain('Login');
      expect(host.querySelector('.avatar-button')).toBeNull();

      const authStore = fixture.componentInstance.authStore as unknown as {
        currentUser: { set(user: unknown): void };
      };
      authStore.currentUser.set({ id: '1', email: 'ada@test.dev', fullName: 'Ada Lovelace' });
      await fixture.whenStable();
      expect(host.querySelector('.login-button')).toBeNull();
      expect(host.querySelector('.avatar-button')?.textContent?.trim()).toBe('AL');
    });
  });
});
