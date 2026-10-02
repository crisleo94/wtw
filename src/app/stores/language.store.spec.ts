import { PLATFORM_ID, REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { serializeLanguageCookie } from '../i18n/languages';
import {
  clearLanguagePreference,
  getTranslocoTestingModule,
} from '../testing/transloco-testing';
import { LANGUAGE_KEY, LanguageStore } from './language.store';

describe('LanguageStore', () => {
  function setup(providers: unknown[] = []) {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: providers as never[],
    });
    return TestBed.inject(LanguageStore);
  }

  function serverSetup(headers: Record<string, string>) {
    return setup([
      { provide: PLATFORM_ID, useValue: 'server' },
      // Browsers drop the cookie header from Request, so a stub is used.
      { provide: REQUEST, useValue: { headers: new Headers(headers) } },
    ]);
  }

  afterEach(() => {
    clearLanguagePreference();
    document.documentElement.lang = 'en';
  });

  it('should prefer the saved language', () => {
    localStorage.setItem(LANGUAGE_KEY, 'es');
    document.cookie = 'wtw_lang=en; Path=/';
    expect(setup().lang()).toBe('es');
  });

  it('should use the cookie when nothing is saved', () => {
    spyOnProperty(navigator, 'language').and.returnValue('en-US');
    document.cookie = 'wtw_lang=es; Path=/';
    expect(setup().lang()).toBe('es');
  });

  it('should fall back to the browser language, then English', () => {
    const languageSpy = spyOnProperty(navigator, 'language').and.returnValue('es-MX');
    expect(setup().lang()).toBe('es');
    TestBed.resetTestingModule();
    languageSpy.and.returnValue('fr-FR');
    expect(setup().lang()).toBe('en');
  });

  it('should switch, persist and update <html lang> and Transloco', async () => {
    const store = setup();
    await store.init();
    store.setLang('es');
    expect(store.lang()).toBe('es');
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('es');
    expect(document.cookie).toContain('wtw_lang=es');
    expect(document.documentElement.lang).toBe('es');
    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('es');
  });

  it('should copy a choice saved before the cookie existed', async () => {
    localStorage.setItem(LANGUAGE_KEY, 'es');
    await setup().init();
    expect(document.cookie).toContain('wtw_lang=es');
  });

  it('should serialize a lax, readable cookie for a year', () => {
    const cookie = serializeLanguageCookie('es', false);
    expect(cookie).toBe('wtw_lang=es; Path=/; SameSite=Lax; Max-Age=31536000');
    expect(cookie).not.toContain('HttpOnly');
    expect(serializeLanguageCookie('es', true)).toContain('Secure');
  });

  it('should prefer the cookie over Accept-Language on the server', async () => {
    const store = serverSetup({
      cookie: 'wtw_token=abc; wtw_lang=es',
      'accept-language': 'en-US,en;q=0.9',
    });
    expect(store.lang()).toBe('es');
    await store.init();
    expect(document.documentElement.lang).toBe('es');
    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('es');
  });

  it('should use Accept-Language on the server, then English', () => {
    expect(serverSetup({ 'accept-language': 'es-ES,es;q=0.9' }).lang()).toBe('es');
    TestBed.resetTestingModule();
    expect(serverSetup({ cookie: 'wtw_lang=fr' }).lang()).toBe('en');
  });

  it('should not touch storage or cookies on the server', () => {
    localStorage.setItem(LANGUAGE_KEY, 'en');
    const store = serverSetup({ 'accept-language': 'es' });
    store.setLang('en');
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('en');
    expect(document.cookie).not.toContain('wtw_lang');
  });

  it('should notify only real language changes', () => {
    localStorage.setItem(LANGUAGE_KEY, 'en');
    const store = setup();
    const changes: string[] = [];
    store.changed$.subscribe((lang) => changes.push(lang));
    store.setLang('en');
    store.setLang('es');
    store.setLang('es');
    expect(changes).toEqual(['es']);
  });
});
