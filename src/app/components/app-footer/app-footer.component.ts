import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';

// Required credits (TMDB, JustWatch) and the author's signature, on every route.
@Component({
  selector: 'app-footer',
  imports: [MatIconModule, TranslocoPipe],
  templateUrl: './app-footer.component.html',
  styleUrl: './app-footer.component.sass',
})
export class AppFooterComponent {
  readonly year = new Date().getFullYear();
}
