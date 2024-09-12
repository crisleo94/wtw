import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL, TOKEN } from '../constants';
import { Genre } from '../interfaces/genre.interface';

@Injectable({
  providedIn: 'root',
})
export class GenresService {
  constructor(private http: HttpClient) {}

  getGenres(): Observable<Genre[]> {
    return this.http
      .get<{ genres: Genre[] }>(`${API_URL}/genre/movie/list?language=en-US`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/json',
        },
      })
      .pipe(map((response) => response.genres));
  }
}
