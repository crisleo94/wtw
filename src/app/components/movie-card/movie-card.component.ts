import { Component, Input, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IMAGE_URL, PLACEHOLDER_IMG } from '../../constants';
import { Movie } from '../../interfaces/movie.interface';
import { GenresService } from '../../services/genres.service';
import { MoviesService } from '../../services/movies.service';
import { CARD_VARIANT } from '../../types/components.types';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './movie-card.component.html',
  styleUrl: './movie-card.component.sass',
})
export class MovieCardComponent implements OnInit {
  @Input() variant: CARD_VARIANT = 'simple';
  @Input() movie: Movie | null = null;
  favoriteMovies: Movie[] = [];
  movieGenres: string[] = [];
  showMore = false;

  constructor(
    private _genreService: GenresService,
    private _moviesService: MoviesService,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.getMovieGenres();
  }

  buildImageUrl(path: string): string {
    return path ? `${IMAGE_URL}/${path}` : PLACEHOLDER_IMG;
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

  toggleReadMore(): void {
    this.showMore = !this.showMore;
  }

  addToFavorite(): void {
    if (this.movie) {
      this.favoriteMovies = [...this.favoriteMovies, this.movie];
    }
    this._snackBar.open('Movie added to favorites!', 'Dismiss', {
      duration: 1000,
    });

    this._moviesService.updateFavoriteMovies(this.favoriteMovies);
  }
}
