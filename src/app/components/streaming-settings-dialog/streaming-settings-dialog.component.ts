import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';
import { THUMBNAIL_URL } from '../../constants';
import { MAX_PROVIDERS, Region, WatchProvider } from '../../interfaces/streaming.interface';
import { PreferencesStore } from '../../stores/preferences.store';
import { WatchCatalogStore } from '../../stores/watch-catalog.store';
import { apiErrorMessage } from '../../utils/api-error';
import { posterUrl } from '../../utils/image-url';

type ProvidersState =
  | { status: 'idle' | 'loading' | 'error' }
  | { status: 'ready'; list: WatchProvider[] };

// Country and platforms as a draft; nothing is stored until Save.
@Component({
  selector: 'app-streaming-settings-dialog',
  imports: [
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    TranslocoPipe,
  ],
  templateUrl: './streaming-settings-dialog.component.html',
  styleUrl: './streaming-settings-dialog.component.sass',
})
export class StreamingSettingsDialogComponent {
  private dialogRef = inject(MatDialogRef<StreamingSettingsDialogComponent>);
  private preferences = inject(PreferencesStore);
  private transloco = inject(TranslocoService);
  catalog = inject(WatchCatalogStore);

  readonly maxProviders = MAX_PROVIDERS;
  region = signal(this.preferences.region());
  selected = signal(new Set(this.preferences.providerIds()));
  includeRentBuy = signal(this.preferences.includeRentBuy());
  cleared = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  query = signal('');

  countryControl = new FormControl<Region | string | null>(null);
  private countryText = toSignal(this.countryControl.valueChanges, { initialValue: null });
  private retries = signal(0);

  filteredRegions = computed(() => {
    const text = this.countryText();
    const term = normalize(typeof text === 'string' ? text : '');
    return this.catalog.regions().filter((region) => normalize(region.name).includes(term));
  });

  providers = toSignal(
    combineLatest([toObservable(this.region), toObservable(this.retries)]).pipe(
      switchMap(([code]) =>
        code
          ? this.catalog.loadProviders(code).pipe(
              map((list): ProvidersState => ({ status: 'ready', list })),
              catchError(() => of<ProvidersState>({ status: 'error' })),
              startWith<ProvidersState>({ status: 'loading' })
            )
          : of<ProvidersState>({ status: 'idle' })
      )
    ),
    { initialValue: { status: 'idle' } as ProvidersState }
  );

  filteredProviders = computed(() => {
    const state = this.providers();
    if (state.status !== 'ready') {
      return [];
    }
    const term = normalize(this.query());
    return state.list.filter((provider) => normalize(provider.name).includes(term));
  });

  constructor() {
    this.catalog.loadRegions();
    // The saved country is shown by name once the catalog arrives.
    toObservable(this.catalog.regions).subscribe(() => this.resetCountryInput());
  }

  displayRegion = (value: Region | string | null): string =>
    typeof value === 'string' ? value : value?.name ?? '';

  selectRegion(region: Region): void {
    if (region.code === this.region()) {
      return;
    }
    if (this.selected().size) {
      this.selected.set(new Set());
      this.cleared.set(true);
    }
    this.query.set('');
    this.region.set(region.code);
  }

  // Typed text that was not picked from the list goes back to the chosen country.
  resetCountryInput(): void {
    const code = this.region();
    const region = this.catalog.regions().find((item) => item.code === code) ?? null;
    this.countryControl.setValue(region, { emitEvent: false });
  }

  toggle(provider: WatchProvider, checked: boolean): void {
    this.selected.update((ids) => {
      const next = new Set(ids);
      if (checked) {
        next.add(provider.id);
      } else {
        next.delete(provider.id);
      }
      return next;
    });
  }

  retry(): void {
    this.retries.update((count) => count + 1);
  }

  logo(provider: WatchProvider): string {
    return posterUrl(provider.logoPath, THUMBNAIL_URL);
  }

  save(): void {
    this.saving.set(true);
    this.error.set(null);
    this.preferences
      .save({
        region: this.region(),
        providerIds: [...this.selected()],
        includeRentBuy: this.includeRentBuy(),
      })
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (error) => {
          this.saving.set(false);
          this.error.set(apiErrorMessage(error, this.transloco));
        },
      });
  }
}

// Case and accent insensitive search ("peru" finds "Perú").
function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
