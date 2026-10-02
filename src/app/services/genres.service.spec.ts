import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LanguageStore } from '../stores/language.store';
import { clearLanguagePreference, getTranslocoTestingModule } from '../testing/transloco-testing';
import { GenresService } from './genres.service';

describe('GenresService', () => {
  let service: GenresService;

  afterEach(() => clearLanguagePreference());

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GenresService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should reload the genres when the language changes', () => {
    const httpTesting = TestBed.inject(HttpTestingController);
    service.getGenres().subscribe();
    httpTesting.expectOne('/api/genres').flush([{ id: 18, name: 'Drama' }]);

    TestBed.inject(LanguageStore).setLang('es');
    httpTesting.expectOne('/api/genres').flush([{ id: 35, name: 'Comedia' }]);
    expect(service.getGenre(35)?.name).toBe('Comedia');

    TestBed.inject(LanguageStore).setLang('en');
    httpTesting.expectOne('/api/genres').flush({}, { status: 500, statusText: 'Error' });
    expect(service.getGenre(35)?.name).toBe('Comedia');
  });
});
