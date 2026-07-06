# 🚀 Torrenta - 适用于下载器的通用 WebUI 客户端

<div align="center">
  <img src="torrenta.png" alt="Torrenta Preview" width="800" style="border-radius: 12px; margin: 16px 0;" />
  <p><b>高颜值、响应式、轻量级的通用下载器 Web 客户端</b></p>
  <p>支持 <b>qBittorrent</b> (HTTP API v2) 深度整合，Transmission & Aria2 适配筹备中</p>
  <p>
    <a href="README.md"><b>English README</b></a> |
    <a href="doc/user_manual_zh.md"><b>📖 官方安装与使用手册</b></a> |
    <a href="#-💡-快速开始"><b>⚡ 快速开始</b></a>
  </p>
</div>

---

## 🌟 核心特性 (Key Features)

- **✨ 极简高级设计**：基于 Vue 3 + Tailwind CSS + DaisyUI 构建，采用现代卡片式布局与优雅微动画，适配深色/浅色模式，多语言原生支持。
- **📊 实时遥测图表**：内置高性能 SVG 实时双向速度图表，直观展示全局上传/下载流量波动。
- **⚡ 高性能非阻塞**：采用精细化的高频非阻塞递归轮询机制，相比传统 WebUI 更低延迟、极低系统资源占用。
- **📱 完美移动端支持**：所有菜单与操作面板均经过移动端专门适配，手机或平板操作得心应手。
- **🔒 零配置代理整合**：内置 Nginx 多种端口自适应规则，支持 Host/Origin 请求头自动重写，规避浏览器 CORS 及 SameSite 拦截保护。

---

## 🛠️ 技术栈 (Tech Stack)

*   **框架**：Vue 3 (Composition API / SFC)
*   **状态管理**：Pinia
*   **网络请求**：Axios
*   **样式体系**：Tailwind CSS + DaisyUI v4
*   **图标集**：Lucide Vue Next
*   **运行环境**：Node 20+ / Docker (Nginx Alpine)

---

## ⚡ 💡 快速开始 (Quick Start)

这里是极简启动指南。如需查看完整的 **CORS 跨域排错**、**本地备用 WebUI 安装** 或 **定时自动更新脚本配置**，请参阅 👉 **[详细安装与使用手册](doc/user_manual_zh.md)**。

### 🐳 使用 Docker 一键运行（推荐）

1. 确认您已有一个正在运行的 qBittorrent。
2. 打开并编辑 [docker-compose.yml](docker-compose.yml)，修改环境变量：
   ```yaml
   environment:
     - QBITTORRENT_URL=http://host.docker.internal:8081  # qBittorrent 的 WebUI 访问地址
     - QBITTORRENT_HOST=localhost:8081                  # qBittorrent 期待的主机标头 (Host)
   ```
3. 在终端中启动：
   ```bash
   docker compose up -d
   ```
4. 访问 `http://localhost:3000` 即可开始使用！

### 📂 备用 WebUI 编译模式

1. 运行编译命令：
   ```bash
   npm install
   npm run build
   ```
2. 将生成的整个 `dist/` 文件夹复制到您的 qBittorrent 服务器。
3. 打开 qBittorrent 的设置（Web UI），启用“使用备用 Web UI”，指向该 `dist/` 文件夹的路径（包含 `public` 的父目录）。
4. 刷新网页即可。

---

## 🔄 自动更新 (Auto Updates)

- **Docker 容器**：在 `docker-compose.yml` 中启动 `watchtower` 实现容器自动检测并无缝拉取最新版本；或者定期运行 `docker compose pull && docker compose up -d`。
- **备选 WebUI**：使用本项目提供的 [update-torrenta.sh](update-torrenta.sh) 自动化更新脚本，只需配合 Cron 即可每日自动拉取 GitHub 上的最新 Release 静态包并进行覆盖更新。

---

## 📄 开源协议 (License)

本项目基于 MIT 协议开源。
