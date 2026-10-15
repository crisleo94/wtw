import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { PROFILE_URL } from '../../constants';
import { CastMember, CrewMember } from '../../interfaces/movie-details.interface';
import { posterUrl } from '../../utils/image-url';

// Directing and writing credits plus a scrollable row of the main cast.
@Component({
  selector: 'app-movie-cast',
  imports: [MatIconModule, TranslocoPipe],
  templateUrl: './movie-cast.component.html',
  styleUrl: './movie-cast.component.sass',
})
export class MovieCastComponent {
  cast = input<CastMember[]>([]);
  crew = input<CrewMember[]>([]);

  directors = computed(() => this.names((member) => member.job === 'Director'));
  writers = computed(() => this.names((member) => member.job !== 'Director'));

  profile(path: string | null): string | null {
    return path ? posterUrl(path, PROFILE_URL) : null;
  }

  private names(match: (member: CrewMember) => boolean): string[] {
    return [...new Set(this.crew().filter(match).map((member) => member.name))];
  }
}
