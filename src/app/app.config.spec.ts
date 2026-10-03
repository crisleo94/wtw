import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { isObservable } from 'rxjs';
import { loadUser } from './app.config';
import { AuthStore, SIGNED_IN_KEY } from './stores/auth.store';

describe('appConfig', () => {
  function runLoadUser() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const result = TestBed.runInInjectionContext(() => loadUser());
    if (isObservable(result)) {
      result.subscribe();
    }
    return TestBed.inject(HttpTestingController);
  }

  afterEach(() => localStorage.removeItem(SIGNED_IN_KEY));

  it('should not ask for the user without a previous session', () => {
    runLoadUser().expectNone('/api/auth/me');
  });

  it('should load the user when a session existed', () => {
    localStorage.setItem(SIGNED_IN_KEY, 'true');
    runLoadUser()
      .expectOne('/api/auth/me')
      .flush({ user: { id: 'u1', email: 'a@b.co', fullName: 'Ana' } });
    expect(TestBed.inject(AuthStore).isLoggedIn()).toBeTrue();
  });

  it('should forget the session when the cookie expired', () => {
    localStorage.setItem(SIGNED_IN_KEY, 'true');
    runLoadUser()
      .expectOne('/api/auth/me')
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    expect(localStorage.getItem(SIGNED_IN_KEY)).toBeNull();
  });
});
