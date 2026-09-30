# Stage 1: Build the Vue application
FROM node:20-slim AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the application with Python high-availability server (supports persistent user-settings & proxy)
FROM python:3.11-alpine AS production-stage
WORKDIR /app

# Copy built frontend assets
COPY --from=build-stage /app/dist/public /app/ui
# Copy server script
COPY scripts/server.py /app/server.py

# Default environment variables
ENV SERVICE_PORT=80
ENV WEB_ROOT=/app/ui
ENV DATA_DIR=/data
ENV QBITTORRENT_URL=http://localhost:8080
ENV QBITTORRENT_HOST=localhost:8080
ENV QBITTORRENT_USER=""
ENV QBITTORRENT_PASS=""

# Persistent data volume for user settings (categories, paths, themes, sidebar, defaults)
VOLUME ["/data"]

EXPOSE 80
CMD ["python3", "-u", "/app/server.py"]
