# 🚀 Torrenta - Beautiful WebUI for qBittorrent

<div align="center">
  <img src="torrenta.png" alt="Torrenta Preview" width="800" style="border-radius: 12px; margin: 16px 0;" />
  <p><b>A beautiful, easy-to-use, and lightweight WebUI client for qBittorrent.</b></p>
  <p>Featuring deep integration for <b>qBittorrent</b> (HTTP API v2) to deliver a fluid and modern torrenting dashboard.</p>

  <p>
    <a href="README_zh.md"><b>🇨🇳 中文说明 (Chinese README)</b></a> |
    <a href="doc/user_manual.md"><b>📖 User Manual</b></a> |
    <a href="doc/user_manual_zh.md"><b>📖 中文用户手册</b></a> |
    <a href="#-quick-start"><b>⚡ Quick Start</b></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Vue-3.x-4fc08d?style=flat-square&logo=vue.js" alt="Vue 3" />
    <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/DaisyUI-v4-5a0df8?style=flat-square&logo=daisyui" alt="DaisyUI" />
    <img src="https://img.shields.io/badge/Docker-Supported-2496ed?style=flat-square&logo=docker" alt="Docker" />
    <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
  </p>
</div>

---

## 🌟 Key Features

*   **✨ Premium Card-Based Layout**: Built using Vue 3, Tailwind CSS, and DaisyUI. Out-of-the-box support for beautiful Dark/Light themes, smooth micro-animations, and native multilingual support.
*   **📊 Real-time Telemetry Graph**: An SVG-based dynamic speed chart that tracks global upload and download speed fluctuations smoothly in real-time.
*   **⚡ High-Performance Non-blocking Polling**: Fine-tuned recursive API requests with a low memory footprint and high responsiveness, providing a much lower latency compared to default WebUIs.
*   **📱 Outstanding Mobile Support**: Fully responsive layouts. Sidebar menus, torrent cards, setting panes, and drawers are optimized for smartphones and tablets.
*   **🔒 Built-in Nginx Reverse Proxy**: Solves complex CORS and Browser SameSite Cookie restrictions out-of-the-box.

---

## ⚡ Why Docker Deployment is Unbelievably Simple

Traditional alternative WebUIs often require compiling files from source, copying them to specific folders, or configuring qBittorrent settings like CORS, SameSite Cookies, and Host Header Validation—which can lead to `403 Forbidden` or `CORS blocked` browser errors.

Torrenta's Docker deployment **removes all these barriers**:

1.  **Zero Build Configuration**: The multi-stage `Dockerfile` handles installation, dependency resolution, and asset compilation internally.
2.  **No CORS / SameSite Cookie issues**: Torrenta runs Nginx internally on port `3000`. By serving the static WebUI and proxying `/api/v2` requests under the same origin, the browser sees them as one entity, meaning no CORS config or SameSite blocks are triggered.
3.  **Automatic Header Spoofing**: Nginx automatically overrides the `Host`, `Referer`, and `Origin` headers to qBittorrent's internal address (e.g. `localhost:8081`). This bypasses qBittorrent's **Host Header Validation** and **CSRF protection** completely out-of-the-box!

---

## 🛠️ Tech Stack

*   **Frontend Core**: Vue 3 (Composition API / SFC)
*   **State Management**: Pinia
*   **HTTP Client**: Axios
*   **Styling**: Tailwind CSS + DaisyUI v4
*   **Icons**: Lucide Vue Next
*   **Deployment**: Docker (Nginx Alpine)

---

## ⚡ Quick Start

This is a quick start guide. For advanced topics like manual installation, alternate WebUI setups, and cron scripting for automatic updates, please read the 👉 **[Detailed User Manual](doc/user_manual.md)**.

### 🚀 Run natively on FeiniOS (fnOS) via FPK (Recommended for fnOS)

Torrenta natively supports **fnOS (FeiniOS)** through official `.fpk` application packages. You can install and manage Torrenta directly from the fnOS App Center with an interactive setup wizard:

1. **Download Package**: Grab the latest `torrenta-x.x.x.fpk` from [GitHub Releases](https://github.com/fulcoo/Torrenta/releases).
2. **Offline Install**:
   - Open **App Center** on your fnOS desktop -> Click **Install** / **Manual Install** in the top right corner.
   - Upload the `.fpk` file.
   - Follow the **graphical wizard** to customize your desired Torrenta WebUI port (Default: `18322`) and qBittorrent port (Default: `8080`).
3. **Security & Least Privilege**:
   - Torrenta strictly adheres to the **Principle of Least Privilege** (`run-as: package`), executing in an unprivileged sandbox user environment without requesting root permissions.
4. **Launch**: A desktop shortcut with official high-res icons will be created automatically. Click to open and enjoy!

> 💡 **Developer Build**: Run `npm run build:fpk` in the root folder to automate icon generation, frontend compilation, and FPK assembly (output saved in `release/`).

---

### ⚙️ qBittorrent Server Configuration Requirements

Due to qBittorrent 5.x removing default credentials and strictly enforcing **Host Header Validation** and **CSRF Protection**, we recommend the following setup options:

#### Option A: One-Liner Auto-Configuration Script (Recommended)
Run the following command in your terminal to automatically detect, backup, inject configurations, and restart qBittorrent:

```bash
bash <(curl -sSL https://raw.githubusercontent.com/fulcoo/Torrenta/main/scripts/auto_config_qb.sh)
```
> 💡 **Idempotent & Safe**: If your qBittorrent is already configured, the script detects it and exits immediately without making redundant changes or restarts.

#### Option B: Manual Configuration
Add the following settings to your `qBittorrent.conf` under `[Preferences]` (for Docker, modify `config/qBittorrent/qBittorrent.conf`):

```ini
[Preferences]
WebUI\HostHeaderValidation=false
WebUI\CSRFProtection=false
WebUI\LocalHostAuth=false
WebUI\AuthSubnetWhitelistEnabled=true
WebUI\AuthSubnetWhitelist=127.0.0.1/32, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12
```

> 💡 **Why these settings are recommended**:
> * `WebUI\HostHeaderValidation=false` & `WebUI\CSRFProtection=false`: Bypasses reverse proxy host checking, eliminating `401 Unauthorized` errors when accessed via NPM, domain proxies, or local reverse proxies.
> * `WebUI\LocalHostAuth=false`: Enables bypass of authentication for `127.0.0.1` loopback traffic, allowing Torrenta to connect smoothly without tracking ephemeral qB 5.x passwords.
>
> ⚠️ **Important**: Always **stop the qBittorrent container/service first** (e.g. `docker stop <container>`) before editing `qBittorrent.conf`. Otherwise, qBittorrent will overwrite your file with in-memory data upon shutdown!

---

### 🐳 Run via Docker

You can run Torrenta directly by pulling the official Docker image `fulcoo/torrenta:latest` from Docker Hub:

#### Option A: Docker Run (Fastest)
```bash
docker run -d \
  --name torrenta \
  -p 3000:80 \
  -e QBITTORRENT_URL=http://<your-qbittorrent-ip>:<your-qbittorrent-port-default-8080> \
  -e QBITTORRENT_HOST=<your-qbittorrent-ip>:<your-qbittorrent-port-default-8080> \
  --restart unless-stopped \
  fulcoo/torrenta:latest
```

#### Option B: Docker Compose
1. Ensure you have an existing qBittorrent instance running on your host machine or NAS.
2. The included [docker-compose.yml](docker-compose.yml) is preconfigured to use the official Docker Hub image `fulcoo/torrenta:latest`. Simply edit the variables:
   ```yaml
   environment:
     QBITTORRENT_URL: "http://host.docker.internal:<your-qbittorrent-port-default-8080>"  # Address Torrenta uses in the backend
     QBITTORRENT_HOST: "localhost:<your-qbittorrent-port-default-8080>"                  # Hostname/Port qBittorrent expects
   ```
3. Start Torrenta:
   ```bash
   docker compose up -d
   ```
4. Open `http://localhost:3000` in your web browser. Leave the connection address empty in Torrenta's setting drawer, and Nginx will handle the proxying automatically!

### 📂 Run via Alternative WebUI Mode (Natively in qBittorrent)

1. Compile the project files locally:
   ```bash
   npm install
   npm run build
   ```
2. Copy the generated `dist/` directory onto your qBittorrent host machine.
3. Go to qBittorrent WebUI settings:
   - Open **Tools** -> **Options** -> **Web UI**.
   - Check **Use alternative Web UI**.
   - Point the folder path to the parent directory containing the `public` folder (the `dist/` directory).
4. Refresh your qBittorrent WebUI tab in the browser.

---

## 🔄 Automatic Updates

*   **Docker Container**: Uncomment the `watchtower` container block in your `docker-compose.yml` to automatically poll and update the Torrenta container on new releases, or run:
    ```bash
    docker compose pull && docker compose up -d
    ```
*   **Alternative WebUI**: Set up a Cron task pointing to the included [update-torrenta.sh](update-torrenta.sh) script to poll the GitHub releases API and automatically pull/unzip the latest compiled package.

---

## 📄 License

This project is licensed under the MIT License.
