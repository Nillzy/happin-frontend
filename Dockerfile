# Multi-stage build for React Native Web Frontend

# Stage 1: Build application
FROM node:20-alpine AS builder

WORKDIR /app

ARG EXPO_PUBLIC_BACKEND_URL
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ARG EXPO_PUBLIC_MAPTILER_API_KEY
ARG EXPO_PUBLIC_MAPTILER_KEY

COPY package*.json ./

RUN npm ci

COPY . .

# Bundle mit Platzhaltern bauen — die echten Werte werden zur Laufzeit
# vom docker-entrypoint.sh in das JS-Bundle gesed'et. Die ARG-Werte oben
# werden hier bewusst ignoriert; ARG bleibt nur für Kompatibilität mit
# der bestehenden CI-Pipeline (die --build-arg übergibt).
RUN printf "EXPO_PUBLIC_BACKEND_URL=__RUNTIME_BACKEND_URL__\nEXPO_PUBLIC_SUPABASE_URL=__RUNTIME_SUPABASE_URL__\nEXPO_PUBLIC_SUPABASE_ANON_KEY=__RUNTIME_SUPABASE_ANON_KEY__\nEXPO_PUBLIC_MAPTILER_API_KEY=__RUNTIME_MAPTILER_API_KEY__\nEXPO_PUBLIC_MAPTILER_KEY=__RUNTIME_MAPTILER_KEY__\n" > .env.production

RUN npm run build

# Stage 2: Production server with nginx
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO/dev/null http://localhost/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
