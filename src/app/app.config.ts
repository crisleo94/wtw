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
import { AuthStore } from './stores/auth.store';

// The server only knows the user while rendering a real request (not at build time).
function loadUser() {
  const isServer = isPlatformServer(inject(PLATFORM_ID));
  if (isServer && !inject(REQUEST, { optional: true })) {
    return;
  }
  return inject(AuthStore).load();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withFetch(), withInterceptors([apiInterceptor])),
    provideAppInitializer(loadUser),
  ],
};
