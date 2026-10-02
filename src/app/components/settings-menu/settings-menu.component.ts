import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe } from '@jsverse/transloco';
import { APP_LANGUAGES, LANGUAGE_NAMES } from '../../i18n/languages';
import { LanguageStore } from '../../stores/language.store';
import { ThemeStore } from '../../stores/theme.store';

// Settings gear: language and light/dark theme, as radio items in one menu.
@Component({
  selector: 'app-settings-menu',
  imports: [
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    TranslocoPipe,
  ],
  templateUrl: './settings-menu.component.html',
  styleUrl: './settings-menu.component.sass',
})
export class SettingsMenuComponent {
  languageStore = inject(LanguageStore);
  themeStore = inject(ThemeStore);
  languages = APP_LANGUAGES.map((code) => ({ code, name: LANGUAGE_NAMES[code] }));
}
