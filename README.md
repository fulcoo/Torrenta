# 🚀 Torrenta - Universal WebUI for Downloaders

Torrenta is a premium, client-side, headless web interface designed for downloaders (with native first-party adapter support for **qBittorrent** HTTP API v2, and upcoming support for Transmission and Aria2). 

Built with **Vue 3**, **TypeScript**, **Tailwind CSS**, and **DaisyUI**, it features high-performance non-blocking recursive polling, SVG telemetry speed charts, responsive layouts, glassmorphic themes, and desktop hover action shortcuts.

---

## 🛠️ Tech Stack
- **Framework:** Vue 3 (Composition API / SFC)
- **State Management:** Pinia
- **HTTP Client:** Axios
- **CSS Utility:** Tailwind CSS
- **Component Kit:** DaisyUI v4
- **Icon Set:** Lucide Vue Next

---

## 📦 Deployment & Setup Modes

### 1. Alternative WebUI Mode (Recommended - Zero CORS Issues)
Running Torrenta from the same origin as qBittorrent avoids browser security flags entirely.

1. Run standard compilation:
   ```bash
   npm run build
   ```
2. Copy the contents of the generated `dist/` directory onto your downloader host machine. (The project is configured to compile files into `dist/public/` to satisfy qBittorrent's Alternative WebUI folder requirements).
3. Open **qBittorrent**'s native settings console:
   - Go to **Tools** -> **Options** -> **Web UI**.
   - Check **Use alternative Web UI**.
   - Point the directory path to the folder containing your uploaded Torrenta `dist` files (e.g. `/path/to/dist`). **Do not** point it directly to the `public` folder; point it to the parent directory containing the `public` folder.
4. Refresh your WebUI page. Torrenta is now loaded, fully autodetecting connection parameters relative to the path.

---

### 2. Standalone Mode (Cross-Origin Setup)
If hosting Torrenta on a separate port or remote PWA domain (e.g. `http://localhost:5173` or `https://torrenta.example.com`), you must configure the browser and downloader endpoints:

#### A. Configure qBittorrent CORS Settings
To authorize cross-origin cookies and payloads, log in to your native qBittorrent interface and configure settings:
1. Go to **设置 (Settings)** -> **Web UI**.
2. Enable / check **"启用跨源资源共享 (CORS)" (Enable Cross-Origin Resource Sharing)**.
3. Add the domain where Torrenta is hosted to the CORS whitelist, or turn off **"验证 Web 用户界面主机标头" (Verify Web User Interface Host header)**.

#### B. SameSite Cookies Notice
qBittorrent relies on a session cookie (`SID`) to authenticate requests. When communicating across separate ports or domains:
- Browser security policies (**SameSite**) may block cross-origin session cookies.
- If requests fail, you should deploy Torrenta under the **Alternative WebUI Mode** (same host) or configure a Reverse Proxy (such as **Nginx**, **Nginx Proxy Manager**, or **Lucky**) to route both Torrenta frontend files and `/api/v2` downstream to the qBittorrent port under a single namespace domain.
