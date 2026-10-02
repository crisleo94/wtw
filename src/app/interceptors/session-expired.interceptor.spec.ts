import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../stores/auth.store';
import { getTranslocoTestingModule } from '../testing/transloco-testing';
import { sessionExpiredInterceptor } from './session-expired.interceptor';

describe('sessionExpiredInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let authStore: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        provideHttpClient(withInterceptors([sessionExpiredInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    authStore = TestBed.inject(AuthStore);
    authStore.login({ email: 'a@b.co', password: '12345678' }).subscribe();
    httpTesting.expectOne('/api/auth/login').flush({ user: { id: 'u1' } });
  });

  const unauthorized = { status: 401, statusText: 'Unauthorized' };

  it('should log the user out on a 401 from a user endpoint', () => {
    http.get('/api/me/lists').subscribe({ error: () => undefined });
    httpTesting.expectOne('/api/me/lists').flush({}, unauthorized);
    expect(authStore.isLoggedIn()).toBeFalse();
  });

  it('should ignore 401 from other endpoints', () => {
    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    httpTesting.expectOne('/api/auth/login').flush({}, unauthorized);
    expect(authStore.isLoggedIn()).toBeTrue();
  });
});
