import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthStore, SIGNED_IN_KEY } from './auth.store';
import { clearAnonymousStorage } from '../testing/guest-storage-testing';

describe('AuthStore', () => {
  let store: AuthStore;
  let httpTesting: HttpTestingController;
  const user = { id: 'u1', email: 'a@b.co', fullName: 'Ana' };

  const configure = () =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

  beforeEach(() => {
    clearAnonymousStorage();
    configure();
    store = TestBed.inject(AuthStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => clearAnonymousStorage());

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

    expect(localStorage.getItem(SIGNED_IN_KEY)).toBe('true');

    store.logout().subscribe();
    httpTesting.expectOne('/api/auth/logout').flush(null);
    expect(store.user()).toBeNull();
    expect(store.hasSession()).toBeFalse();
  });

  it('should remember a session from /auth/me and forget it on an expired one', () => {
    store.load().subscribe();
    httpTesting.expectOne('/api/auth/me').flush({ user });
    expect(store.hasSession()).toBeTrue();
    store.clearUser();
    expect(store.hasSession()).toBeFalse();
  });

  it('should remember the guest choice in localStorage', () => {
    store.continueAsGuest();
    expect(localStorage.getItem('wtw.guest.v1')).toBe('true');
    expect(Number(localStorage.getItem('wtw.guest.activeAt.v1'))).toBeGreaterThan(0);
    expect(sessionStorage.getItem('wtw.guest.v1')).toBeNull();
  });

  it('should restore guest mode in a new tab or browser session', () => {
    localStorage.setItem('wtw.guest.v1', 'true');
    localStorage.setItem('wtw.guest.activeAt.v1', String(Date.now()));
    TestBed.resetTestingModule();
    configure();
    expect(TestBed.inject(AuthStore).isGuest()).toBeTrue();
  });

  it('should drop a guest library unused for more than 30 days', () => {
    const old = Date.now() - 31 * 24 * 60 * 60 * 1000;
    localStorage.setItem('wtw.guest.v1', 'true');
    localStorage.setItem('wtw.guest.activeAt.v1', String(old));
    localStorage.setItem('wtw.session.v1', '{"history":[],"watched":[],"lists":[],"movies":{}}');
    TestBed.resetTestingModule();
    configure();
    expect(TestBed.inject(AuthStore).isGuest()).toBeFalse();
    expect(localStorage.getItem('wtw.guest.v1')).toBeNull();
    expect(localStorage.getItem('wtw.session.v1')).toBeNull();
  });

  it('should move a guest flag left in sessionStorage by older builds', () => {
    sessionStorage.setItem('wtw.guest.v1', 'true');
    TestBed.resetTestingModule();
    configure();
    expect(TestBed.inject(AuthStore).isGuest()).toBeTrue();
    expect(sessionStorage.getItem('wtw.guest.v1')).toBeNull();
    expect(localStorage.getItem('wtw.guest.v1')).toBe('true');
  });

  it('should follow guest mode changes made in another tab', () => {
    localStorage.setItem('wtw.guest.v1', 'true');
    window.dispatchEvent(new StorageEvent('storage', { key: 'wtw.guest.v1', newValue: 'true' }));
    expect(store.isGuest()).toBeTrue();
    window.dispatchEvent(new StorageEvent('storage', { key: 'wtw.guest.v1', newValue: null }));
    expect(store.isGuest()).toBeFalse();
  });
});
