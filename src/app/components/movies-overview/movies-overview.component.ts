import { Component, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { Observable } from 'rxjs';
import {
  HistoryEntry,
  MovieListItem,
} from '../../interfaces/library.interface';
import { LibraryStore } from '../../stores/library.store';
import { apiErrorMessage } from '../../utils/api-error';
import { MovieCardComponent } from '../movie-card/movie-card.component';

@Component({
  selector: 'app-movies-overview',
  imports: [MovieCardComponent, MatTabsModule],
  templateUrl: './movies-overview.component.html',
  styleUrl: './movies-overview.component.sass',
})
export class MoviesOverviewComponent {
  private _library = inject(LibraryStore);
  private _snackBar = inject(MatSnackBar);

  history = this._library.history;
  watchlist = this._library.watchlist;

  removeHistory(entry: HistoryEntry): void {
    this.run(this._library.removeHistory(entry), 'Removed from your history.');
  }

  removeFromWatchlist(item: MovieListItem): void {
    const watchlist = this.watchlist();
    if (watchlist) {
      this.run(
        this._library.removeFromList(watchlist, item.tmdbId),
        'Removed from your watchlist.'
      );
    }
  }

  private run(action: Observable<void>, success: string): void {
    action.subscribe({
      next: () => this.notify(success),
      error: (error) => this.notify(apiErrorMessage(error)),
    });
  }

  private notify(message: string): void {
    this._snackBar.open(message, 'Dismiss', { duration: 2500 });
  }
}
