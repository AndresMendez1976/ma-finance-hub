# ── Build stage ──
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src/ src/

RUN npm run build

# ── Production stage ──
FROM node:22-alpine AS production

RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist dist/

# No keys, no .env, no migration files, no source code in production image.
# Migrations run as a separate CI/CD step before deployment.

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
