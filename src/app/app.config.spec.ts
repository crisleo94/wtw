import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { isObservable } from 'rxjs';
import { loadUser } from './app.config';
import { AuthStore } from './stores/auth.store';

describe('appConfig', () => {
  it('should load the user from /api/auth/me on startup', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const result = TestBed.runInInjectionContext(() => loadUser());
    if (isObservable(result)) {
      result.subscribe();
    }
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/me')
      .flush({ user: { id: 'u1', email: 'a@b.co', fullName: 'Ana' } });
    expect(TestBed.inject(AuthStore).isLoggedIn()).toBeTrue();
  });
});
