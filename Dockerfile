FROM node:20-alpine as build
WORKDIR /app/src
COPY package*.json ./
RUN npm ci
COPY . ./
RUN npm run build

FROM node:20-alpine
RUN addgroup -S appgroup && adduser -S appuser -g appgroup
USER appuser
WORKDIR /usr/app
COPY --from=build /app/src/dist/wtw/ ./
CMD node server/server.mjs
EXPOSE 4000