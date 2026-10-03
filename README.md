# Wtw

What to Watch: Angular 21 SSR app. Its Express server (`server.ts`) also works as the BFF for the `wtw-api` backend.

## Stack
- NodeJS `v22`
- Angular `v21` (SSR) + Angular Material

## Installation
1. Run `nvm use` to use the correct NodeJS version
2. Run `npm ci` to install the dependencies
3. Run `cp .env.example .env`

## Environment
- `API_URL`: backend URL seen from the front container (`http://wtw-api:3000`)
- `PORT`: SSR server port (`4000`)
- `API_TIMEOUT_MS`: BFF timeout for API calls (`10000`); returns `504` when exceeded and `502` when the API is unreachable
- `COOKIE_SECURE`: `true` adds `Secure` to the `wtw_token` and `wtw_session` cookies (use it behind HTTPS)
- `NG_ALLOWED_HOSTS`: public domains (comma separated) Angular SSR accepts in the `Host` header; only `localhost` and `127.0.0.1` are allowed by default
- `INTERNAL_ORIGIN`: origin the SSR uses to call its own `/api` (default `http://localhost:${PORT}`)
- `SSR_API_TIMEOUT_MS`: max wait for each `/api` call during SSR (`3000`); after that the page is served and the browser loads the data

## BFF
`server.ts` forwards `/api/*` to `API_URL` (method, query, body and status). On login/register it moves the JWT from the response body into the `wtw_token` cookie (`httpOnly`, `sameSite=lax`), sends it back to the API as `Authorization: Bearer`, and `POST /api/auth/logout` clears it. The browser never sees the JWT or the TMDB token.

## Docker
The front shares the external network `wtw-network` with the `wtw-api` compose. It is the **only** service that publishes a port (`4000`); the API and Postgres stay inside the network.

1. Create the network once: `docker network create wtw-network`
2. Start the API and the DB from the `wtw-api` repo (see its README)
3. Start the front: `docker-compose up -d --build`
4. Open `http://localhost:4000`

### Development (hot reload)
`docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`

Mounts the source as a volume and runs `ng serve --host 0.0.0.0 --port 4000` (the dev server also runs `server.ts`).

### Validate
`docker-compose config`

## Deploy (Coolify)
1. Point the domain to the `wtw` service on port `4000` (in Coolify: `https://your.domain:4000`, the port is the container one, the public URL stays on 443).
2. Attach the app to the same Docker network as `wtw-api` so `API_URL=http://wtw-api:3000` resolves; only the front is public.
3. Set `NG_ALLOWED_HOSTS=your.domain`: without it Angular rejects requests whose `Host` is the public domain.
4. Set `COOKIE_SECURE=true` (the site is served over HTTPS).
5. Leave `INTERNAL_ORIGIN` unset (or `http://localhost:4000`). During SSR Angular would call `/api` on the public domain, and from inside the container that goes out through Cloudflare and back to the same host (hairpin NAT): the call hangs and Cloudflare answers `504`. The SSR therefore calls its own BFF on the internal origin, with `SSR_API_TIMEOUT_MS` as a safety net.
6. Health check: `GET /healthz` answers `ok`; the image already declares a `HEALTHCHECK` on it.

## Local scripts
- `npm start`: dev server on `http://localhost:4200`
- `npm run build`: production build in `dist/wtw`
- `npm run serve:ssr:wtw`: run the built SSR server
- `npm test`: unit tests
