import { Component, Input } from '@angular/core';
import { IMAGE_URL } from '../../constants';
import { Movie } from '../../interfaces/movie.interface';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [],
  templateUrl: './movie-card.component.html',
  styleUrl: './movie-card.component.sass',
})
export class MovieCardComponent {
  @Input() movie: Movie = {} as Movie;

  buildImageUrl(path: string): string {
    return path ? `${IMAGE_URL}/${path}` : '';
  }
}
