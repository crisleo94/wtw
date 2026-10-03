import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe } from '@jsverse/transloco';
import { MovieList } from '../../interfaces/library.interface';
import { Movie } from '../../interfaces/movie.interface';
import { GenresService } from '../../services/genres.service';
import { MovieActionsService } from '../../services/movie-actions.service';
import { LibraryStore } from '../../stores/library.store';
import { CARD_VARIANT } from '../../types/components.types';
import { posterUrl } from '../../utils/image-url';
import { StarRatingComponent } from '../star-rating/star-rating.component';

@Component({
  selector: 'app-movie-card',
  imports: [
    NgTemplateOutlet,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatChipsModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    TranslocoPipe,
    StarRatingComponent,
  ],
  templateUrl: './movie-card.component.html',
  styleUrl: './movie-card.component.sass',
})
export class MovieCardComponent {
  private _genreService = inject(GenresService);
  private _library = inject(LibraryStore);
  private _actions = inject(MovieActionsService);

  variant = input<CARD_VARIANT>('simple');
  movie = input<Movie | null>(null);
  removable = input(false);
  removeLabel = input('');
  remove = output<void>();
  showMore = signal(false);

  movieGenres = computed(() =>
    (this.movie()?.genreIds ?? []).map(
      (genre) => this._genreService.getGenre(genre)?.name || ''
    )
  );

  isWatched = computed(() => {
    const movie = this.movie();
    return !!movie && this._library.watchedIds().has(movie.tmdbId);
  });

  rating = computed(() => {
    const movie = this.movie();
    return movie ? (this._library.ratings().get(movie.tmdbId) ?? null) : null;
  });

  inWatchlist = computed(() => {
    const movie = this.movie();
    return !!movie && this._library.watchlistIds().has(movie.tmdbId);
  });

  customLists = computed(() =>
    this._library.lists().filter((list) => !list.isSystem)
  );

  inList(list: MovieList): boolean {
    const movie = this.movie();
    return !!movie && list.items.some((item) => item.tmdbId === movie.tmdbId);
  }

  buildImageUrl(path: string): string {
    return posterUrl(path);
  }

  toggleReadMore(): void {
    this.showMore.update((showMore) => !showMore);
  }

  toggleWatchlist(): void {
    this.withMovie((movie) => this._actions.toggleWatchlist(movie));
  }

  toggleWatched(): void {
    this.withMovie((movie) => this._actions.toggleWatched(movie));
  }

  addToList(list: MovieList): void {
    this.withMovie((movie) => this._actions.addToList(movie, list));
  }

  rate(rating: number | null): void {
    this.withMovie((movie) => this._actions.rate(movie, rating));
  }

  private withMovie(action: (movie: Movie) => void): void {
    const movie = this.movie();
    if (movie) {
      action(movie);
    }
  }
}
