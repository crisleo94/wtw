import { Component, computed, inject, input, signal } from '@angular/core';
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
export class MovieCardComponent {
  private _genreService = inject(GenresService);
  private _moviesService = inject(MoviesService);
  private _snackBar = inject(MatSnackBar);

  variant = input<CARD_VARIANT>('simple');
  movie = input<Movie | null>(null);
  showMore = signal(false);

  movieGenres = computed(() =>
    (this.movie()?.genre_ids ?? []).map(
      (genre) => this._genreService.getGenre(genre)?.name || ''
    )
  );

  buildImageUrl(path: string): string {
    return path ? `${IMAGE_URL}/${path}` : PLACEHOLDER_IMG;
  }

  toggleReadMore(): void {
    this.showMore.update((showMore) => !showMore);
  }

  addToFavorite(): void {
    const movie = this.movie();
    if (movie) {
      this._moviesService.addFavoriteMovie(movie);
    }
    this._snackBar.open('Movie added to favorites!', 'Dismiss', {
      duration: 1000,
    });
  }
}
