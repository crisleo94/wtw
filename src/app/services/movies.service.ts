import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { API_URL, TOKEN } from '../constants';
import { MovieResponse } from '../interfaces/movie-response.interface';
import { Movie } from '../interfaces/movie.interface';

@Injectable({
  providedIn: 'root',
})
export class MoviesService {
  private http = inject(HttpClient);
  private recentMovies = signal<Movie[]>([]);
  private favoriteMovies = signal<Movie[]>([]);
  private totalPages = 0;
  private randomPage = 0;

  readonly currentRecentMovies = this.recentMovies.asReadonly();
  readonly currentFavoriteMovies = this.favoriteMovies.asReadonly();

  private getInitialRequest(
    year?: number,
    genre?: number,
    rating?: number
  ): Observable<MovieResponse> {
    return this.http.get<MovieResponse>(
      `${API_URL}/discover/movie?with_genres=${genre}&primary_release_year=${year}&vote_average.gte=${rating}&region=US&language=en`,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/json',
        },
      }
    );
  }

  getFilteredMovie(
    year?: number,
    genre?: number,
    rating?: number
  ): Observable<MovieResponse> {
    return this.getInitialRequest(year, genre, rating).pipe(
      map((initialResponse) => {
        this.totalPages = initialResponse.total_pages;
        this.randomPage = Math.floor(Math.random() * this.totalPages) + 1;
        return initialResponse;
      }),
      switchMap(() =>
        this.http.get<MovieResponse>(
          `${API_URL}/discover/movie?with_genres=${genre}&primary_release_year=${year}&vote_average.gte=${rating}&region=US&language=en&page=${this.randomPage}`,
          {
            headers: {
              Authorization: `Bearer ${TOKEN}`,
              Accept: 'application/json',
            },
          }
        )
      )
    );
  }

  addRecentMovie(movie: Movie): void {
    this.recentMovies.update((movies) => [...movies, movie]);
  }

  addFavoriteMovie(movie: Movie): void {
    this.favoriteMovies.update((movies) => [...movies, movie]);
  }
}
