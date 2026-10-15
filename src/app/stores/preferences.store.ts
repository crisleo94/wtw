import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { API_URL } from '../constants';
import {
  MAX_PROVIDERS,
  Monetization,
  StreamingPreferences,
  StreamingQuery,
} from '../interfaces/streaming.interface';
import { injectLocalStorage, onStorageChange } from '../utils/browser-storage';
import { AuthStore } from './auth.store';
import { WatchCatalogStore } from './watch-catalog.store';

export const PREFERENCES_KEY = 'wtw.preferences.v1';
export const ONLY_MINE_KEY = 'wtw.onlyMyPlatforms.v1';

const defaultPreferences = (): StreamingPreferences => ({
  region: null,
  providerIds: [],
  includeRentBuy: false,
});

// Country and platforms: the API when logged in, localStorage otherwise.
@Injectable({
  providedIn: 'root',
})
export class PreferencesStore {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);
  private catalog = inject(WatchCatalogStore);
  private local = injectLocalStorage();
  private localPrefs = signal<StreamingPreferences | null>(this.readLocal());
  private remotePrefs = signal<StreamingPreferences | null>(null);
  private onlyMineChoice = signal(this.local.get(ONLY_MINE_KEY) === 'true');

  private saved = computed(
    () =>
      (this.authStore.isLoggedIn() ? this.remotePrefs() : this.localPrefs()) ??
      defaultPreferences()
  );

  // `es-EC` -> `EC`; used until a country is saved, if the catalog has it.
  readonly browserRegion = regionFromLocale(globalThis.navigator?.language);

  readonly region = computed(() => {
    const saved = this.saved().region;
    if (saved) {
      return saved;
    }
    return this.catalog.hasRegion(this.browserRegion) ? this.browserRegion : null;
  });
  // Platform ids change per country, so they only count with a saved country.
  readonly providerIds = computed(() => (this.saved().region ? this.saved().providerIds : []));
  readonly includeRentBuy = computed(() => this.saved().includeRentBuy);
  readonly hasProviders = computed(() => !!this.region() && this.providerIds().length > 0);
  readonly regionName = computed(() => this.catalog.regionName(this.region()));
  // "Only my platforms" in the generator; remembered, but off without platforms.
  readonly onlyMine = computed(() => this.onlyMineChoice() && this.hasProviders());

  // Params for GET /api/movies/generate: always the country, platforms only when filtering.
  readonly generateQuery = computed<StreamingQuery>(() => {
    const region = this.region();
    if (!region) {
      return {};
    }
    if (!this.onlyMine()) {
      return { region };
    }
    const monetization: Monetization[] = ['flatrate', 'free', 'ads'];
    return {
      region,
      providers: this.providerIds(),
      monetization: this.includeRentBuy() ? [...monetization, 'rent', 'buy'] : monetization,
    };
  });

  constructor() {
    effect(() => {
      if (!this.authStore.user()) {
        untracked(() => this.remotePrefs.set(null));
      }
    });
    onStorageChange(PREFERENCES_KEY, () => this.localPrefs.set(this.readLocal()));
  }

  setOnlyMine(value: boolean): void {
    this.onlyMineChoice.set(value);
    this.local.set(ONLY_MINE_KEY, String(value));
  }

  // Called once the guest data was imported, so the API already has it.
  loadRemote(): void {
    const user = this.authStore.user();
    this.http
      .get<StreamingPreferences>(`${API_URL}/me/preferences`)
      .pipe(catchError(() => of(null)))
      .subscribe((prefs) => {
        if (user && this.authStore.user() === user) {
          this.remotePrefs.set(sanitize(prefs) ?? defaultPreferences());
        }
      });
  }

  save(prefs: StreamingPreferences): Observable<void> {
    const body = sanitize(prefs) ?? defaultPreferences();
    if (!this.authStore.isLoggedIn()) {
      this.localPrefs.set(body);
      this.local.set(PREFERENCES_KEY, JSON.stringify(body));
      return of(undefined);
    }
    return this.http.put<StreamingPreferences>(`${API_URL}/me/preferences`, body).pipe(
      tap((saved) => this.remotePrefs.set(sanitize(saved) ?? body)),
      map(() => undefined)
    );
  }

  // What a guest saved, for POST /api/me/import; null when nothing was saved.
  guestImport(): StreamingPreferences | null {
    return this.localPrefs();
  }

  clearGuest(): void {
    this.localPrefs.set(null);
    this.local.remove(PREFERENCES_KEY);
  }

  private readLocal(): StreamingPreferences | null {
    try {
      return sanitize(JSON.parse(this.local.get(PREFERENCES_KEY) ?? 'null'));
    } catch {
      return null;
    }
  }
}

export function regionFromLocale(locale: string | null | undefined): string | null {
  const region = locale?.split(/[-_]/).slice(1).find((part) => /^[a-z]{2}$/i.test(part));
  return region ? region.toUpperCase() : null;
}

// Drops anything that the API would reject, so stored data can't break requests.
function sanitize(value: unknown): StreamingPreferences | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const prefs = value as Partial<StreamingPreferences>;
  const region = typeof prefs.region === 'string' && /^[A-Z]{2}$/.test(prefs.region) ? prefs.region : null;
  const ids = Array.isArray(prefs.providerIds)
    ? prefs.providerIds.filter((id) => Number.isInteger(id) && id > 0)
    : [];
  return {
    region,
    providerIds: region ? [...new Set(ids)].slice(0, MAX_PROVIDERS) : [],
    includeRentBuy: prefs.includeRentBuy === true,
  };
}
