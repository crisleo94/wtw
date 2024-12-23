import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { IMAGE_URL } from '../../constants';
import { Movie } from '../../interfaces/movie.interface';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, NgIf],
  templateUrl: './movie-card.component.html',
  styleUrl: './movie-card.component.sass',
})
export class MovieCardComponent {
  @Input() movie: Movie | null = null;

  buildImageUrl(path: string): string {
    return path ? `${IMAGE_URL}/${path}` : '';
  }
}
