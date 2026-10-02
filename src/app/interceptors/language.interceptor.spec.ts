import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PLATFORM_ID, REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LanguageStore } from '../stores/language.store';
import { clearLanguagePreference, getTranslocoTestingModule } from '../testing/transloco-testing';
import { languageInterceptor } from './language.interceptor';

describe('languageInterceptor', () => {
  function setup(providers: unknown[] = []) {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        provideHttpClient(withInterceptors([languageInterceptor])),
        provideHttpClientTesting(),
        ...(providers as never[]),
      ],
    });
    return {
      http: TestBed.inject(HttpClient),
      httpTesting: TestBed.inject(HttpTestingController),
      languageStore: TestBed.inject(LanguageStore),
    };
  }

  afterEach(() => clearLanguagePreference());

  it('should send the active language to the API', () => {
    const { http, httpTesting, languageStore } = setup();
    languageStore.setLang('es');
    http.get('/api/genres').subscribe();
    const req = httpTesting.expectOne('/api/genres');
    expect(req.request.headers.get('Accept-Language')).toBe('es');
    req.flush([]);

    languageStore.setLang('en');
    http.get('/api/me/lists').subscribe();
    const next = httpTesting.expectOne('/api/me/lists');
    expect(next.request.headers.get('Accept-Language')).toBe('en');
    next.flush([]);
  });

  it('should send the language the SSR resolved from the cookie', () => {
    const { http, httpTesting } = setup([
      { provide: PLATFORM_ID, useValue: 'server' },
      {
        provide: REQUEST,
        useValue: {
          headers: new Headers({ cookie: 'wtw_lang=es', 'accept-language': 'en-US' }),
        },
      },
    ]);
    http.get('/api/genres').subscribe();
    const req = httpTesting.expectOne('/api/genres');
    expect(req.request.headers.get('Accept-Language')).toBe('es');
    req.flush([]);
  });

  it('should leave requests outside the API untouched', () => {
    const { http, httpTesting } = setup();
    http.get('/assets/i18n/en.json').subscribe();
    const req = httpTesting.expectOne('/assets/i18n/en.json');
    expect(req.request.headers.has('Accept-Language')).toBeFalse();
    req.flush({});
  });

  it('should use the language resolved for the SSR request', () => {
    const { http, httpTesting } = setup([
      { provide: PLATFORM_ID, useValue: 'server' },
      {
        provide: REQUEST,
        useValue: new Request('http://localhost/', {
          headers: { 'accept-language': 'es-AR,es;q=0.9' },
        }),
      },
    ]);
    http.get('/api/movies/generate').subscribe();
    const req = httpTesting.expectOne('/api/movies/generate');
    expect(req.request.headers.get('Accept-Language')).toBe('es');
    req.flush({});
  });
});
