# 📖 Torrenta 安装与使用手册 (User Manual)

本手册详细介绍了 Torrenta 的各种部署模式、配置选项以及如何实现自动更新。

---

## 🚀 目录
1. [Docker 模式（推荐 - 零跨域/零Cookie配置）](#1-docker-模式推荐---零跨域零cookie配置)
2. [备用 WebUI 模式（同源原生整合）](#2-备用-webui-模式同源原生整合)
3. [独立跨源模式（Standalone Mode）](#3-独立跨源模式standalone-mode)
4. [自动更新设置](#4-自动更新设置)
5. [常见问题与排错（FAQ）](#5-常见问题与排错faq)

---

## 1. Docker 模式（推荐 - 零跨域/零Cookie配置）

通过 Docker 容器化部署是使用 Torrenta 最简单、最稳健的方式。我们在容器内内置了 Nginx 反向代理，将静态前端文件与 API 后台合并到单一来源（同一端口），**完美绕过了浏览器的 CORS 拦截和 SameSite Cookie 限制**。

### ⚙️ 配置文件说明
- **`Dockerfile`**：多阶段构建文件。先在 Node 容器中编译 Vue 3 前端，然后将其拷贝到极速的 Nginx 容器中。
- **`nginx.conf.template`**：Nginx 反向代理配置模板。会自动读取环境变量，代理 `/api/v2/` 路径至 qBittorrent，并自动改写 Origin/Referer 以伪装成 qBittorrent 本地请求。
- **`docker-compose.yml`**：用于一键部署的 Compose 模板。其中，**服务端口配置** 位于 `ports` 字段（默认为 `3000:80`，指将宿主机的 `3000` 端口映射到容器的 `80` 端口。如果您需要更改访问端口，只需将 `3000` 修改为宿主机的其他空闲端口即可，冒号后的 `80` 请保持不变）。

### 📝 部署步骤
1. 打开 [docker-compose.yml](../docker-compose.yml)。
2. 配置环境变量：
   - **`QBITTORRENT_URL`**：Torrenta 容器连接 qBittorrent 服务的内部地址（如宿主机上的 `http://host.docker.internal:8080` 或同网络容器名 `http://qbittorrent:8080`，其中 `8080` 请替换为您的 qBittorrent WebUI 端口）。
   - **`QBITTORRENT_HOST`**：qBittorrent 期望在 Host 标头中看到的域名和端口。必须设为 qBittorrent 实际运行的地址（如 `localhost:8080` 或 `127.0.0.1:8080`，其中 `8080` 请替换为您的 qBittorrent WebUI 端口），用以通过 qBittorrent 的 **主机标头验证 (Host Header Validation)**。
   - **`QBITTORRENT_USER`**（可选）：您的 qBittorrent WebUI 登录用户名。配置后，网页将在打开时自动静默登录。
   - **`QBITTORRENT_PASS`**（可选）：您的 qBittorrent WebUI 登录密码。配置后，网页将在打开时自动静默登录。
3. 启动容器：
   ```bash
   docker compose up -d --build
   ```
4. 访问 `http://localhost:3000`（或您映射的端口）。
5. **重要**：在 Torrenta 的设置中，**保持“连接地址”为空**。Nginx 会自动代理相对路径 `/api/v2`，直接建立连接。如果配置了 `QBITTORRENT_USER` 和 `QBITTORRENT_PASS`，应用在启动时会自动读取并完成静默登录，免去手动输入凭据的步骤。

---

## 2. 备用 WebUI 模式（同源原生整合）

如果您不想运行单独的网页容器，可以将 Torrenta 编译为静态文件，直接作为 qBittorrent 的备选 UI。

### 📝 部署步骤
1. 在本地或开发环境编译项目：
   ```bash
   npm install
   npm run build
   ```
   这将在根目录下生成 `dist/` 文件夹（其中核心静态文件编译在 `dist/public/`）。
2. 将整个 `dist/` 文件夹拷贝到安装了 qBittorrent 的服务器本地路径下（例如 `/share/WebUI/torrenta`）。
3. 打开 qBittorrent 原生设置：
   - 导航至 **工具** -> **选项** -> **Web UI**。
   - 勾选 **使用备用 Web UI (Use alternative Web UI)**。
   - 在文件夹路径中填入刚才上传的 `dist` 目录（**注意**：请指向 `dist` 目录，而不是里面的 `public` 文件夹）。
4. 刷新 qBittorrent 的 WebUI 页面，即可直接加载 Torrenta。

---

## 3. 独立跨源模式（Standalone Mode）

如果您将 Torrenta 托管在一个单独的静态网页服务器（如 GitHub Pages、Cloudflare Pages 或其他独立端口）上，需要进行跨域适配。

### ⚠️ 注意事项
*   **跨域配置 (CORS)**：您必须登录 qBittorrent WebUI，在“设置” -> “Web UI” 中启用 **“启用跨源资源共享 (CORS)”**，并将 Torrenta 的域名加入白名单，或者关闭 **“验证 Web 用户界面主机标头”**。
*   **SameSite Cookie 限制**：由于主流浏览器默认拦截跨站的 Session Cookie，如果您使用的是跨域名/跨端口方式（如 `http://localhost:5173` 访问 `http://localhost:8080`），登录会话 Cookie (`SID`) 可能会被浏览器拦截导致请求反复失败。**因此，更推荐使用 [Docker 模式](#1-docker-模式推荐---零跨域零cookie配置) 或 [备用 WebUI 模式](#2-备用-webui-模式同源原生整合)**。

---

## 4. 自动更新设置

### 🐳 A. Docker 模式自动更新
- **方法一：使用 Watchtower（全自动）**
  在 `docker-compose.yml` 中启用 `watchtower` 容器（取消注释相关行）。Watchtower 会周期性检查镜像库，有新镜像发布时自动完成更新并拉起容器。
- **方法二：手动一键更新命令**
  进入项目目录，执行：
  ```bash
  docker compose pull && docker compose up -d
  ```

### 📂 B. 备用 WebUI 模式自动更新 (GitHub 轮询脚本)
我们为本地文件夹部署的用户提供了一个轻量级自动更新脚本 [update-torrenta.sh](../update-torrenta.sh)。

1. 用文本编辑器打开该脚本，修改配置区域的路径：
   - `REPO`：保持默认或指向您的 GitHub 分支。
   - `WEBUI_DIR`：指向您在 qBittorrent 中配置的备选 WebUI 的 parent 路径。
2. 赋予脚本执行权限：
   ```bash
   chmod +x update-torrenta.sh
   ```
3. 在宿主机中添加 Cron 任务（如每天凌晨 1 点执行一次）：
   ```bash
   0 1 * * * /path/to/update-torrenta.sh
   ```
   脚本会对比 GitHub API 上的最新 tag 与本地 `version.txt`。若有更新，会自动下载最新 Release Zip 覆盖解压并保存版本标记。

---

## 5. 常见问题与排错（FAQ）

### Q1：页面一直显示“未连接 (Disconnected)”或返回 403 Forbidden？
*   **检查网页设置**：如果您使用的是 Docker 代理模式，请点击 Torrenta 页面侧边栏的“设置”，检查 **连接地址 (Connection URL)**。如果里面有内容（例如 `http://127.0.0.1:8081`），**必须将其全部删除清空**并保存。
*   **手机等其他局域网设备连接报错**：如果您在电脑本地访问正常，但用手机浏览器访问 `http://电脑IP:3000` 提示“未连接到 qbittorrent”，这是因为手机浏览器**尚未建立登录会话 (Cookie)**。请在手机端打开设置面板，**保持“连接地址”完全留空（不要填任何内容）**，仅填入 qBittorrent 的用户名和密码并保存，即可建立会话连接。
*   **清除 LocalStorage 缓存**：如果您因报错进不去设置页面，请在浏览器中按 **F12** 键，在开发者工具的 **Application (应用) -> Local Storage (本地存储)** 里将 `torrenta_app_config` 清除并刷新页面。
*   **主机标头检查**：确认 [docker-compose.yml](../docker-compose.yml) 中的 `QBITTORRENT_HOST` 与您的 qBittorrent 监听地址和端口一致（通常为 `localhost:端口`）。

### Q2：提示 "Unacceptable file type, only regular file is allowed"？
*   **路径指向错误**：qBittorrent 要求备用 UI 的路径指向必须包含 `public` 文件夹。请确保您的路径配置的是 `dist/`（即 `public` 的父目录），而不是直接指向 `dist/public/`。



