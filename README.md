# Wtw

What to Watch: Angular 21 single page app (static build, no SSR). It calls the `wtw-api` backend directly on its own domain.

## Stack
- NodeJS `v22`
- Angular `v21` + Angular Material, Transloco (EN/ES)

## Installation
1. Run `nvm use` to use the correct NodeJS version
2. Run `npm ci` to install the dependencies

## Configuration
- `API_URL` (**build time**): base of the API **including** `/api`, for example `https://api-wtw.example.com/api`. Default: `http://localhost:3003/api`.

`npm start`, `npm run build` and `npm run watch` first run `scripts/generate-api-config.mjs`, which writes `src/app/config/api-url.generated.ts` (git ignored) from the variable; the builds swap `src/app/config/api-url.ts` for it. Unit tests use `src/app/config/api-url.ts` (`/api`). The value is baked into the bundle: change it and rebuild. `.env` is not loaded; export the variable in the shell or set it in the build environment (see `.env.example`).

## Auth
The API sets the JWT in its own `httpOnly` cookie (`wtw_token`) and clears it on `POST /api/auth/logout`. The front sends `withCredentials: true` to `API_URL` and never sees the token; it only keeps a `wtw.signedIn` flag in `localStorage` to skip `GET /api/auth/me` for anonymous visitors. The API must allow the front origin in `CORS_ORIGINS` (with credentials), and both should share the same site (e.g. `wtw.example.com` and `api-wtw.example.com`) so the `SameSite=Lax` cookie is sent.

## Local development
1. Start the API and Postgres from the `wtw-api` repo with Docker (API on `http://localhost:3003`, with `http://localhost:4200` in its `CORS_ORIGINS`).
2. Run `npm start` and open `http://localhost:4200` (uses the default `API_URL`).

## Deploy (Coolify)
1. New resource from the Git repository, build pack **Nixpacks** (Node 22 from `.nvmrc`), and mark it as a **static site**.
2. Build command: `npm run build`. Publish directory: `dist/wtw/browser`.
3. Build variable: `API_URL=https://<api-domain>/api` (it must be available at build time).
4. Enable the SPA fallback (every unknown path serves `index.html`); in Coolify, the "SPA" option of static sites.
5. In the API, add the front domain to `CORS_ORIGINS` and set `COOKIE_SECURE=true`.

## Scripts
- `npm start`: dev server on `http://localhost:4200`
- `npm run build`: production build in `dist/wtw/browser`
- `npm test`: unit tests (Karma, `ng test`)
- `npm run test:scripts`: tests of the build scripts (`node --test`)
