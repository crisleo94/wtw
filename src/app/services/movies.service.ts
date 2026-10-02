import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, Observable, of, throwError } from 'rxjs';
import { API_URL } from '../constants';
import { MovieFilters } from '../interfaces/movie-filters.interface';
import { Movie } from '../interfaces/movie.interface';

@Injectable({
  providedIn: 'root',
})
export class MoviesService {
  private http = inject(HttpClient);
  private recentMovies = signal<Movie[]>([]);
  private favoriteMovies = signal<Movie[]>([]);

  readonly currentRecentMovies = this.recentMovies.asReadonly();
  readonly currentFavoriteMovies = this.favoriteMovies.asReadonly();

  // Emits null when no movie matches the filters (API 404).
  generateMovie(filters: MovieFilters): Observable<Movie | null> {
    return this.http
      .get<Movie>(`${API_URL}/movies/generate`, {
        params: this.buildParams(filters),
      })
      .pipe(
        catchError((error: HttpErrorResponse) =>
          error.status === 404 ? of(null) : throwError(() => error)
        )
      );
  }

  addRecentMovie(movie: Movie): void {
    this.recentMovies.update((movies) => [...movies, movie]);
  }

  addFavoriteMovie(movie: Movie): void {
    this.favoriteMovies.update((movies) => [...movies, movie]);
  }

  private buildParams(filters: MovieFilters): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      if (Array.isArray(value)) {
        if (value.length) {
          params = params.set(key, value.join(','));
        }
        continue;
      }
      params = params.set(key, String(value));
    }
    return params;
  }
}
