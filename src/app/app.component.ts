import { HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormComponent } from './components/form/form.component';
import { MovieCardComponent } from './components/movie-card/movie-card.component';
import { MoviesOverviewComponent } from './components/movies-overview/movies-overview.component';
import { Movie } from './interfaces/movie.interface';
import { MoviesService } from './services/movies.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HttpClientModule,
    MovieCardComponent,
    MoviesOverviewComponent,
    FormComponent,
    MatProgressSpinnerModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.sass',
})
export class AppComponent {
  movie: Movie | null = null;
  isLoading = false;
  movies: Movie[] = [];
  favoriteMovies: Movie[] = [];

  constructor(private _moviesService: MoviesService) {}

  recieveMovie($event: Movie | null): void {
    if ($event) {
      this.movies.push($event);
    }
    this.movie = $event;

    this._moviesService.updateRecentMovies(this.movies);
  }

  recieveIsLoading($event: boolean): void {
    this.isLoading = $event;
  }
}
