import { Component, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormComponent } from './components/form/form.component';
import { MovieCardComponent } from './components/movie-card/movie-card.component';
import { MoviesOverviewComponent } from './components/movies-overview/movies-overview.component';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';
import { UserPanelComponent } from './components/user-panel/user-panel.component';
import { Movie } from './interfaces/movie.interface';

const NO_RESULTS_MESSAGE =
  'No movies match these filters. Try a wider year range, fewer genres or fewer minimum votes.';
const ERROR_MESSAGE = 'We could not get a movie right now. Please try again.';

@Component({
  selector: 'app-root',
  imports: [
    MovieCardComponent,
    MoviesOverviewComponent,
    FormComponent,
    UserPanelComponent,
    ThemeToggleComponent,
    MatButtonModule,
    MatSidenavModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.sass',
})
export class AppComponent {
  movie = signal<Movie | null>(null);
  isLoading = signal(false);
  panelOpen = signal(false);
  message = signal<string | null>(null);

  recieveMovie($event: Movie | null): void {
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
