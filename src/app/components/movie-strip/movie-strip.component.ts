import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROFILE_URL } from '../../constants';
import { Movie } from '../../interfaces/movie.interface';
import { posterUrl } from '../../utils/image-url';

// Scrollable row of posters; each one opens that movie's detail.
@Component({
  selector: 'app-movie-strip',
  imports: [RouterLink],
  template: `
    <ul class="h-scroll" tabindex="0" [attr.aria-label]="label()">
      @for (movie of movies(); track movie.tmdbId) {
      <li>
        <a [routerLink]="['/movie', movie.tmdbId]">
          <img [src]="poster(movie)" alt="" width="120" height="180" loading="lazy" />
          <span class="name">{{ movie.title }}</span>
        </a>
      </li>
      }
    </ul>
  `,
  styles: `
    :host
      display: block
    li
      width: 120px
    a
      display: grid
      gap: 4px
      color: inherit
      text-decoration: none
      border-radius: 8px
      &:hover .name, &:focus-visible .name
        text-decoration: underline
      &:focus-visible
        outline: 2px solid var(--mat-sys-primary)
        outline-offset: 2px
    img
      width: 120px
      height: 180px
      border-radius: 8px
      object-fit: cover
    .name
      font-size: 13px
      overflow-wrap: anywhere
  `,
})
export class MovieStripComponent {
  movies = input<Movie[]>([]);
  label = input('');

  // w185 is enough for a 120px wide poster.
  poster(movie: Movie): string {
    return posterUrl(movie.posterPath, PROFILE_URL);
  }
}
