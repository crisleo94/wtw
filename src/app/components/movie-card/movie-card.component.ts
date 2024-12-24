import { NgIf } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { IMAGE_URL } from '../../constants';
import { Movie } from '../../interfaces/movie.interface';
import { GenresService } from '../../services/genres.service';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    NgIf,
    MatDividerModule,
    MatChipsModule,
  ],
  templateUrl: './movie-card.component.html',
  styleUrl: './movie-card.component.sass',
})
export class MovieCardComponent implements OnInit {
  @Input() movie: Movie | null = null;
  movieGenres: string[] = [];

  constructor(private _genreService: GenresService) {}

  ngOnInit(): void {
    this.getMovieGenres();
  }

  buildImageUrl(path: string): string {
    return path ? `${IMAGE_URL}/${path}` : '';
  }

  getMovieGenres(): void {
    const genres: string[] = [];
    if (this.movie) {
      this.movie.genre_ids.forEach((genre) => {
        genres.push(this._genreService.getGenre(genre)?.name || '');
      });
      this.movieGenres = genres;
    }
  }
}
