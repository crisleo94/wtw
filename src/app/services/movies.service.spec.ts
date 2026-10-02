import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Movie } from '../interfaces/movie.interface';
import { MoviesService } from './movies.service';

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

  it('should add recent and favorite movies', () => {
    const movie = { id: 1, title: 'Alien' } as Movie;
    service.addRecentMovie(movie);
    service.addFavoriteMovie(movie);
    expect(service.currentRecentMovies()).toEqual([movie]);
    expect(service.currentFavoriteMovies()).toEqual([movie]);
  });
});
