import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { clearAnonymousStorage } from '../testing/guest-storage-testing';
import { clearLanguagePreference, getTranslocoTestingModule } from '../testing/transloco-testing';
import { AuthStore } from './auth.store';
import { LibraryStore } from './library.store';
import { ONLY_MINE_KEY, PREFERENCES_KEY, PreferencesStore, regionFromLocale } from './preferences.store';
import { WatchCatalogStore } from './watch-catalog.store';

const user = { id: 'u1', email: 'a@b.co', fullName: 'Ana' };

describe('PreferencesStore', () => {
  let httpTesting: HttpTestingController;
  let language: jasmine.Spy;

  function setup(locale = 'es-EC'): PreferencesStore {
    language ??= spyOnProperty(navigator, 'language');
    language.and.returnValue(locale);
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    return TestBed.inject(PreferencesStore);
  }

  function loadCatalog(): void {
    TestBed.inject(WatchCatalogStore).loadRegions();
    httpTesting.expectOne('/api/regions').flush([
      { code: 'EC', name: 'Ecuador' },
      { code: 'US', name: 'United States' },
    ]);
  }

  function login(): void {
    TestBed.inject(LibraryStore);
    TestBed.inject(AuthStore).login({ email: user.email, password: '12345678' }).subscribe();
    httpTesting.expectOne('/api/auth/login').flush({ user });
    TestBed.tick();
  }

  beforeEach(() => {
    language = undefined!;
    clearAnonymousStorage();
    localStorage.removeItem(PREFERENCES_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(PREFERENCES_KEY);
    localStorage.removeItem(ONLY_MINE_KEY);
    clearAnonymousStorage();
    clearLanguagePreference();
  });

  it('should read the region of a locale', () => {
    expect(regionFromLocale('es-EC')).toBe('EC');
    expect(regionFromLocale('zh-Hant-TW')).toBe('TW');
    expect(regionFromLocale('es')).toBeNull();
    expect(regionFromLocale(undefined)).toBeNull();
  });

  it('should default to the browser country only when the catalog has it', () => {
    let store = setup('es-EC');
    expect(store.region()).toBeNull();
    loadCatalog();
    expect(store.region()).toBe('EC');
    expect(store.regionName()).toBe('Ecuador');
    expect(store.hasProviders()).toBeFalse();

    TestBed.resetTestingModule();
    store = setup('fr-FR');
    loadCatalog();
    expect(store.region()).toBeNull();
  });

  it('should keep a guest choice in localStorage', () => {
    const store = setup();
    store.save({ region: 'US', providerIds: [9, 9, 8, -1], includeRentBuy: true }).subscribe();
    httpTesting.expectNone('/api/me/preferences');
    expect(store.region()).toBe('US');
    expect(store.providerIds()).toEqual([9, 8]);
    expect(store.includeRentBuy()).toBeTrue();
    expect(store.hasProviders()).toBeTrue();
    expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY)!)).toEqual({
      region: 'US',
      providerIds: [9, 8],
      includeRentBuy: true,
    });
  });

  it('should ignore broken stored data', () => {
    localStorage.setItem(PREFERENCES_KEY, '{"region":"ecuador","providerIds":"8"}');
    const store = setup('fr-FR');
    expect(store.region()).toBeNull();
    expect(store.providerIds()).toEqual([]);
    expect(store.guestImport()).toEqual({ region: null, providerIds: [], includeRentBuy: false });
  });

  it('should import the guest choice on login and then use the API', () => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ region: 'EC', providerIds: [8], includeRentBuy: false }));
    const store = setup();
    login();

    const importReq = httpTesting.expectOne('/api/me/import');
    expect(importReq.request.body.preferences).toEqual({ region: 'EC', providerIds: [8], includeRentBuy: false });
    importReq.flush({ history: 0, watched: 0, lists: 0, items: 0 });
    expect(localStorage.getItem(PREFERENCES_KEY)).toBeNull();

    httpTesting.expectOne('/api/me/preferences').flush({ region: 'EC', providerIds: [8, 337], includeRentBuy: true });
    expect(store.providerIds()).toEqual([8, 337]);
    expect(store.includeRentBuy()).toBeTrue();

    store.save({ region: 'EC', providerIds: [119], includeRentBuy: false }).subscribe();
    const put = httpTesting.expectOne('/api/me/preferences');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ region: 'EC', providerIds: [119], includeRentBuy: false });
    put.flush({ region: 'EC', providerIds: [119], includeRentBuy: false });
    expect(store.providerIds()).toEqual([119]);
    expect(localStorage.getItem(PREFERENCES_KEY)).toBeNull();
  });

  it('should skip the import without guest data and fall back to defaults if the API fails', () => {
    const store = setup('fr-FR');
    login();
    httpTesting.expectNone('/api/me/import');
    httpTesting.expectOne('/api/me/preferences').flush(null, { status: 500, statusText: 'Error' });
    expect(store.region()).toBeNull();
    expect(store.providerIds()).toEqual([]);
  });

  it('should go back to the local choice after logout', () => {
    const store = setup('fr-FR');
    login();
    httpTesting.expectOne('/api/me/preferences').flush({ region: 'EC', providerIds: [8], includeRentBuy: false });
    expect(store.region()).toBe('EC');

    TestBed.inject(AuthStore).clearUser();
    TestBed.tick();
    expect(store.region()).toBeNull();
    expect(store.providerIds()).toEqual([]);
  });

  it('should build the generate params and remember "only my platforms"', () => {
    const store = setup('fr-FR');
    expect(store.generateQuery()).toEqual({});
    store.setOnlyMine(true);
    expect(store.onlyMine()).toBeFalse();

    store.save({ region: 'EC', providerIds: [8, 337], includeRentBuy: false }).subscribe();
    expect(store.onlyMine()).toBeTrue();
    expect(store.generateQuery()).toEqual({ region: 'EC', providers: [8, 337], monetization: ['flatrate', 'free', 'ads'] });

    store.save({ region: 'EC', providerIds: [8], includeRentBuy: true }).subscribe();
    expect(store.generateQuery().monetization).toEqual(['flatrate', 'free', 'ads', 'rent', 'buy']);

    store.setOnlyMine(false);
    expect(store.generateQuery()).toEqual({ region: 'EC' });
    expect(localStorage.getItem(ONLY_MINE_KEY)).toBe('false');
  });
});
