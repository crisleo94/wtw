import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, Observable, of, throwError } from 'rxjs';
import { API_URL } from '../constants';
import { MovieFilters } from '../interfaces/movie-filters.interface';
import { Movie } from '../interfaces/movie.interface';
import { StreamingQuery } from '../interfaces/streaming.interface';

// The chosen platforms have no movie with these filters (API 404 `no_providers_match`).
export class NoProvidersMatchError extends Error {
  override name = 'NoProvidersMatchError';
}

@Injectable({
  providedIn: 'root',
})
export class MoviesService {
  private http = inject(HttpClient);

  // Emits null when no movie matches the filters (API 404).
  generateMovie(filters: MovieFilters, streaming: StreamingQuery = {}): Observable<Movie | null> {
    return this.http
      .get<Movie>(`${API_URL}/movies/generate`, {
        params: this.buildParams({ ...filters, ...streaming }),
      })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status !== 404) {
            return throwError(() => error);
          }
          return error.error?.reason === 'no_providers_match'
            ? throwError(() => new NoProvidersMatchError())
            : of(null);
        })
      );
  }

  // Same movie in the active language (used after switching languages).
  getMovie(tmdbId: number): Observable<Movie> {
    return this.http.get<Movie>(`${API_URL}/movies/${tmdbId}`);
  }

  private buildParams(filters: MovieFilters & StreamingQuery): HttpParams {
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
