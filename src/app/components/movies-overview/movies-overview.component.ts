import { Component, computed, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Observable } from 'rxjs';
import {
  HistoryEntry,
  MovieListItem,
} from '../../interfaces/library.interface';
import { LibraryStore } from '../../stores/library.store';
import { apiErrorMessage } from '../../utils/api-error';
import { MovieTableComponent, MovieTableRow } from '../movie-table/movie-table.component';

@Component({
  selector: 'app-movies-overview',
  imports: [MovieTableComponent, MatTabsModule, TranslocoPipe],
  templateUrl: './movies-overview.component.html',
  styleUrl: './movies-overview.component.sass',
})
export class MoviesOverviewComponent {
  private _library = inject(LibraryStore);
  private _snackBar = inject(MatSnackBar);
  private _transloco = inject(TranslocoService);

  loaded = this._library.ready;
  history = computed(() => (this.loaded() ? this._library.history() : []));
  watchlist = computed(() =>
    this.loaded() ? this._library.watchlist() : undefined
  );

  historyRows = computed<MovieTableRow[]>(() =>
    this.history().map((entry) => ({ key: historyKey(entry), movie: entry.movie }))
  );
  watchlistRows = computed<MovieTableRow[]>(() =>
    (this.watchlist()?.items ?? []).map((item) => ({ key: String(item.tmdbId), movie: item.movie }))
  );

  removeHistoryRow(row: MovieTableRow): void {
    const entry = this.history().find((candidate) => historyKey(candidate) === row.key);
    if (entry) {
      this.removeHistory(entry);
    }
  }

  removeWatchlistRow(row: MovieTableRow): void {
    const item = this.watchlist()?.items.find((candidate) => candidate.tmdbId === row.movie.tmdbId);
    if (item) {
      this.removeFromWatchlist(item);
    }
  }

  removeHistory(entry: HistoryEntry): void {
    this.run(this._library.removeHistory(entry), this._transloco.translate('overview.removeFromHistory'));
  }

  removeFromWatchlist(item: MovieListItem): void {
    const watchlist = this.watchlist();
    if (watchlist) {
      this.run(
        this._library.removeFromList(watchlist, item.tmdbId),
        this._transloco.translate('overview.removeFromWatchlist')
      );
    }
  }

  private run(action: Observable<void>, success: string): void {
    action.subscribe({
      next: () => this.notify(success),
      error: (error) => this.notify(apiErrorMessage(error, this._transloco)),
    });
  }

  private notify(message: string): void {
    this._snackBar.open(message, this._transloco.translate('common.dismiss'), { duration: 2500 });
  }
}

function historyKey(entry: HistoryEntry): string {
  return entry.id ?? `${entry.generatedAt}:${entry.movie.tmdbId}`;
}
