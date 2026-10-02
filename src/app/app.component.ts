import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormComponent } from './components/form/form.component';
import { MovieCardComponent } from './components/movie-card/movie-card.component';
import { MoviesOverviewComponent } from './components/movies-overview/movies-overview.component';
import { Movie } from './interfaces/movie.interface';
import { MoviesService } from './services/movies.service';

const NO_RESULTS_MESSAGE =
  'No movies match these filters. Try a wider year range, fewer genres or fewer minimum votes.';
const ERROR_MESSAGE = 'We could not get a movie right now. Please try again.';

@Component({
  selector: 'app-root',
  imports: [
    MovieCardComponent,
    MoviesOverviewComponent,
    FormComponent,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.sass',
})
export class AppComponent {
  private _moviesService = inject(MoviesService);

  movie = signal<Movie | null>(null);
  isLoading = signal(false);
  message = signal<string | null>(null);

  recieveMovie($event: Movie | null): void {
    if ($event) {
      this._moviesService.addRecentMovie($event);
    }
    this.movie.set($event);
    this.message.set($event ? null : NO_RESULTS_MESSAGE);
  }

  recieveError(): void {
    this.movie.set(null);
    this.message.set(ERROR_MESSAGE);
  }

  recieveIsLoading($event: boolean): void {
    this.isLoading.set($event);
  }
}
