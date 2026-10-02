import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { apiProxy } from './src/server/api-proxy';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// BFF: forwards /api/* to the backend inside the docker network
app.use(
  '/api',
  apiProxy({
    apiUrl: process.env['API_URL'] || 'http://localhost:3000',
    timeoutMs: Number(process.env['API_TIMEOUT_MS']) || 10000,
    secureCookie: process.env['COOKIE_SECURE'] === 'true',
  }),
);

// Serve static files from /browser
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

// All other requests are rendered by the Angular engine
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => {
      if (!response) {
        return next();
      }
      // Pages can include the user's data: never cache them in shared caches.
      res.setHeader('Cache-Control', 'private, no-store');
      return writeResponseToNodeResponse(response, res);
    })
    .catch(next);
});

// Start the server when run directly or via PM2 (PORT defaults to 4000)
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Request handler used by the Angular CLI (dev-server and build)
export const reqHandler = createNodeRequestHandler(app);
