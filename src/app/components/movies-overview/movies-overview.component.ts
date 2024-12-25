import { animate, style, transition, trigger } from '@angular/animations';
import { Component, OnInit } from '@angular/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTabsModule } from '@angular/material/tabs';
import { Movie } from '../../interfaces/movie.interface';
import { MoviesService } from '../../services/movies.service';
import { MovieCardComponent } from '../movie-card/movie-card.component';

@Component({
  selector: 'app-movies-overview',
  standalone: true,
  imports: [MovieCardComponent, MatGridListModule, MatTabsModule],
  templateUrl: './movies-overview.component.html',
  styleUrl: './movies-overview.component.sass',
  animations: [
    trigger('insertOverview', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('100ms', style({ opacity: 1 })),
      ]),
    ]),
  ],
})
export class MoviesOverviewComponent implements OnInit {
  recentMovies: Movie[] = [];
  favoriteMovies: Movie[] = [];

  constructor(private _moviesService: MoviesService) {}

  ngOnInit(): void {
    this._moviesService.currentRecentMovies.subscribe(
      (currentMovies) => (this.recentMovies = currentMovies)
    );
    this._moviesService.currentFavoriteMovies.subscribe(
      (currentFavoriteMovies) => (this.favoriteMovies = currentFavoriteMovies)
    );
  }
}
