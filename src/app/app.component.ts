import { HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormComponent } from './components/form/form.component';
import { MovieCardComponent } from './components/movie-card/movie-card.component';
import { MoviesOverviewComponent } from './components/movies-overview/movies-overview.component';
import { Movie } from './interfaces/movie.interface';

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

  recieveMovie($event: Movie | null): void {
    if ($event) {
      this.movies.push($event);
      localStorage.setItem('movies', JSON.stringify(this.movies));
    }
    this.movie = $event;
  }

  recieveIsLoading($event: boolean): void {
    this.isLoading = $event;
  }
}
