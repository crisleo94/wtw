import { PlatformLocation } from '@angular/common';
import {
  FetchBackend,
  HttpClient,
  HttpInterceptorFn,
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { apiInterceptor } from '../interceptors/api.interceptor';
import { InternalApiBackend, SSR_INTERNAL_ORIGIN, toInternalUrl } from './internal-api.backend';

const PUBLIC = 'https://wtw.example.com';
const INTERNAL = 'http://localhost:4000';

describe('InternalApiBackend', () => {
  it('should send /api calls to the internal origin', () => {
    expect(toInternalUrl('/api/genres', PUBLIC, INTERNAL)).toBe(`${INTERNAL}/api/genres`);
    expect(toInternalUrl(`${PUBLIC}/api/movies/generate?yearFrom=1990`, PUBLIC, INTERNAL)).toBe(
      `${INTERNAL}/api/movies/generate?yearFrom=1990`
    );
    expect(toInternalUrl('/api/me/lists', null, INTERNAL)).toBe(`${INTERNAL}/api/me/lists`);
  });

  it('should leave other URLs alone', () => {
    expect(toInternalUrl(`${PUBLIC}/assets/i18n/es.json`, PUBLIC, INTERNAL)).toBe(
      `${PUBLIC}/assets/i18n/es.json`
    );
    expect(toInternalUrl('https://image.tmdb.org/api/x', PUBLIC, INTERNAL)).toBe(
      'https://image.tmdb.org/api/x'
    );
    expect(toInternalUrl(`${PUBLIC}/apix`, PUBLIC, INTERNAL)).toBe(`${PUBLIC}/apix`);
  });

  it('should keep the original URL and the cookie for the rest of the chain', async () => {
    const seen: string[] = [];
    const recorder: HttpInterceptorFn = (req, next) => {
      seen.push(req.url);
      return next(req);
    };
    const fetchSpy = spyOn(globalThis, 'fetch').and.callFake(async () =>
      new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
    );
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withFetch(), withInterceptors([apiInterceptor, recorder])),
        { provide: FetchBackend, useClass: InternalApiBackend },
        { provide: SSR_INTERNAL_ORIGIN, useValue: INTERNAL },
        {
          provide: PlatformLocation,
          useValue: { protocol: 'https:', hostname: 'wtw.example.com', port: '' },
        },
        { provide: REQUEST, useValue: { headers: new Headers({ cookie: 'wtw_token=abc' }) } },
      ],
    });
    await firstValueFrom(TestBed.inject(HttpClient).get('/api/genres'));

    // The transfer cache is an interceptor too: it keys on `/api/genres`.
    expect(seen).toEqual(['/api/genres']);
    const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
    expect(url).toBe(`${INTERNAL}/api/genres`);
    expect(new Headers(init.headers).get('cookie')).toBe('wtw_token=abc');
  });
});
