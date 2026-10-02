import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { apiInterceptor } from './api.interceptor';

describe('apiInterceptor', () => {
  function setup(request: Request | null) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        { provide: REQUEST, useValue: request },
      ],
    });
    return {
      http: TestBed.inject(HttpClient),
      httpTesting: TestBed.inject(HttpTestingController),
    };
  }

  it('should not add headers in the browser', () => {
    const { http, httpTesting } = setup(null);
    http.get('/api/genres').subscribe();
    const req = httpTesting.expectOne('/api/genres');
    expect(req.request.headers.has('cookie')).toBeFalse();
    req.flush([]);
  });

  it('should forward the cookie during SSR', () => {
    // Browsers drop the cookie header from Request, so a stub is used.
    const request = {
      url: 'http://localhost:4000/some/page',
      headers: new Headers({ cookie: 'wtw_token=abc' }),
    } as Request;
    const { http, httpTesting } = setup(request);
    http.get('/api/genres').subscribe();
    const req = httpTesting.expectOne('/api/genres');
    expect(req.request.headers.get('cookie')).toBe('wtw_token=abc');
    req.flush([]);
  });
});
