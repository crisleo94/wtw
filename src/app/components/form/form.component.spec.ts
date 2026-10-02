import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
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
});
