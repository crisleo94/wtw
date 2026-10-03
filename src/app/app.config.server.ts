import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { FetchBackend } from '@angular/common/http';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { InternalApiBackend, SSR_INTERNAL_ORIGIN } from './ssr/internal-api.backend';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    {
      provide: SSR_INTERNAL_ORIGIN,
      useFactory: () =>
        process.env['INTERNAL_ORIGIN'] || `http://localhost:${process.env['PORT'] || 4000}`,
    },
    // Replaces the backend that withFetch() registers, only on the server.
    { provide: FetchBackend, useClass: InternalApiBackend },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
