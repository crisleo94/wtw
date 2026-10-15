import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, shareReplay } from 'rxjs';
import { API_URL } from '../constants';
import { Region, WatchProvider } from '../interfaces/streaming.interface';
import { LanguageStore } from './language.store';

// Countries with streaming data and their platforms, cached per language.
@Injectable({
  providedIn: 'root',
})
export class WatchCatalogStore {
  private http = inject(HttpClient);
  private languageStore = inject(LanguageStore);
  private regionList = signal<Region[]>([]);
  private loadedLang: string | null = null;
  private providers = new Map<string, Observable<WatchProvider[]>>();

  readonly regions = this.regionList.asReadonly();
  readonly loaded = computed(() => this.regionList().length > 0);

  constructor() {
    this.languageStore.changed$.subscribe(() => {
      if (this.loadedLang) {
        this.loadRegions();
      }
    });
  }

  // Safe to call often: only asks the API once per language.
  loadRegions(): void {
    const lang = this.languageStore.lang();
    if (this.loadedLang === lang) {
      return;
    }
    this.loadedLang = lang;
    this.http
      .get<Region[]>(`${API_URL}/regions`)
      .pipe(catchError(() => of(null)))
      .subscribe((regions) => {
        if (regions) {
          this.regionList.set(regions);
        } else if (this.loadedLang === lang) {
          // Lets a later call retry after a failure.
          this.loadedLang = null;
        }
      });
  }

  hasRegion(code: string | null | undefined): boolean {
    return !!code && this.regionList().some((region) => region.code === code);
  }

  regionName(code: string | null | undefined): string | null {
    return this.regionList().find((region) => region.code === code)?.name ?? null;
  }

  // Failed requests are not cached, so reopening the dialog retries.
  loadProviders(code: string): Observable<WatchProvider[]> {
    const key = `${this.languageStore.lang()}:${code}`;
    let request = this.providers.get(key);
    if (!request) {
      request = this.http
        .get<WatchProvider[]>(`${API_URL}/regions/${encodeURIComponent(code)}/providers`)
        .pipe(
          catchError((error) => {
            this.providers.delete(key);
            throw error;
          }),
          shareReplay(1)
        );
      this.providers.set(key, request);
    }
    return request;
  }
}
