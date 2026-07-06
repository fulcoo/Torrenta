# 📖 Torrenta Installation & Usage Manual

This manual provides detailed instructions on various deployment options, configuration variables, and automatic update setup for Torrenta.

👉 **[中文版用户手册 (Chinese Manual)](user_manual_zh.md)**

---

## 🚀 Table of Contents
1. [Docker Mode (Recommended - Zero CORS & Zero Cookie Setup)](#1-docker-mode-recommended---zero-cors--zero-cookie-setup)
2. [Alternative WebUI Mode (Same-Origin Native Integration)](#2-alternative-webui-mode-same-origin-native-integration)
3. [Standalone Mode (Cross-Origin Setup)](#3-standalone-mode-cross-origin-setup)
4. [Automatic Updates Setup](#4-automatic-updates-setup)
5. [Troubleshooting & FAQ](#5-troubleshooting--faq)

---

## 1. Docker Mode (Recommended - Zero CORS & Zero Cookie Setup)

Deploying Torrenta as a Docker container is the simplest and most robust setup. By utilizing a built-in Nginx reverse proxy, static frontend assets and downloader APIs are unified under a single host and port. **This completely bypasses browser CORS blockages and SameSite Cookie restrictions.**

### ⚙️ Configuration Variables
- **`Dockerfile`**: A multi-stage build that compiles Vue 3 static assets and copies them into a high-performance Nginx Alpine container.
- **`nginx.conf.template`**: Nginx configuration template. It dynamically injects environment variables, proxies `/api/v2/` requests to qBittorrent, and rewrites Origin/Referer/Host headers to match qBittorrent's local expectations.
- **`docker-compose.yml`**: Compose file for one-command startup. Note that the **web port configuration** is located under the `ports` field (defaults to `3000:80`, which maps host port `3000` to container port `80`. If you wish to change the access port, simply modify `3000` to any vacant port on your host, leaving the `:80` container port unchanged).

### 📝 Step-by-Step Guide
1. Open [docker-compose.yml](../docker-compose.yml).
2. Configure the environment variables:
   - **`QBITTORRENT_URL`**: The address Torrenta uses to contact qBittorrent in the background (e.g. `http://host.docker.internal:8081` on same host, or `http://qbittorrent:8080` if on the same Docker bridge network).
   - **`QBITTORRENT_HOST`**: The Host header qBittorrent expects. It must match the actual address and port of your qBittorrent instance (e.g. `localhost:8081` or `127.0.0.1:8081`) to satisfy qBittorrent's **Host Header Validation**.
   - **`QBITTORRENT_USER`** (Optional): Your qBittorrent WebUI login username. If provided, the web application will automatically log in on startup.
   - **`QBITTORRENT_PASS`** (Optional): Your qBittorrent WebUI login password. If provided, the web application will automatically log in on startup.
3. Launch the container:
   ```bash
   docker compose up -d --build
   ```
4. Access `http://localhost:3000` (or your mapped external port) in your web browser.
5. **IMPORTANT**: In Torrenta's settings drawer, **leave the "Connection URL" field empty**. The Nginx proxy will automatically route all relative `/api/v2` requests. If `QBITTORRENT_USER` and `QBITTORRENT_PASS` are configured, Torrenta will detect them on startup and perform a silent automatic login without prompt.

---

## 2. Alternative WebUI Mode (Same-Origin Native Integration)

If you prefer not to run a separate web server container, you can compile Torrenta into static assets and load them natively inside qBittorrent.

### 📝 Step-by-Step Guide
1. Install dependencies and compile the project in your local development environment:
   ```bash
   npm install
   npm run build
   ```
   This will output the compiled bundle into `dist/` (where static public files are placed in `dist/public/`).
2. Copy the entire `dist/` directory onto your qBittorrent host machine (e.g. `/share/WebUI/torrenta`).
3. Open your qBittorrent WebUI settings:
   - Go to **Tools** -> **Options** -> **Web UI**.
   - Check **Use alternative Web UI**.
   - Set the folder path to the uploaded `dist` directory (**Note**: Point it to the parent directory containing the `public` folder, not directly inside `public/`).
4. Refresh your qBittorrent WebUI page in your browser.

---

## 3. Standalone Mode (Cross-Origin Setup)

If you are hosting Torrenta on a separate static site server (like GitHub Pages, Cloudflare Pages, or another custom host/port), you must configure cross-origin settings.

### ⚠️ Critical Notes
*   **CORS Settings**: You must log in to the native qBittorrent WebUI, navigate to **Settings** -> **Web UI**, enable **"Enable Cross-Origin Resource Sharing (CORS)"**, and add your Torrenta domain to the whitelist (or turn off **"Verify Web User Interface Host header"**).
*   **SameSite Cookie Policy**: Modern browsers restrict cross-site session cookies by default. When connecting across different ports or domains (e.g., `http://localhost:5173` connecting to `http://localhost:8080`), browser policies might block the session cookie (`SID`). **Therefore, we highly recommend using [Docker Mode](#1-docker-mode-recommended---zero-cors--zero-cookie-setup) or [Alternative WebUI Mode](#2-alternative-webui-mode-same-origin-native-integration) instead.**

---

## 4. Automatic Updates Setup

### 🐳 A. Docker Standalone Mode
- **Method 1: Automatic via Watchtower**
  Uncomment the `watchtower` container block in `docker-compose.yml`. Watchtower will run in the background, poll the registry, and automatically update/restart the Torrenta container when new releases are pushed.
- **Method 2: One-Command Update**
  Navigate to your repository root and run:
  ```bash
  docker compose pull && docker compose up -d
  ```

### 📂 B. Alternative WebUI Mode (GitHub Polling Script)
For users running Torrenta locally inside qBittorrent, we provide an automatic shell script [update-torrenta.sh](../update-torrenta.sh).

1. Edit the script and adjust the configuration:
   - `REPO`: Your GitHub repository pointer.
   - `WEBUI_DIR`: Point it to the folder you set as the alternative WebUI path.
2. Grant execution permissions:
   ```bash
   chmod +x update-torrenta.sh
   ```
3. Set up a Cron job (e.g., to run daily at 1:00 AM):
   ```bash
   0 1 * * * /path/to/update-torrenta.sh
   ```
   The script compares the latest GitHub release tag against your local `version.txt`. If an update is found, it downloads the release asset zip, extracts it, overwrites the installation folder, and updates the local version flag.

---

## 5. Troubleshooting & FAQ

### Q1: The WebUI shows "Disconnected" or returns 403 Forbidden?
*   **Clear Web Settings**: If you are using the Docker proxy mode, click "Settings" in Torrenta, look for the **Connection URL / WebUI URL**, **clear it completely**, and click Save.
*   **Mobile / Remote Device Connection Errors**: If Torrenta works on your computer, but visiting `http://<your-pc-ip>:3000` on your mobile phone shows "Disconnected from qbittorrent", it is because your phone's browser **does not have a valid login session (cookie) yet**. Open the settings panel on your phone, **leave the "Connection URL" field completely blank (do not enter your PC IP or port)**, enter your qBittorrent username and password, and click Save to establish the session.
*   **Delete LocalStorage**: If the settings page is unreachable, press **F12** in your browser, head to **Application -> Local Storage** -> select your host (e.g. `http://127.0.0.1:8080`), delete the key `torrenta_app_config`, and refresh the page.
*   **Host Header Verification**: Verify that `QBITTORRENT_HOST` in `docker-compose.yml` matches the port and address qBittorrent is listening on (usually `localhost:<port>`).

### Q2: qBittorrent WebUI says "Unacceptable file type, only regular file is allowed"?
*   **Directory Path Issue**: qBittorrent requires the folder path to contain a `public` subfolder. Point the path in qBittorrent settings to the parent directory `dist/` rather than directly to `dist/public/`.
