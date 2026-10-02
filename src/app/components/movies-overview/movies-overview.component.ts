import {
  afterNextRender,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
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
import { MovieCardComponent } from '../movie-card/movie-card.component';

@Component({
  selector: 'app-movies-overview',
  imports: [MovieCardComponent, MatTabsModule, TranslocoPipe],
  templateUrl: './movies-overview.component.html',
  styleUrl: './movies-overview.component.sass',
})
export class MoviesOverviewComponent {
  private _library = inject(LibraryStore);
  private _snackBar = inject(MatSnackBar);
  private _transloco = inject(TranslocoService);

  // The server can't read sessionStorage: show the library after hydration so both match.
  private hydrated = signal(false);

  loaded = computed(() => this.hydrated() && this._library.ready());
  history = computed(() => (this.loaded() ? this._library.history() : []));
  watchlist = computed(() =>
    this.loaded() ? this._library.watchlist() : undefined
  );

  constructor() {
    afterNextRender(() => this.hydrated.set(true));
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
