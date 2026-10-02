import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from './auth.store';

describe('AuthStore', () => {
  let store: AuthStore;
  let httpTesting: HttpTestingController;
  const user = { id: 'u1', email: 'a@b.co', fullName: 'Ana' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(AuthStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => sessionStorage.removeItem('wtw.guest.v1'));

  it('should hydrate the user from /api/auth/me', () => {
    store.load().subscribe();
    httpTesting.expectOne('/api/auth/me').flush({ user });
    expect(store.user()).toEqual(user);
    expect(store.isLoggedIn()).toBeTrue();
  });

  it('should stay anonymous when /api/auth/me fails', () => {
    store.load().subscribe();
    httpTesting
      .expectOne('/api/auth/me')
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    expect(store.user()).toBeNull();
  });

  it('should log in, leave guest mode and log out', () => {
    store.continueAsGuest();
    store.login({ email: user.email, password: '12345678' }).subscribe();
    const req = httpTesting.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({ user });
    expect(store.user()).toEqual(user);
    expect(store.isGuest()).toBeFalse();

    store.logout().subscribe();
    httpTesting.expectOne('/api/auth/logout').flush(null);
    expect(store.user()).toBeNull();
  });

  it('should remember the guest choice for the tab', () => {
    store.continueAsGuest();
    expect(sessionStorage.getItem('wtw.guest.v1')).toBe('true');
  });
});
