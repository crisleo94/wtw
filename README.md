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

## Local scripts
- `npm start`: dev server on `http://localhost:4200`
- `npm run build`: production build in `dist/wtw`
- `npm run serve:ssr:wtw`: run the built SSR server
- `npm test`: unit tests
