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
  HttpRequest,
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { DOCUMENT, isPlatformServer } from '@angular/common';
import {
  provideClientHydration,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import { routes } from './app.routes';
import { apiInterceptor } from './interceptors/api.interceptor';
import { languageInterceptor } from './interceptors/language.interceptor';
import { sessionExpiredInterceptor } from './interceptors/session-expired.interceptor';
import { parseCookies, SESSION_COOKIE, TOKEN_COOKIE } from '../server/cookies';
import { API_URL } from './constants';
import { provideTransloco } from '@jsverse/transloco';
import { APP_LANGUAGES, DEFAULT_LANGUAGE } from './i18n/languages';
import { JsonTranslocoLoader } from './i18n/transloco-loader';
import { AuthStore } from './stores/auth.store';
import { LanguageStore } from './stores/language.store';

// Without a session cookie there is no user: skip /auth/me (and its 401).
// The server sees the httpOnly token; the browser, the readable `wtw_session`.
export function loadUser() {
  const isServer = isPlatformServer(inject(PLATFORM_ID));
  const cookies = isServer
    ? inject(REQUEST, { optional: true })?.headers.get('cookie')
    : inject(DOCUMENT).cookie;
  if (!parseCookies(cookies ?? undefined)[isServer ? TOKEN_COOKIE : SESSION_COOKIE]) {
    return;
  }
  return inject(AuthStore).load();
}

// The SSR forwards the browser cookie, so Angular would skip these by default. The
// cache lives in this user's page only (served with `no-store`).
const TRANSFERRED_URLS = new Set([`${API_URL}/auth/me`, `${API_URL}/genres`]);
export function shouldTransfer(req: HttpRequest<unknown>): boolean {
  return req.method === 'GET' && TRANSFERRED_URLS.has(req.url);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(
      withHttpTransferCacheOptions({
        includeRequestsWithAuthHeaders: true,
        filter: shouldTransfer,
      })
    ),
    provideHttpClient(withFetch(), withInterceptors([apiInterceptor, languageInterceptor, sessionExpiredInterceptor])),
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
