import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeMode, ThemeStore } from '../../stores/theme.store';

const OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: 'Light', icon: 'light_mode' },
  { mode: 'dark', label: 'Dark', icon: 'dark_mode' },
  { mode: 'system', label: 'System', icon: 'brightness_auto' },
];

@Component({
  selector: 'app-theme-toggle',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule],
  template: `
    <button
      mat-icon-button
      [matMenuTriggerFor]="themeMenu"
      [matTooltip]="'Theme: ' + selected().label"
      [attr.aria-label]="'Theme: ' + selected().label"
    >
      <mat-icon>{{ selected().icon }}</mat-icon>
    </button>
    <mat-menu #themeMenu="matMenu">
      @for (option of options; track option.mode) {
      <button
        mat-menu-item
        role="menuitemradio"
        [attr.aria-checked]="option.mode === themeStore.mode()"
        (click)="themeStore.setMode(option.mode)"
      >
        <mat-icon>{{ option.icon }}</mat-icon>
        <span>{{ option.label }}</span>
      </button>
      }
    </mat-menu>
  `,
})
export class ThemeToggleComponent {
  themeStore = inject(ThemeStore);
  options = OPTIONS;
  selected = computed(
    () => OPTIONS.find((option) => option.mode === this.themeStore.mode())!
  );
}
