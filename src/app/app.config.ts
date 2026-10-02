import {
  ApplicationConfig,
  isDevMode,
  inject,
  PLATFORM_ID,
  provideAppInitializer,
  REQUEST,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { isPlatformServer } from '@angular/common';
import { provideClientHydration } from '@angular/platform-browser';
import { routes } from './app.routes';
import { apiInterceptor } from './interceptors/api.interceptor';
import { sessionExpiredInterceptor } from './interceptors/session-expired.interceptor';
import { parseCookies, TOKEN_COOKIE } from '../server/cookies';
import { provideTransloco } from '@jsverse/transloco';
import { APP_LANGUAGES, DEFAULT_LANGUAGE } from './i18n/languages';
import { JsonTranslocoLoader } from './i18n/transloco-loader';
import { AuthStore } from './stores/auth.store';
import { LanguageStore } from './stores/language.store';

// On the server the user only exists for a real request that carries the token cookie.
function loadUser() {
  if (isPlatformServer(inject(PLATFORM_ID))) {
    const cookie = inject(REQUEST, { optional: true })?.headers.get('cookie');
    if (!parseCookies(cookie ?? undefined)[TOKEN_COOKIE]) {
      return;
    }
  }
  return inject(AuthStore).load();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withFetch(), withInterceptors([apiInterceptor, sessionExpiredInterceptor])),
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
