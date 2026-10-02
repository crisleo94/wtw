import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { map, Observable, of, tap } from 'rxjs';
import { API_URL, TOKEN } from '../constants';
import { Genre } from '../interfaces/genre.interface';

@Injectable({
  providedIn: 'root',
})
export class GenresService {
  private http = inject(HttpClient);
  private genreList = signal<Genre[]>([]);

  readonly genres = this.genreList.asReadonly();

  getGenres(): Observable<Genre[]> {
    if (this.genreList().length > 0) {
      return of(this.genreList());
    }

    return this.http
      .get<{ genres: Genre[] }>(`${API_URL}/genre/movie/list?language=en-US`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/json',
        },
      })
      .pipe(
        map((response) => response.genres),
        tap((genres) => this.genreList.set(genres))
      );
  }

  getGenre(id: number): Genre | undefined {
    return this.genreList().find((genre) => genre.id === id);
  }
}
