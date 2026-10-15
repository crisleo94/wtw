import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Movie } from '../interfaces/movie.interface';
import { MoviesService, NoProvidersMatchError } from './movies.service';

describe('MoviesService', () => {
  let service: MoviesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MoviesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send the filters as query params', () => {
    const httpTesting = TestBed.inject(HttpTestingController);
    let result: Movie | null | undefined;
    service
      .generateMovie({ yearFrom: 1990, genres: [28, 12], votesMax: undefined })
      .subscribe((movie) => (result = movie));

    const req = httpTesting.expectOne(
      (request) => request.url === '/api/movies/generate'
    );
    expect(req.request.params.get('yearFrom')).toBe('1990');
    expect(req.request.params.get('genres')).toBe('28,12');
    expect(req.request.params.has('votesMax')).toBeFalse();
    req.flush({ reason: 'no_results' }, { status: 404, statusText: 'Not Found' });
    expect(result).toBeNull();
  });

  it('should send the country, platforms and offer types', () => {
    const httpTesting = TestBed.inject(HttpTestingController);
    let error: unknown;
    service
      .generateMovie({ yearFrom: 1990 }, { region: 'EC', providers: [8, 337], monetization: ['flatrate', 'free', 'ads'] })
      .subscribe({ error: (e) => (error = e) });

    const req = httpTesting.expectOne((request) => request.url === '/api/movies/generate');
    expect(req.request.params.get('region')).toBe('EC');
    expect(req.request.params.get('providers')).toBe('8,337');
    expect(req.request.params.get('monetization')).toBe('flatrate,free,ads');
    req.flush({ statusCode: 404, reason: 'no_providers_match' }, { status: 404, statusText: 'Not Found' });
    expect(error).toBeInstanceOf(NoProvidersMatchError);
  });
});
