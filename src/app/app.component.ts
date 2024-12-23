import { HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormComponent } from './components/form/form.component';
import { MovieCardComponent } from './components/movie-card/movie-card.component';
import { Movie } from './interfaces/movie.interface';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HttpClientModule,
    MovieCardComponent,
    FormComponent,
    MatProgressSpinnerModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.sass',
})
export class AppComponent {
  movie: Movie | null = null;
  isLoading = false;

  recieveMovie($event: Movie | null): void {
    this.movie = $event;
  }

  recieveIsLoading($event: boolean): void {
    this.isLoading = $event;
  }
}
