import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';
import { API_URL } from '../constants';
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

    return this.http.get<Genre[]>(`${API_URL}/genres`).pipe(
      tap((genres) => this.genreList.set(genres)),
      catchError(() => of([]))
    );
  }

  getGenre(id: number): Genre | undefined {
    return this.genreList().find((genre) => genre.id === id);
  }
}
