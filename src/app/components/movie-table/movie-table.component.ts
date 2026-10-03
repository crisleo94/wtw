import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe } from '@jsverse/transloco';
import { THUMBNAIL_URL } from '../../constants';
import { MovieList } from '../../interfaces/library.interface';
import { Movie } from '../../interfaces/movie.interface';
import { MovieActionsService } from '../../services/movie-actions.service';
import { LanguageStore } from '../../stores/language.store';
import { LibraryStore } from '../../stores/library.store';
import { posterUrl } from '../../utils/image-url';
import { StarRatingComponent } from '../star-rating/star-rating.component';

export interface MovieTableRow {
  // Unique per row: the same movie can appear twice in the history.
  key: string;
  movie: Movie;
}

// Compact list for the History and Watchlist tabs. Columns drop with the width
// of the table (container queries): description and average go first.
@Component({
  selector: 'app-movie-table',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTableModule,
    MatTooltipModule,
    TranslocoPipe,
    StarRatingComponent,
  ],
  templateUrl: './movie-table.component.html',
  styleUrl: './movie-table.component.sass',
})
export class MovieTableComponent {
  private library = inject(LibraryStore);
  private actions = inject(MovieActionsService);
  private languageStore = inject(LanguageStore);

  rows = input<MovieTableRow[]>([]);
  // Off where removing would repeat another action (Watched tab: the watched toggle).
  removable = input(true);
  removeLabel = input('');
  remove = output<MovieTableRow>();

  readonly columns = ['poster', 'title', 'overview', 'average', 'rating', 'actions'];
  expanded = signal<string | null>(null);

  // Rows are rebuilt on every library change: keep the DOM (and the focus) by key.
  readonly trackRow = (_index: number, row: MovieTableRow) => row.key;

  watchedIds = this.library.watchedIds;
  watchlistIds = this.library.watchlistIds;
  ratings = this.library.ratings;
  customLists = computed(() => this.library.lists().filter((list) => !list.isSystem));

  thumbnail(movie: Movie): string {
    return posterUrl(movie.posterPath, THUMBNAIL_URL);
  }

  year(movie: Movie): string {
    return movie.releaseDate?.slice(0, 4) ?? '';
  }

  average(movie: Movie): string {
    return (movie.voteAverage ?? 0).toLocaleString(this.languageStore.lang(), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }

  rating(movie: Movie): number | null {
    return this.ratings().get(movie.tmdbId) ?? null;
  }

  inList(list: MovieList, movie: Movie): boolean {
    return list.items.some((item) => item.tmdbId === movie.tmdbId);
  }

  // Runs before MatTooltip's own listeners, so a short synopsis shows no tooltip.
  onlyIfClamped(tooltip: MatTooltip, event: Event): void {
    const text = (event.currentTarget as HTMLElement).querySelector('.overview');
    tooltip.disabled = !text || text.scrollHeight <= text.clientHeight + 1;
  }

  // Phones: a tap on the title opens the synopsis row (there is no hover).
  toggle(row: MovieTableRow): void {
    this.expanded.update((key) => (key === row.key ? null : row.key));
  }

  toggleWatchlist(movie: Movie): void {
    this.actions.toggleWatchlist(movie);
  }

  toggleWatched(movie: Movie): void {
    this.actions.toggleWatched(movie);
  }

  addToList(movie: Movie, list: MovieList): void {
    this.actions.addToList(movie, list);
  }

  rate(movie: Movie, rating: number | null): void {
    this.actions.rate(movie, rating);
  }
}
