import {
  ApplicationConfig,
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
import { AuthStore } from './stores/auth.store';

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
  ],
};
