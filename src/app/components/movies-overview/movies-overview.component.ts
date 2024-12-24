import { Component, Input } from '@angular/core';
import { Movie } from '../../interfaces/movie.interface';

@Component({
  selector: 'app-movies-overview',
  standalone: true,
  imports: [],
  templateUrl: './movies-overview.component.html',
  styleUrl: './movies-overview.component.sass',
})
export class MoviesOverviewComponent {
  @Input() recentMovies: Movie[] = [];
}
