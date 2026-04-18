# Multi-stage build for React Native Web Frontend
# Stage 1: Build application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (if any exist)
RUN npm install --production || true

# Copy application source
COPY . .

# Build for production (React Native Web)
RUN npm run build

# Stage 3: Production server with nginx
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from builder
# Adjust path based on build output (dist/ or build/)
# When implementing: set BUILD_OUTPUT_DIR to match your build script output
ARG BUILD_OUTPUT_DIR=dist
COPY --from=builder /app/${BUILD_OUTPUT_DIR} /usr/share/nginx/html

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
