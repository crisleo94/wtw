import { Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe } from '@jsverse/transloco';
import { THUMBNAIL_URL } from '../../constants';
import { MONETIZATIONS, WatchProvider, WatchProviders } from '../../interfaces/streaming.interface';
import { StreamingSettingsService } from '../../services/streaming-settings.service';
import { PreferencesStore } from '../../stores/preferences.store';
import { WatchCatalogStore } from '../../stores/watch-catalog.store';
import { posterUrl } from '../../utils/image-url';

let nextId = 0;

// "Where to watch" in one country, grouped by offer type, with the JustWatch credit.
@Component({
  selector: 'app-where-to-watch',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, TranslocoPipe],
  templateUrl: './where-to-watch.component.html',
  styleUrl: './where-to-watch.component.sass',
})
export class WhereToWatchComponent {
  private preferences = inject(PreferencesStore);
  private catalog = inject(WatchCatalogStore);
  private streamingSettings = inject(StreamingSettingsService);

  // Without data but with a country (e.g. generated before choosing it) nothing shows.
  providers = input<WatchProviders | null | undefined>(null);
  readonly uid = `where-to-watch-${nextId++}`;

  // The data's own country: it may differ from the one chosen afterwards.
  region = computed(() => this.providers()?.region ?? this.preferences.region());
  country = computed(() => this.catalog.regionName(this.region()) ?? this.region() ?? '');

  // The user's platforms go first in each group.
  groups = computed(() => {
    const data = this.providers();
    if (!data) {
      return [];
    }
    const mine = new Set(this.preferences.providerIds());
    return MONETIZATIONS.map((type) => ({
      type,
      items: [...(data[type] ?? [])]
        .map((provider) => ({ ...provider, mine: mine.has(provider.id) }))
        .sort((a, b) => Number(b.mine) - Number(a.mine)),
    })).filter((group) => group.items.length);
  });

  logo(provider: WatchProvider): string {
    return posterUrl(provider.logoPath, THUMBNAIL_URL);
  }

  openSettings(): void {
    this.streamingSettings.open().subscribe();
  }
}
