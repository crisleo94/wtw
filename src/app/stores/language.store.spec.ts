import { PLATFORM_ID, REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { getTranslocoTestingModule } from '../testing/transloco-testing';
import { LANGUAGE_KEY, LanguageStore } from './language.store';

describe('LanguageStore', () => {
  function setup(providers: unknown[] = []) {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: providers as never[],
    });
    return TestBed.inject(LanguageStore);
  }

  afterEach(() => {
    localStorage.removeItem(LANGUAGE_KEY);
    document.documentElement.lang = 'en';
  });

  it('should prefer the saved language', () => {
    localStorage.setItem(LANGUAGE_KEY, 'es');
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
    expect(document.documentElement.lang).toBe('es');
    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('es');
  });

  it('should use Accept-Language on the server without touching storage', () => {
    localStorage.setItem(LANGUAGE_KEY, 'en');
    const store = setup([
      { provide: PLATFORM_ID, useValue: 'server' },
      {
        provide: REQUEST,
        useValue: new Request('http://localhost/', {
          headers: { 'accept-language': 'es-ES,es;q=0.9' },
        }),
      },
    ]);
    expect(store.lang()).toBe('es');
    store.setLang('en');
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('en');
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
