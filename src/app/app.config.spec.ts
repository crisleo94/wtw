import { HttpRequest, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PLATFORM_ID, REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { isObservable, Observable } from 'rxjs';
import { loadUser, shouldTransfer } from './app.config';

describe('appConfig', () => {
  function runLoadUser(providers: unknown[] = []) {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ...(providers as never[])],
    });
    const result = TestBed.runInInjectionContext(() => loadUser());
    if (isObservable(result)) {
      (result as Observable<unknown>).subscribe();
    }
    return TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    document.cookie = 'wtw_session=; Path=/; Max-Age=0';
  });

  it('should not ask for the user in the browser without wtw_session', () => {
    runLoadUser().expectNone('/api/auth/me');
  });

  it('should load the user in the browser with wtw_session', () => {
    document.cookie = 'wtw_session=1; Path=/';
    runLoadUser().expectOne('/api/auth/me').flush({ user: { id: 'u1' } });
  });

  it('should check the token cookie during SSR', () => {
    const server = (cookie: string) => [
      { provide: PLATFORM_ID, useValue: 'server' },
      { provide: REQUEST, useValue: { headers: new Headers({ cookie }) } },
    ];
    runLoadUser(server('wtw_session=1')).expectNone('/api/auth/me');
    TestBed.resetTestingModule();
    runLoadUser(server('wtw_token=abc')).expectOne('/api/auth/me').flush({ user: null });
  });

  it('should transfer only the user and the genres from the SSR', () => {
    expect(shouldTransfer(new HttpRequest('GET', '/api/auth/me'))).toBeTrue();
    expect(shouldTransfer(new HttpRequest('GET', '/api/genres'))).toBeTrue();
    expect(shouldTransfer(new HttpRequest('GET', '/api/me/lists'))).toBeFalse();
    expect(shouldTransfer(new HttpRequest('GET', '/api/movies/generate'))).toBeFalse();
    expect(shouldTransfer(new HttpRequest('POST', '/api/auth/me', null))).toBeFalse();
  });
});
