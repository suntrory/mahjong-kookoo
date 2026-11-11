# syntax=docker/dockerfile:1

# ------------------------------------------------------------------
# Stage 1 — build (Node) : typecheck + Vinext build (RSC + SSR + client)
# next.config.ts sets output: 'standalone' → dist/standalone/
# ------------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ------------------------------------------------------------------
# Stage 2 — runtime (Node) : เสิร์ฟด้วย standalone server ของ Vinext
# รันด้วย user node (uid 1000), port 8080
# ------------------------------------------------------------------
FROM node:24-alpine AS runtime

LABEL org.opencontainers.image.title="mahjong-kookoo" \
      org.opencontainers.image.description="Mahjong Solitaire on Vinext — 3 levels, hints, verified solvable deals" \
      org.opencontainers.image.version="2.0.0"

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080

WORKDIR /app
COPY --from=build --chown=node:node /app/dist/standalone ./

USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

CMD ["node", "server.js"]
