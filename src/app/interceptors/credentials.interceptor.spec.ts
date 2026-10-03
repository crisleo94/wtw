import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { credentialsInterceptor } from './credentials.interceptor';

describe('credentialsInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should send the cookie to every API endpoint', () => {
    http.get('/api/auth/me').subscribe();
    http.post('/api/auth/logout', null).subscribe();
    http.post('/api/me/import', {}).subscribe();
    for (const req of httpTesting.match(() => true)) {
      expect(req.request.withCredentials).withContext(req.request.url).toBeTrue();
      req.flush(null);
    }
  });

  it('should not send credentials outside the API', () => {
    http.get('/assets/i18n/es.json').subscribe();
    http.get('/apiary').subscribe();
    for (const req of httpTesting.match(() => true)) {
      expect(req.request.withCredentials).withContext(req.request.url).toBeFalse();
      req.flush({});
    }
  });
});
