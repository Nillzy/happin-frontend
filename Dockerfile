# Multi-stage build for React Native Web Frontend

# Stage 1: Build application
FROM node:20-alpine AS builder

WORKDIR /app

ARG EXPO_PUBLIC_BACKEND_URL
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY

COPY package*.json ./

RUN npm ci

COPY . .

RUN printf "EXPO_PUBLIC_BACKEND_URL=%s\nEXPO_PUBLIC_SUPABASE_URL=%s\nEXPO_PUBLIC_SUPABASE_ANON_KEY=%s\n" \
    "$EXPO_PUBLIC_BACKEND_URL" \
    "$EXPO_PUBLIC_SUPABASE_URL" \
    "$EXPO_PUBLIC_SUPABASE_ANON_KEY" > .env.production

RUN npm run build

# Stage 2: Production server with nginx
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO/dev/null http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
