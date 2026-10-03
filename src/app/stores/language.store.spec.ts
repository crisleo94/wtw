import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import {
  clearLanguagePreference,
  getTranslocoTestingModule,
} from '../testing/transloco-testing';
import { LANGUAGE_KEY, LanguageStore } from './language.store';

describe('LanguageStore', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [getTranslocoTestingModule()] });
    return TestBed.inject(LanguageStore);
  }

  afterEach(() => {
    clearLanguagePreference();
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
