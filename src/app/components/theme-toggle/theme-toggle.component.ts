import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeStore } from '../../stores/theme.store';

@Component({
  selector: 'app-theme-toggle',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <button
      mat-icon-button
      [style.visibility]="hydrated() ? null : 'hidden'"
      [matTooltip]="label()"
      [attr.aria-label]="label()"
      (click)="themeStore.toggle()"
    >
      <mat-icon>{{ themeStore.isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `,
})
export class ThemeToggleComponent {
  themeStore = inject(ThemeStore);
  // The server can't know the saved theme: show the icon once hydrated.
  hydrated = signal(false);
  label = computed(() =>
    this.themeStore.isDark() ? 'Switch to light mode' : 'Switch to dark mode'
  );

  constructor() {
    afterNextRender(() => this.hydrated.set(true));
  }
}
