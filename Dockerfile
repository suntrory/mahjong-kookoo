# syntax=docker/dockerfile:1

# ------------------------------------------------------------------
# Stage 1 — build (Node) : typecheck + Vite bundle
# ------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ------------------------------------------------------------------
# Stage 2 — runtime (Nginx) : เสิร์ฟ static SPA
# image unprivileged (uid 101, port 8080)
# ------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

LABEL org.opencontainers.image.title="mahjong-kookoo" \
      org.opencontainers.image.description="Mahjong Solitaire — 3 levels, hints, verified solvable deals" \
      org.opencontainers.image.version="1.0.0"

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
