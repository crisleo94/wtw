import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL, TOKEN } from '../constants';
import { MovieResponse } from '../interfaces/movie-response.interface';

@Injectable({
  providedIn: 'root',
})
export class MoviesService {
  constructor(private http: HttpClient) {}

  getFilteredMovie(
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
}
