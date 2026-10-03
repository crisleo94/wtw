import {
  ApplicationConfig,
  isDevMode,
  inject,
  provideAppInitializer,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { routes } from './app.routes';
import { languageInterceptor } from './interceptors/language.interceptor';
import { sessionExpiredInterceptor } from './interceptors/session-expired.interceptor';
import { provideTransloco } from '@jsverse/transloco';
import { APP_LANGUAGES, DEFAULT_LANGUAGE } from './i18n/languages';
import { JsonTranslocoLoader } from './i18n/transloco-loader';
import { AuthStore } from './stores/auth.store';
import { LanguageStore } from './stores/language.store';

export function loadUser() {
  return inject(AuthStore).load();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([languageInterceptor, sessionExpiredInterceptor])),
    provideAppInitializer(loadUser),
    provideTransloco({
      config: {
        availableLangs: [...APP_LANGUAGES],
        defaultLang: DEFAULT_LANGUAGE,
        fallbackLang: DEFAULT_LANGUAGE,
        missingHandler: { useFallbackTranslation: true },
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: JsonTranslocoLoader,
    }),
    provideAppInitializer(() => inject(LanguageStore).init()),
  ],
};
