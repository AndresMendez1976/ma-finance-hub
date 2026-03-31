# ── Build ──
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx next build

# ── Production ──
FROM node:22-alpine
RUN addgroup -g 1001 -S app && adduser -S app -u 1001 -G app
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static .next/static
COPY --from=builder /app/public public/
USER app
EXPOSE 4000
ENV PORT=4000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
