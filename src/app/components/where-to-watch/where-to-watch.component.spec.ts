import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';
import { WatchProviders } from '../../interfaces/streaming.interface';
import { StreamingSettingsService } from '../../services/streaming-settings.service';
import { PREFERENCES_KEY, PreferencesStore } from '../../stores/preferences.store';
import { WatchCatalogStore } from '../../stores/watch-catalog.store';
import { clearAnonymousStorage } from '../../testing/guest-storage-testing';
import {
  clearLanguagePreference,
  getTranslocoTestingModule,
  overflowingElements,
} from '../../testing/transloco-testing';
import { WhereToWatchComponent } from './where-to-watch.component';

const provider = (id: number, name: string) => ({ id, name, logoPath: `/${id}.jpg` });
const data: WatchProviders = {
  region: 'EC',
  link: 'https://www.themoviedb.org/movie/550-fight-club/watch?locale=EC',
  flatrate: [provider(8, 'Netflix'), provider(119, 'Amazon Prime Video'), provider(337, 'Disney Plus')],
  free: [],
  ads: [provider(300, 'Pluto TV')],
  rent: [provider(3, 'Google Play Movies')],
  buy: [],
};

describe('WhereToWatchComponent', () => {
  let fixture: ComponentFixture<WhereToWatchComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    localStorage.setItem('wtw.lang', 'en');
    clearAnonymousStorage();
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ region: 'EC', providerIds: [337], includeRentBuy: false }));
    await TestBed.configureTestingModule({
      imports: [WhereToWatchComponent, getTranslocoTestingModule()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    spyOn(TestBed.inject(WatchCatalogStore), 'regionName').and.callFake((code) => (code === 'EC' ? 'Ecuador' : null));
    fixture = TestBed.createComponent(WhereToWatchComponent);
    element = fixture.nativeElement;
  });

  afterEach(() => {
    localStorage.removeItem(PREFERENCES_KEY);
    clearLanguagePreference();
  });

  async function render(value: WatchProviders | null | undefined): Promise<void> {
    fixture.componentRef.setInput('providers', value);
    await fixture.whenStable();
  }

  it('should group the platforms, put the user ones first and link to TMDB', async () => {
    await render(data);
    expect(element.querySelector('h3')!.textContent).toBe('Where to watch in Ecuador');
    const groups = Array.from(element.querySelectorAll('.group')).map((group) => ({
      label: group.querySelector('.group-label')!.textContent!.trim(),
      names: Array.from(group.querySelectorAll('.name')).map((name) => name.textContent),
    }));
    expect(groups).toEqual([
      { label: 'Subscription', names: ['Disney Plus', 'Netflix', 'Amazon Prime Video'] },
      { label: 'With ads', names: ['Pluto TV'] },
      { label: 'Rent', names: ['Google Play Movies'] },
    ]);
    const mine = element.querySelector('.chip.mine')!;
    expect(mine.textContent).toContain('(Your platform)');
    expect(element.querySelector<HTMLImageElement>('.chip img')!.src).toBe('https://image.tmdb.org/t/p/w92/337.jpg');

    const seeAll = element.querySelector<HTMLAnchorElement>('.see-all')!;
    expect(seeAll.href).toBe(data.link!);
    expect(seeAll.target).toBe('_blank');
    expect(seeAll.rel).toBe('noopener');
    expect(element.querySelector('.attribution')!.textContent).toContain('Streaming data:');
    expect(element.querySelector<HTMLAnchorElement>('.attribution a')!.textContent).toBe('JustWatch');
  });

  it('should say when the movie is not on streaming in the country', async () => {
    await render({ ...data, flatrate: [], ads: [], rent: [], link: null });
    expect(element.querySelector('.empty')!.textContent).toContain('Not available for streaming in Ecuador.');
    expect(element.querySelector('.see-all')).toBeNull();
    expect(element.querySelector('.attribution')).toBeTruthy();
  });

  it('should ask for a country when there is none', async () => {
    TestBed.inject(PreferencesStore).save({ region: null, providerIds: [], includeRentBuy: false }).subscribe();
    spyOnProperty(navigator, 'language').and.returnValue('fr-FR');
    const open = spyOn(TestBed.inject(StreamingSettingsService), 'open').and.returnValue(EMPTY);
    await render(undefined);
    expect(element.querySelector('.empty')!.textContent).toContain('Choose your country to see where to watch it.');
    element.querySelector<HTMLButtonElement>('button')!.click();
    expect(open).toHaveBeenCalled();
  });

  it('should show nothing without data when a country is set', async () => {
    await render(undefined);
    expect(element.querySelector('section')).toBeNull();
  });

  it('should wrap the chips on a 320px screen', async () => {
    element.style.display = 'block';
    element.style.width = '288px';
    await render({ ...data, flatrate: [...data.flatrate, provider(1, 'A very long platform name with ads and more')] });
    expect(overflowingElements(element)).toEqual([]);
    expect(element.scrollWidth).toBeLessThanOrEqual(288);
  });
});
