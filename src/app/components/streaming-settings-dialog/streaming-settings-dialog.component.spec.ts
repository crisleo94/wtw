import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { clearAnonymousStorage } from '../../testing/guest-storage-testing';
import { clearLanguagePreference, getTranslocoTestingModule } from '../../testing/transloco-testing';
import { PREFERENCES_KEY, PreferencesStore } from '../../stores/preferences.store';
import { StreamingSettingsDialogComponent } from './streaming-settings-dialog.component';

const regions = [
  { code: 'EC', name: 'Ecuador' },
  { code: 'PE', name: 'Perú' },
];
const ecProviders = [
  { id: 8, name: 'Netflix', logoPath: '/n.jpg', priority: 1 },
  { id: 119, name: 'Amazon Prime Video', logoPath: '/p.jpg', priority: 2 },
  { id: 337, name: 'Disney Plus', logoPath: null, priority: 3 },
];

describe('StreamingSettingsDialogComponent', () => {
  let fixture: ComponentFixture<StreamingSettingsDialogComponent>;
  let httpTesting: HttpTestingController;
  let close: jasmine.Spy;
  let element: HTMLElement;

  async function create(saved?: object): Promise<void> {
    if (saved) {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(saved));
    }
    close = jasmine.createSpy('close');
    await TestBed.configureTestingModule({
      imports: [StreamingSettingsDialogComponent, getTranslocoTestingModule()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StreamingSettingsDialogComponent);
    element = fixture.nativeElement;
    httpTesting.expectOne('/api/regions').flush(regions);
    await fixture.whenStable();
  }

  async function flushProviders(code: string, list: object[]): Promise<void> {
    await fixture.whenStable();
    httpTesting.expectOne(`/api/regions/${code}/providers`).flush(list);
    await fixture.whenStable();
  }

  const checkboxes = () =>
    Array.from(element.querySelectorAll<HTMLInputElement>('.provider input[type="checkbox"]'));
  const count = () => element.querySelector('.count')!.textContent!.trim();

  beforeEach(() => {
    localStorage.setItem('wtw.lang', 'en');
    clearAnonymousStorage();
    localStorage.removeItem(PREFERENCES_KEY);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.removeItem(PREFERENCES_KEY);
    clearLanguagePreference();
  });

  it('should ask for a country before listing platforms and credit JustWatch', async () => {
    spyOnProperty(navigator, 'language').and.returnValue('fr-FR');
    await create();
    expect(element.querySelector('input[matinput]')).toBeTruthy();
    expect(element.textContent).toContain('Choose your country to see its platforms.');
    const link = element.querySelector<HTMLAnchorElement>('.attribution a')!;
    expect(element.querySelector('.attribution')!.textContent).toContain('Streaming data:');
    expect(link.href).toBe('https://www.justwatch.com/');
    expect(link.rel).toBe('noopener');
  });

  it('should pick a country from the autocomplete, accent insensitive', async () => {
    spyOnProperty(navigator, 'language').and.returnValue('fr-FR');
    await create();
    const input = element.querySelector<HTMLInputElement>('.country input')!;
    input.focus();
    input.dispatchEvent(new Event('focusin'));
    input.value = 'peru';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const options = Array.from(document.querySelectorAll<HTMLElement>('mat-option'));
    expect(options.map((option) => option.textContent!.trim())).toEqual(['Perú']);
    options[0].click();
    await flushProviders('PE', [{ id: 8, name: 'Netflix', logoPath: '/n.jpg' }]);
    expect(input.value).toBe('Perú');
    expect(checkboxes().length).toBe(1);
  });

  it('should show logos with labelled checkboxes, search and count the selection', async () => {
    await create({ region: 'EC', providerIds: [8], includeRentBuy: false });
    await flushProviders('EC', ecProviders);
    expect(element.querySelector<HTMLInputElement>('.country input')!.value).toBe('Ecuador');
    expect(checkboxes().map((box) => box.getAttribute('aria-label'))).toEqual([
      'Netflix',
      'Amazon Prime Video',
      'Disney Plus',
    ]);
    expect(checkboxes()[0].checked).toBeTrue();
    expect(element.querySelector<HTMLImageElement>('.provider img')!.src).toBe('https://image.tmdb.org/t/p/w92/n.jpg');
    expect(count()).toBe('Selected: 1');

    checkboxes()[2].click();
    await fixture.whenStable();
    expect(count()).toBe('Selected: 2');

    const search = element.querySelector<HTMLInputElement>('.search input')!;
    search.value = 'prime';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(checkboxes().map((box) => box.getAttribute('aria-label'))).toEqual(['Amazon Prime Video']);
  });

  it('should clear the platforms with a notice when the country changes', async () => {
    await create({ region: 'EC', providerIds: [8, 119], includeRentBuy: false });
    await flushProviders('EC', ecProviders);
    fixture.componentInstance.selectRegion(regions[1]);
    await flushProviders('PE', []);
    expect(count()).toBe('Selected: 0');
    expect(element.querySelector('.notice')!.textContent).toContain('Your platforms were cleared');
  });

  it('should save the draft and close', async () => {
    await create({ region: 'EC', providerIds: [], includeRentBuy: false });
    await flushProviders('EC', ecProviders);
    checkboxes()[1].click();
    element.querySelector<HTMLButtonElement>('.rent-buy button')!.click();
    await fixture.whenStable();
    const save = Array.from(element.querySelectorAll<HTMLButtonElement>('mat-dialog-actions button')).at(-1)!;
    save.click();

    const store = TestBed.inject(PreferencesStore);
    expect(store.providerIds()).toEqual([119]);
    expect(store.includeRentBuy()).toBeTrue();
    expect(close).toHaveBeenCalledWith(true);
  });

  it('should retry when the platforms fail to load', async () => {
    await create({ region: 'EC', providerIds: [], includeRentBuy: false });
    await fixture.whenStable();
    httpTesting.expectOne('/api/regions/EC/providers').flush(null, { status: 502, statusText: 'Bad Gateway' });
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')!.textContent).toContain("Couldn't load the platforms.");
    element.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    await flushProviders('EC', ecProviders);
    expect(checkboxes().length).toBe(3);
  });
});
