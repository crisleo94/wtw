import { Component, inject } from '@angular/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTabsModule } from '@angular/material/tabs';
import { MoviesService } from '../../services/movies.service';
import { MovieCardComponent } from '../movie-card/movie-card.component';

@Component({
  selector: 'app-movies-overview',
  imports: [MovieCardComponent, MatGridListModule, MatTabsModule],
  templateUrl: './movies-overview.component.html',
  styleUrl: './movies-overview.component.sass',
})
export class MoviesOverviewComponent {
  private _moviesService = inject(MoviesService);

  recentMovies = this._moviesService.currentRecentMovies;
  favoriteMovies = this._moviesService.currentFavoriteMovies;
}
