FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev
COPY . .
EXPOSE 4000
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--port", "4000"]

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
# The SSR bundle is self-contained: no node_modules needed at runtime
COPY --from=build --chown=node:node /app/dist/wtw ./
USER node
EXPOSE 4000
CMD ["node", "server/server.mjs"]
