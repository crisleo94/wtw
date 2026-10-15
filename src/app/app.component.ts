import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LogoComponent } from './components/logo/logo.component';
import { SettingsMenuComponent } from './components/settings-menu/settings-menu.component';
import { UserPanelComponent } from './components/user-panel/user-panel.component';
import { AuthDialogService } from './services/auth-dialog.service';
import { AuthStore } from './stores/auth.store';
import { WatchCatalogStore } from './stores/watch-catalog.store';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MatDividerModule } from '@angular/material/divider';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  imports: [
    RouterLink,
    RouterOutlet,
    UserPanelComponent,
    SettingsMenuComponent,
    LogoComponent,
    MatButtonModule,
    MatSidenavModule,
    MatIconModule,
    MatTooltipModule,
    TranslocoPipe,
    MatDividerModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.sass',
})
export class AppComponent implements OnInit {
  authStore = inject(AuthStore);
  private readonly titleService = inject(Title);
  private readonly translocoService = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  private authDialog = inject(AuthDialogService);

  initials = computed(() =>
    (this.authStore.user()?.fullName ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('')
  );
  panelOpen = signal(false);

  constructor() {
    // Countries are needed for the default country and the "where to watch" titles.
    inject(WatchCatalogStore).loadRegions();
  }

  ngOnInit(): void {
    this.translocoService.langChanges$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.translocoService
          .selectTranslate<string>('header.title')
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((translatedTitle) => {
            this.titleService.setTitle(translatedTitle);
          });
      });
  }

  openLogin(): void {
    this.authDialog.open().subscribe();
  }
}
