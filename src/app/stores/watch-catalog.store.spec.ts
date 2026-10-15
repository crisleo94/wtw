import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { languageInterceptor } from '../interceptors/language.interceptor';
import { clearLanguagePreference, getTranslocoTestingModule } from '../testing/transloco-testing';
import { LanguageStore } from './language.store';
import { WatchCatalogStore } from './watch-catalog.store';

describe('WatchCatalogStore', () => {
  let catalog: WatchCatalogStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem('wtw.lang', 'en');
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        provideHttpClient(withInterceptors([languageInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    catalog = TestBed.inject(WatchCatalogStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    clearLanguagePreference();
  });

  it('should load the countries once per language and again after switching', () => {
    catalog.loadRegions();
    catalog.loadRegions();
    const first = httpTesting.expectOne('/api/regions');
    expect(first.request.headers.get('Accept-Language')).toBe('en');
    first.flush([{ code: 'EC', name: 'Ecuador' }, { code: 'ES', name: 'Spain' }]);
    expect(catalog.hasRegion('EC')).toBeTrue();
    expect(catalog.hasRegion('XX')).toBeFalse();
    expect(catalog.regionName('ES')).toBe('Spain');

    TestBed.inject(LanguageStore).setLang('es');
    const second = httpTesting.expectOne('/api/regions');
    expect(second.request.headers.get('Accept-Language')).toBe('es');
    second.flush([{ code: 'ES', name: 'España' }]);
    expect(catalog.regionName('ES')).toBe('España');
  });

  it('should retry the countries after a failure', () => {
    catalog.loadRegions();
    httpTesting.expectOne('/api/regions').flush(null, { status: 502, statusText: 'Bad Gateway' });
    expect(catalog.loaded()).toBeFalse();
    catalog.loadRegions();
    httpTesting.expectOne('/api/regions').flush([{ code: 'EC', name: 'Ecuador' }]);
    expect(catalog.loaded()).toBeTrue();
  });

  it('should cache the platforms per country and not cache failures', () => {
    const results: number[][] = [];
    catalog.loadProviders('EC').subscribe((list) => results.push(list.map((p) => p.id)));
    catalog.loadProviders('EC').subscribe((list) => results.push(list.map((p) => p.id)));
    httpTesting.expectOne('/api/regions/EC/providers').flush([{ id: 8, name: 'Netflix', logoPath: '/n.jpg', priority: 1 }]);
    catalog.loadProviders('EC').subscribe((list) => results.push(list.map((p) => p.id)));
    expect(results).toEqual([[8], [8], [8]]);

    catalog.loadProviders('CO').subscribe({ error: () => results.push([]) });
    httpTesting.expectOne('/api/regions/CO/providers').flush(null, { status: 502, statusText: 'Bad Gateway' });
    catalog.loadProviders('CO').subscribe();
    httpTesting.expectOne('/api/regions/CO/providers').flush([]);
  });
});
