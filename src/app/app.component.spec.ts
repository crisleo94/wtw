import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { AuthStore } from './stores/auth.store';
import { LanguageStore } from './stores/language.store';
import { clearLanguagePreference, getTranslocoTestingModule } from './testing/transloco-testing';
import { clearAnonymousStorage } from './testing/guest-storage-testing';

describe('AppComponent', () => {
  afterEach(() => clearLanguagePreference());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, getTranslocoTestingModule()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should link the logo to the home page', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a.logo')!;
    expect(link.getAttribute('href')).toBe('/');
    expect(link.getAttribute('aria-label')).toBe('Home');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('What to Watch?');
  });

  describe('header layout', () => {
    it('should show a round logo on the left of the centered title', async () => {
      const { header, title, logo, logoElement } = await measure('1280px');
      expect(Math.abs(logo.left - header.left - 16)).toBeLessThan(1);
      expect(logo.right).toBeLessThanOrEqual(title.left);
      expect(getComputedStyle(logoElement).borderRadius).toBe('50%');
    });

    it('should keep the logo in the top row on a 320px screen', async () => {
      const { title, logo, buttons } = await measure('320px');
      for (const button of buttons) {
        const overlapsLogo =
          button.left < logo.right && button.top < logo.bottom && button.bottom > logo.top;
        expect(overlapsLogo).toBeFalse();
      }
      expect(title.top).toBeGreaterThanOrEqual(logo.bottom);
    });

    it('should not let a long guest label cover the logo on a 320px screen', async () => {
      TestBed.inject(AuthStore).continueAsGuest();
      const { title, logo, buttons } = await measure('320px');
      for (const button of buttons) {
        const overlapsLogo =
          button.left < logo.right && button.top < logo.bottom && button.bottom > logo.top;
        expect(overlapsLogo).toBeFalse();
        expect(button.bottom).toBeLessThanOrEqual(title.top + 1);
      }
      clearAnonymousStorage();
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
      const buttons = [...host.querySelectorAll('.header-actions button')].map((b) => b.getBoundingClientRect());
      const logoElement = host.querySelector('app-logo') as HTMLElement;
      const logo = logoElement.getBoundingClientRect();
      return { header, title, actions, logo, logoElement, buttons };
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

    it('should stack at 768px in Spanish and keep Login on one line', async () => {
      TestBed.inject(LanguageStore).setLang('es');
      const { title, actions } = await measure('768px');
      expect(title.top).toBeGreaterThanOrEqual(actions.bottom);
      const login = document.querySelector('.login-button') as HTMLElement;
      expect(getComputedStyle(login).whiteSpace).toBe('nowrap');
      expect(login.getBoundingClientRect().height).toBeLessThanOrEqual(48);
    });

    it('should mark the Login button when browsing as a guest', async () => {
      const fixture = TestBed.createComponent(AppComponent);
      const host = fixture.nativeElement as HTMLElement;
      fixture.componentInstance.authStore.continueAsGuest();
      await fixture.whenStable();
      const login = host.querySelector('.login-button')!;
      expect(login.textContent).toContain('Login (guest)');
      expect(login.classList).toContain('guest');
      clearAnonymousStorage();
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
