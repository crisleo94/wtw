import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormComponent } from './components/form/form.component';
import { MovieCardComponent } from './components/movie-card/movie-card.component';
import { MoviesOverviewComponent } from './components/movies-overview/movies-overview.component';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LogoComponent } from './components/logo/logo.component';
import { SettingsMenuComponent } from './components/settings-menu/settings-menu.component';
import { UserPanelComponent } from './components/user-panel/user-panel.component';
import { Movie } from './interfaces/movie.interface';
import { AuthDialogService } from './services/auth-dialog.service';
import { AuthStore } from './stores/auth.store';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-root',
  imports: [
    MovieCardComponent,
    MoviesOverviewComponent,
    FormComponent,
    UserPanelComponent,
    SettingsMenuComponent,
    LogoComponent,
    MatButtonModule,
    MatSidenavModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.sass',
})
export class AppComponent {
  authStore = inject(AuthStore);
  private authDialog = inject(AuthDialogService);
  private transloco = inject(TranslocoService);

  initials = computed(() =>
    (this.authStore.user()?.fullName ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('')
  );
  movie = signal<Movie | null>(null);
  isLoading = signal(false);
  panelOpen = signal(false);
  message = signal<string | null>(null);

  recieveMovie($event: Movie | null): void {
    this.movie.set($event);
    this.message.set(
      $event ? null : this.transloco.translate('errors.noMovies')
    );
  }

  recieveError(): void {
    this.movie.set(null);
    this.message.set(this.transloco.translate('errors.fetchError'));
  }

  openLogin(): void {
    this.authDialog.open().subscribe();
  }

  recieveIsLoading($event: boolean): void {
    this.isLoading.set($event);
  }
}
