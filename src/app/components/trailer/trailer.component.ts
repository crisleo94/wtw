import { Component, computed, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslocoPipe } from '@jsverse/transloco';
import { Trailer } from '../../interfaces/movie-details.interface';

// YouTube ids are 11 chars of [A-Za-z0-9_-]; anything else is not embedded.
const YOUTUBE_KEY = /^[\w-]{6,20}$/;

// Thumbnail first; the youtube-nocookie player loads only after a click (privacy).
@Component({
  selector: 'app-trailer',
  imports: [MatIconModule, TranslocoPipe],
  templateUrl: './trailer.component.html',
  styleUrl: './trailer.component.sass',
})
export class TrailerComponent {
  private sanitizer = inject(DomSanitizer);

  trailer = input.required<Trailer>();
  playing = signal(false);

  valid = computed(() => YOUTUBE_KEY.test(this.trailer().key));
  thumbnail = computed(() => `https://i.ytimg.com/vi/${this.trailer().key}/hqdefault.jpg`);
  embedUrl = computed<SafeResourceUrl | null>(() =>
    this.valid()
      ? this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://www.youtube-nocookie.com/embed/${this.trailer().key}?autoplay=1`
        )
      : null
  );
}
