import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoPipe } from '@jsverse/transloco';
import { FormComponent } from '../../components/form/form.component';
import { MovieCardComponent } from '../../components/movie-card/movie-card.component';
import { MoviesOverviewComponent } from '../../components/movies-overview/movies-overview.component';
import { GeneratorStore } from '../../stores/generator.store';

// Route `/`: the generator, its result and the overview tables.
@Component({
  selector: 'app-home',
  imports: [
    FormComponent,
    MovieCardComponent,
    MoviesOverviewComponent,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslocoPipe,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.sass',
})
export class HomeComponent {
  generator = inject(GeneratorStore);
}
