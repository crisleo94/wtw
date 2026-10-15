import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { EMPTY } from 'rxjs';
import { StreamingSettingsService } from '../../services/streaming-settings.service';
import { ONLY_MINE_KEY, PREFERENCES_KEY, PreferencesStore } from '../../stores/preferences.store';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormComponent } from './form.component';
import { getTranslocoTestingModule } from '../../testing/transloco-testing';

describe('FormComponent', () => {
  let component: FormComponent;
  let fixture: ComponentFixture<FormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormComponent, getTranslocoTestingModule()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with the default filters', () => {
    expect(component.dataForm.getRawValue()).toEqual({
      yearFrom: 1990,
      yearTo: new Date().getFullYear(),
      genres: [],
      genreMode: 'all',
      ratingMin: 6,
      ratingMax: 10,
      votesMin: 5000,
      votesMax: null,
    });
    expect(component.dataForm.valid).toBeTrue();
  });

  it('should flag crossed year and vote ranges', () => {
    component.dataForm.patchValue({ yearFrom: 2010, yearTo: 2000 });
    expect(component.dataForm.errors?.['yearRange']).toBeTrue();
    component.dataForm.patchValue({ yearTo: 2010, votesMin: 100, votesMax: 50 });
    expect(component.dataForm.errors).toEqual({ votesRange: true });
  });

  it('should map the form to the API filters', () => {
    component.dataForm.patchValue({ genres: [28, 12], genreMode: 'any' });
    expect(component.buildFilters()).toEqual({
      yearFrom: 1990,
      yearTo: new Date().getFullYear(),
      genres: [28, 12],
      genreMode: 'any',
      ratingMin: 6,
      ratingMax: 10,
      votesMin: 5000,
      votesMax: undefined,
    });
  });

  it('should restore the defaults on reset', () => {
    component.dataForm.patchValue({ yearFrom: 2000, votesMin: 10 });
    component.reset();
    expect(component.dataForm.controls.yearFrom.value).toBe(1990);
    expect(component.dataForm.controls.votesMin.value).toBe(5000);
  });

  it('should re-create the rating slider when its width changes and keep the values', async () => {
    const host = fixture.nativeElement as HTMLElement;
    host.style.display = 'block';
    host.style.width = '300px';
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const before = component.sliderKey();
    const slider = host.querySelector('mat-slider');

    host.style.width = '600px';
    await new Promise((resolve) => setTimeout(resolve, 300));
    await fixture.whenStable();

    expect(component.sliderKey()).toBeGreaterThan(before);
    expect(host.querySelector('mat-slider')).not.toBe(slider);
    expect(component.dataForm.controls.ratingMin.value).toBe(6);
    expect(component.dataForm.controls.ratingMax.value).toBe(10);
  });

  describe('only my platforms', () => {
    afterEach(() => {
      localStorage.removeItem(PREFERENCES_KEY);
      localStorage.removeItem(ONLY_MINE_KEY);
    });

    const host = () => fixture.nativeElement as HTMLElement;

    it('should offer to choose platforms when there are none', async () => {
      const open = spyOn(TestBed.inject(StreamingSettingsService), 'open').and.returnValue(EMPTY);
      await fixture.whenStable();
      expect(host().querySelector('mat-slide-toggle')).toBeNull();
      const link = host().querySelector<HTMLButtonElement>('.choose-platforms')!;
      expect(link.textContent).toContain('Choose your platforms');
      link.click();
      expect(open).toHaveBeenCalled();
    });

    it('should filter by the saved platforms and remember the toggle', async () => {
      const preferences = TestBed.inject(PreferencesStore);
      preferences.save({ region: 'EC', providerIds: [8], includeRentBuy: false }).subscribe();
      await fixture.whenStable();
      const toggle = host().querySelector<HTMLButtonElement>('.only-mine button[role="switch"]')!;
      expect(host().querySelector('.only-mine')!.textContent).toContain('Only my platforms');
      expect(toggle.getAttribute('aria-checked')).toBe('false');
      toggle.click();
      await fixture.whenStable();
      expect(localStorage.getItem(ONLY_MINE_KEY)).toBe('true');

      const httpTesting = TestBed.inject(HttpTestingController);
      component.generateMovies();
      const req = httpTesting.expectOne((request) => request.url === '/api/movies/generate');
      expect(req.request.params.get('region')).toBe('EC');
      expect(req.request.params.get('providers')).toBe('8');
      expect(req.request.params.get('monetization')).toBe('flatrate,free,ads');
    });

    it('should explain when the platforms have no match', () => {
      const messages: string[] = [];
      component.errorEvent.subscribe((key) => messages.push(key));
      component.generateMovies();
      TestBed.inject(HttpTestingController)
        .expectOne((request) => request.url === '/api/movies/generate')
        .flush({ reason: 'no_providers_match' }, { status: 404, statusText: 'Not Found' });
      component.generateMovies();
      TestBed.inject(HttpTestingController)
        .expectOne((request) => request.url === '/api/movies/generate')
        .flush(null, { status: 500, statusText: 'Error' });
      expect(messages).toEqual(['errors.noProvidersMatch', 'errors.fetchError']);
    });
  });
});
