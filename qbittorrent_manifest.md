# 🚀 qBittorrent 业务逻辑与配置清单 (qBittorrent Business Logic & Settings Manifest)

本文档整理了 Torrenta 项目中接入 **qBittorrent** 的核心业务逻辑、功能清单，以及相关的系统配置项。

---

## 1. 架构与连接生命周期

项目通过适配器模式对底层下载器进行了封装和解耦。

* **适配器接口**: 所有的下载控制器遵循 [DownloaderAdapter](file:///d:/Project/VUE/Torrenta/src/services/adapters/interface.ts) 规范。
* **qBittorrent 适配器**: [QBittorrentAdapter](file:///d:/Project/VUE/Torrenta/src/services/adapters/qbittorrent.ts) 实现了 API 连接与数据映射，主要负责拼装符合 qBittorrent Web API v2 的 HTTP 请求。
* **拦截器与会话**:
  * [api.ts](file:///d:/Project/VUE/Torrenta/src/services/api.ts) 配置了 `withCredentials: true`。由于 qBittorrent 使用 Cookie Session 鉴权（`SID`），客户端请求必须携带凭证。
  * 请求拦截器动态地将 `localStorage` 中的 WebUI 地址转换并拼接为 `/api/v2`。
* **数据轮询**: 
  * [torrent.ts](file:///d:/Project/VUE/Torrenta/src/stores/torrent.ts) 启动一个递归轮询机制（默认间隔 1500ms），在连接正常的情况下，并发拉取种子列表和系统整体指标。

### 涉及的 qBittorrent Web API 接口
* **鉴权**: POST `/api/v2/auth/login` (使用 `x-www-form-urlencoded` 传递用户名和密码)。
* **全局信息**: GET `/api/v2/sync/maindata?rid=0` (拉取磁盘空间与全局速度)。
* **降级获取速率**: GET `/api/v2/transfer/info` (在 `maindata` 接口失败时，作降级获取传输信息用)。
* **种子列表**: GET `/api/v2/torrents/info` (获取全部种子详情)。
* **暂停**: POST `/api/v2/torrents/pause` (暂停种子)。
* **恢复**: POST `/api/v2/torrents/resume` (恢复种子)。
* **删除**: POST `/api/v2/torrents/delete` (删除种子及物理文件)。
* **添加**: POST `/api/v2/torrents/add` (添加链接或上传种子文件，支持表单配置各项高级参数)。

---

## 2. 核心业务功能清单

### 2.1 种子管理 (Torrent Management)
* **种子状态转换 (`mapStatus`)**:
  将 qBittorrent 内部复杂的状态（`state`）转换为前端统一的 6 种状态：
  * **下载中 (`downloading`)**: 对应原生 `downloading`、`stalledDL`、`forcedDL` 等。
  * **已暂停 (`paused`)**: 对应原生 `pausedDL`、`pausedUL` 等。
  * **做种中 (`seeding`)**: 对应原生 `stalledUL`、`uploading`、`forcedUP` 等。
  * **校验中 (`checking`)**: 对应原生 `checkingDL`、`checkingUL`、`checkingResumeData`。
  * **错误 (`error`)**: 对应原生 `error`、`missingFiles`。
  * **排队中 (`queued`)**: 对应原生 `queuedDL`、`queuedUL`。
* **暂停操作**:
  * 支持单个种子暂停。
  * 支持勾选多个种子批量暂停。
  * 支持“暂停所有” (`pauseAll`) 一键操作。
* **恢复/开始操作**:
  * 支持单个种子恢复。
  * 支持勾选多个种子批量恢复。
  * 支持“恢复所有” (`resumeAll`) 一键操作。
* **删除操作**:
  * 支持单个或批量删除。
  * 提供安全确认弹窗。
  * 可配置是否勾选 **"同时删除磁盘上的实际下载文件" (deleteFiles)**。
* **添加种子操作**:
  * 支持输入 HTTP 链接或磁力链接（多行），以及直接拖拽/选择上传本地多个 `.torrent` 种子文件。
  * 支持设置各种可选的高级下载参数：配置下载保存路径 (`savepath`)、分类目录 (`category`)、是否启动时暂停 (`paused`)、是否跳过哈希校验 (`skip_checking`)、是否顺序下载 (`sequentialDownload`)、以及是否优先下载首尾文件块 (`firstLastAsStream`)。

### 2.2 监控与统计 (Telemetry & Stats)
* **实时全局上传与下载速度**: 通过顶栏及趋势波形图（[SpeedChart](file:///d:/Project/VUE/Torrenta/src/components/SpeedChart.vue)）展示瞬时传输效率。
* **磁盘空间监控**: 实时显示当前下载路径所在磁盘的剩余空间。
* **活跃种子总数**: 监控当前在下载器中的种子总量。

### 2.3 分类标签 (Category Management)
* **读取分类**: 解析各种子携带的 `category` 属性在侧边栏聚合分类列表。
* **自定义分类**: 
  * 允许手动新增自定义分类，存放在本地 LocalStorage 的 `torrenta_custom_categories` 中。
  * 允许移除自定义分类。

### 2.4 过滤、检索与排序
* **状态过滤**: 侧边栏支持按状态（下载中、做种中、校验中、排队中、已暂停、错误、全部）快速筛选。
* **文本检索**: 支持针对种子名称（`name`）进行客户端实时模糊搜索。
* **维度排序**: 支持按文件名、大小、进度、下载速度、上传速度、分享率、ETA 进行升序/降降序排列。

---

## 3. 设置项清单

### 3.1 客户端侧边菜单布局 (Store / LocalStorage)
设置页面采用侧边菜单进行分类聚合（由 [Settings.vue](file:///d:/Project/VUE/Torrenta/src/views/Settings.vue) 渲染，[app.ts](file:///d:/Project/VUE/Torrenta/src/stores/app.ts) 管理）：

* **Connection (连接设置)**:
  * **Downloader Client Type (下载器类型)**: 目前支持 `qbittorrent`，未来规划支持 `transmission` 和 `aria2`。
  * **WebUI Address / Connection URL (连接地址)**: 格式如 `http://192.168.1.100:8080`。留空则代表 **Auto-Detect（自动检测）**，相对路径为 `/api/v2`，避免跨域。
  * **Credentials (凭证)**: 用户名 (`username`) 与密码 (`password`) 登录凭证。
  * **提示提醒整合**: 原有关于部署及跨域的 Standard WebUI 提醒、Standalone CORS 提示及 SameSite Cookie 限制警告已全部收纳合并入本设置菜单。
* **Categories (分类与目录)**:
  * **按分类重构下载目录**: 彻底改变了原扁平的下载路径清单，支持在不同 **Category (分类)** 下关联配置多个下载保存路径（例如 `Movies` 分类对应 `/downloads/movies1`、`/downloads/movies2` 等）。
  * **种子添加智能适配**:
    * 在添加种子时选择分类，下载路径会自动过滤并只显示该分类下配置的路径，并默认选择该分类配置的第一个下载路径。
    * 若选择 **"No Category (未分类)"**，则允许用户在表单里手动输入自定义的下载路径。数据持久化于 `torrenta_category_configs` 浏览器 LocalStorage 中。
* **General (常规设置)**:
  * **UI Custom Themes (界面主题)**: 基于 DaisyUI 提供的 20 套主题风格（如 luxury, cyberpunk, dracula 等），可实时预览和切换。

### 3.2 qBittorrent 服务端相关配置项
为确保与 qBittorrent 顺利通信并规避浏览器的同源策略限制，需注意官方客户端内的以下设置：
* **启用替代 Web UI (Use alternative Web UI)**:
  * 位于 qBittorrent 设置 -> Web UI。
  * 勾选并指向本项目打包编译后的 `dist` 目录（打包产物会自动输出至 `dist/public` 以满足 qBittorrent 的文件夹结构要求，填写路径时请指向 `dist` 目录本身，**不要**直接指向其中的 `public` 文件夹）。使用该部署方式可以完全免除 CORS 和 SameSite Cookie 的烦恼。
* **启用跨源资源共享 (CORS) (Enable Cross-Origin Resource Sharing)**:
  * 若前端页面（如开发环境 `localhost:5173`）与 qBittorrent 处于不同端口或域名下，必须勾选此项并将前端地址加入允许列表，否则跨域请求会被浏览器拦截。
* **验证 Web 用户界面主机标头 (Verify Web User Interface Host header)**:
  * 跨域时为避免因主机标头校验不匹配被拒绝，需要确保此设置已配置或关闭。
* **SameSite / Cookie 传输**:
  * qBittorrent WebUI 在跨域非 HTTPS 下可能无法读取/发送 Session Cookie。如需使用独立托管，推荐通过 Nginx / NPM 配置反向代理，将前端与 `/api/v2` 代理至同一 Host。
