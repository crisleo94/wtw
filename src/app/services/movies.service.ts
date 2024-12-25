import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, switchMap } from 'rxjs';
import { API_URL, TOKEN } from '../constants';
import { MovieResponse } from '../interfaces/movie-response.interface';
import { Movie } from '../interfaces/movie.interface';

@Injectable({
  providedIn: 'root',
})
export class MoviesService {
  private recentMovies = new BehaviorSubject<Movie[]>([]);
  private favoriteMovies = new BehaviorSubject<Movie[]>([]);
  private totalPages = 0;
  private randomPage = 0;

  currentRecentMovies = this.recentMovies.asObservable();
  currentFavoriteMovies = this.favoriteMovies.asObservable();

  constructor(private http: HttpClient) {}

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

  updateRecentMovies(recentMovies: Movie[]): void {
    this.recentMovies.next(recentMovies);
  }

  updateFavoriteMovies(favoriteMovies: Movie[]): void {
    this.favoriteMovies.next(favoriteMovies);
  }
}
