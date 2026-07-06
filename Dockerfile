# Stage 1: Build the Vue application
FROM node:20-slim AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:1.25-alpine AS production-stage
COPY --from=build-stage /app/dist/public /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Default environment variables to prevent Nginx from crashing if they are not provided
ENV QBITTORRENT_URL=http://localhost:8080
ENV QBITTORRENT_HOST=localhost:8080
ENV QBITTORRENT_USER=""
ENV QBITTORRENT_PASS=""

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
