# API Endpoints Documentation

This document provides a comprehensive overview of the Web API endpoints exposed by qBittorrent's Web UI. All endpoints follow the base pattern:

```
/api/v2/<scope>/<action>
```

- **Scope**: The controller handling the request (derived from the controller file name).
- **Action**: The method name without the `Action` suffix.

Below you will find detailed information for the **auth** and **app** scopes, including HTTP method, required parameters, and response format.

---

## Auth Scope (`auth`)

| HTTP Method | Endpoint | Parameters | Description | Response |
|-------------|----------|------------|-------------|----------|
| **POST** | `/api/v2/auth/login` | `username` (string, required)<br>`password` (string, required) | Authenticates a user. On success, a session cookie (or API key) is set. | `200 OK` with empty body on success; `401 Unauthorized` on failure. |
| **GET** | `/api/v2/auth/logout` | *None* | Terminates the current session and clears authentication cookies. | `200 OK` with empty body. |

**Notes**:
- The `login` endpoint is declared as a **public API**, meaning it can be called without an existing session.
- All other endpoints require a valid session cookie or a valid API key.

---

## App Scope (`app`)

The `app` scope provides information about the qBittorrent application and allows manipulation of global settings.

| HTTP Method | Endpoint | Parameters | Description | Response |
|-------------|----------|------------|-------------|----------|
| **GET** | `/api/v2/app/webapiVersion` | *None* | Returns the version of the Web API. | JSON string, e.g., `"2.9.0"`. |
| **GET** | `/api/v2/app/version` | *None* | Returns the qBittorrent application version. | JSON string, e.g., `"4.5.5"`. |
| **GET** | `/api/v2/app/buildInfo` | *None* | Provides detailed build information (Qt version, libtorrent version, platform, etc.). | JSON object with fields such as `qt`, `libtorrent`, `boost`, `openssl`, `zlib`, `bitness`, `platform`. |
| **GET** | `/api/v2/app/processInfo` | *None* | Returns process‑level information such as launch time. | JSON object, e.g., `{ "launch_time": 1697041234 }`. |
| **POST** | `/api/v2/app/shutdown` | *None* | Requests the application to shut down gracefully. The response is sent before the process exits. | Empty `200 OK`. |
| **GET** | `/api/v2/app/preferences` | *None* | Retrieves the current application preferences. | JSON object containing all configurable settings (see source for full list). |
| **POST** | `/api/v2/app/setPreferences` | `json` (object, required) | Updates application preferences. The body must be a JSON object where keys correspond to preference fields. | Empty `200 OK`. |
| **GET** | `/api/v2/app/defaultSavePath` | *None* | Returns the default directory where torrents are saved. | JSON string path. |
| **POST** | `/api/v2/app/sendTestEmail` | `email` (string, optional) – the target address; other mail settings are taken from preferences. | Sends a test email using the current mail configuration. | Empty `200 OK` on success, error JSON on failure. |
| **GET** | `/api/v2/app/getDirectoryContent` | `path` (string, optional) – directory to list (defaults to root of download folder). | Lists files and folders within the specified directory. | JSON array of objects `{ "name": "...", "type": "folder|file", "size": <bytes>, "creation_date": <timestamp>, ... }`. |
| **GET** | `/api/v2/app/getFreeSpaceAtPath` | `path` (string, required) – directory path. | Returns the amount of free disk space at the given path. | JSON number representing bytes free. |
| **GET** | `/api/v2/app/cookies` | *None* | Retrieves stored WebUI cookies. | JSON array of cookie objects. |
| **POST** | `/api/v2/app/setCookies` | `json` (array, required) – list of cookie objects. | Replaces the current set of WebUI cookies. | Empty `200 OK`. |
| **POST** | `/api/v2/app/rotateAPIKey` | *None* | Generates a new API key for the WebUI and returns it. | JSON string containing the new API key. |
| **POST** | `/api/v2/app/deleteAPIKey` | *None* | Revokes the current API key. | Empty `200 OK`. |
| **GET** | `/api/v2/app/networkInterfaceList` | *None* | Returns a list of network interfaces available on the host. | JSON array of interface names. |
| **GET** | `/api/v2/app/networkInterfaceAddressList` | `iface` (string, required) – interface identifier. | Returns IP addresses associated with the specified interface. | JSON array of address strings. |

**General notes for the `app` scope**:
- Most **GET** endpoints are read‑only and return JSON data.
- **POST** endpoints that modify state usually require the `json` parameter containing a JSON‑encoded payload.
- Responses are always JSON unless explicitly documented as an empty body.
- Errors are returned as JSON objects with an `error` field and proper HTTP status codes.

---

## ClientData Scope (`clientdata`)

The `clientdata` scope allows WebUI clients to store custom settings and persistent states.

| HTTP Method | Endpoint | Parameters | Description | Response |
|-------------|----------|------------|-------------|----------|
| **GET** / **POST** | `/api/v2/clientdata/load` | `keys` (string, optional) – JSON-serialized array of strings representing keys to load. | Retrieves stored client data. If `keys` is omitted, all client data is returned. | JSON object containing requested key-value pairs. |
| **POST** | `/api/v2/clientdata/store` | `data` (string, required) – JSON-serialized object containing settings key-value pairs to store. | Stores client-specific configuration. | Empty `200 OK` on success; `409 Conflict` on error. |

---

## Log Scope (`log`)

The `log` scope provides access to application messages and peer blocking events logs.

| HTTP Method | Endpoint | Parameters | Description | Response |
|-------------|----------|------------|-------------|----------|
| **GET** / **POST** | `/api/v2/log/main` | `normal` (bool, optional, default: `true`) – Include normal logs.<br>`info` (bool, optional, default: `true`) – Include info logs.<br>`warning` (bool, optional, default: `true`) – Include warning logs.<br>`critical` (bool, optional, default: `true`) – Include critical logs.<br>`last_known_id` (int, optional, default: `-1`) – Exclude logs with ID <= this value. | Returns a list of application log messages. | JSON array of log message objects. |
| **GET** / **POST** | `/api/v2/log/peers` | `last_known_id` (int, optional, default: `-1`) – Exclude logs with ID <= this value. | Returns logs of banned or blocked peers. | JSON array of peer log objects. |

### Example Log Response (Application Log)
```json
[
  {
    "id": 1,
    "timestamp": 1697041234,
    "type": 2,
    "message": "qBittorrent v4.6.0 started successfully."
  }
]
```
*(Types: `1` = Normal, `2` = Info, `4` = Warning, `8` = Critical)*

---

## RSS Scope (`rss`)

The `rss` scope manages RSS folder hierarchies, subscription feeds, and automated torrent download rules.

| HTTP Method | Endpoint | Parameters | Description | Response |
|-------------|----------|------------|-------------|----------|
| **POST** | `/api/v2/rss/addFolder` | `path` (string, required) – Full folder path, e.g., `Movies/Sci-Fi`. | Creates a new RSS folder path. | Empty `200 OK`. |
| **POST** | `/api/v2/rss/addFeed` | `url` (string, required) – RSS feed URL.<br>`path` (string, required) – Destination path or folder.<br>`refreshInterval` (int, optional) – Custom refresh interval in seconds. | Subscribes to a new RSS feed. | Empty `200 OK`. |
| **POST** | `/api/v2/rss/setFeedURL` | `path` (string, required) – Feed path.<br>`url` (string, required) – New URL of the RSS feed. | Updates the source URL of a subscription. | Empty `200 OK`. |
| **POST** | `/api/v2/rss/setFeedRefreshInterval` | `path` (string, required) – Feed path.<br>`refreshInterval` (int, required) – Refresh interval in seconds. | Sets refresh interval of a feed. | Empty `200 OK`. |
| **POST** | `/api/v2/rss/removeItem` | `path` (string, required) – Path of the feed/folder to delete. | Deletes a folder or feed. | Empty `200 OK`. |
| **POST** | `/api/v2/rss/moveItem` | `itemPath` (string, required) – Current item path.<br>`destPath` (string, required) – Target folder or destination path. | Moves/renames a folder or feed. | Empty `200 OK`. |
| **GET** / **POST** | `/api/v2/rss/items` | `withData` (bool, optional, default: `false`) – Set to `true` to return full articles list. | Retrieves folders, feeds, and articles tree. | JSON object tree representing the hierarchy. |
| **POST** | `/api/v2/rss/markAsRead` | `itemPath` (string, required) – Path of feed/folder.<br>`articleId` (string, optional) – GUID of specific article. | Marks a feed/folder or single article as read. | Empty `200 OK`. |
| **POST** | `/api/v2/rss/refreshItem` | `itemPath` (string, required) – Path of feed. | Manually triggers immediate refresh. | Empty `200 OK`. |
| **POST** | `/api/v2/rss/setRule` | `ruleName` (string, required) – Rule name.<br>`ruleDef` (string, required) – JSON-serialized download rule. | Creates or updates an auto-downloader rule. | Empty `200 OK`. |
| **POST** | `/api/v2/rss/renameRule` | `ruleName` (string, required) – Rule name.<br>`newRuleName` (string, required) – New name. | Renames an auto-downloader rule. | Empty `200 OK`. |
| **POST** | `/api/v2/rss/cloneRule` | `sourceName` (string, required) – Rule name.<br>`cloneName` (string, required) – Target name. | Clones an auto-downloader rule. | Empty `200 OK`. |
| **POST** | `/api/v2/rss/removeRule` | `ruleName` (string, required) – Rule name. | Deletes an auto-downloader rule. | Empty `200 OK`. |
| **GET** / **POST** | `/api/v2/rss/rules` | *None* | Retrieves all auto-downloader rules. | JSON object of rule names and definitions. |
| **GET** / **POST** | `/api/v2/rss/matchingArticles` | `ruleName` (string, required) – Rule name. | Gets list of articles matching specified rule. | JSON mapping of feed names to matching titles. |

---

## Search Scope (`search`)

The `search` scope handles concurrent torrent search engine operations and plugin management.

| HTTP Method | Endpoint | Parameters | Description | Response |
|-------------|----------|------------|-------------|----------|
| **POST** | `/api/v2/search/start` | `pattern` (string, required) – Query string.<br>`category` (string, required) – Category filter (e.g. `all`).<br>`plugins` (string, required) – `all`, `enabled`, or pipe-separated plugin names. | Starts a new search task. | JSON object with `id` of search job. |
| **POST** | `/api/v2/search/stop` | `id` (int, required) – Search task ID. | Stops a running search task. | Empty `200 OK`. |
| **GET** / **POST** | `/api/v2/search/status` | `id` (int, optional) – Search task ID. If 0 or omitted, status of all jobs is returned. | Retrieves status of search tasks. | JSON array of task status objects. |
| **GET** / **POST** | `/api/v2/search/results` | `id` (int, required) – Search task ID.<br>`limit` (int, optional) – Max results count.<br>`offset` (int, optional) – Start offset. | Returns matching torrent search results. | JSON object containing search status, result list, and total count. |
| **POST** | `/api/v2/search/delete` | `id` (int, required) – Search task ID. | Cancels search and removes task data. | Empty `200 OK`. |
| **POST** | `/api/v2/search/downloadTorrent` | `torrentUrl` (string, required) – Magnet or torrent URL.<br>`pluginName` (string, required) – Search engine plugin name. | Downloads and queues a search result. | Empty `200 OK`. |
| **GET** / **POST** | `/api/v2/search/plugins` | *None* | Lists all installed search plugins. | JSON array of plugin info objects. |
| **POST** | `/api/v2/search/installPlugin` | `sources` (string, required) – Pipe-separated URLs/paths of scripts. | Installs new search engine plugins. | Empty `200 OK`. |
| **POST** | `/api/v2/search/uninstallPlugin` | `names` (string, required) – Pipe-separated plugin names. | Uninstalls search engine plugins. | Empty `200 OK`. |
| **POST** | `/api/v2/search/enablePlugin` | `names` (string, required) – Pipe-separated plugin names.<br>`enable` (bool, required) – `true` or `false`. | Enables or disables plugins. | Empty `200 OK`. |
| **POST** | `/api/v2/search/updatePlugins` | *None* | Triggers background search plugin updates. | Empty `200 OK`. |

---

## Sync Scope (`sync`)

The `sync` scope provides real-time state synchronization for the WebUI.

| HTTP Method | Endpoint | Parameters | Description | Response |
|-------------|----------|------------|-------------|----------|
| **GET** / **POST** | `/api/v2/sync/maindata` | `rid` (int, required) – Last response ID received by the client (0 for full update). | Synchronizes main database (torrents, categories, tags, server state). | JSON sync delta object. |
| **GET** / **POST** | `/api/v2/sync/torrentPeers` | `hash` (string, required) – Torrent ID.<br>`rid` (int, required) – Last response ID received by client. | Synchronizes connected peers list for a single torrent. | JSON sync delta object. |

---

## TorrentCreator Scope (`torrentcreator`)

The `torrentcreator` scope handles local file/directory torrent creation tasks.

| HTTP Method | Endpoint | Parameters | Description | Response |
|-------------|----------|------------|-------------|----------|
| **POST** | `/api/v2/torrentcreator/addTask` | `sourcePath` (string, required) – Target local directory or file path.<br>`torrentFilePath` (string, optional) – Output path.<br>`pieceSize` (int, optional) – Size (bytes, e.g., `262144`).<br>`ignoreDotfiles` (bool, optional, default: `true`).<br>`private` (bool, optional, default: `false`).<br>`format` (string, optional) – `v1`, `v2`, or `hybrid` (Qt6).<br>`optimizeAlignment` (bool, optional).<br>`comment`/`source` (string, optional).<br>`trackers`/`urlSeeds` (string, optional) – Pipe-separated URLs.<br>`startSeeding` (bool, optional). | Submits a new torrent creation job. | JSON object with `taskID`. |
| **GET** / **POST** | `/api/v2/torrentcreator/status` | `taskID` (string, optional) – Task ID. If omitted, returns all tasks. | Retrieves status of creation tasks. | JSON array of creation task status objects. |
| **GET** / **POST** | `/api/v2/torrentcreator/torrentFile` | `taskID` (string, required) – Task ID. | Downloads generated `.torrent` binary. | Binary attachment of the created torrent file. |
| **POST** | `/api/v2/torrentcreator/deleteTask` | `taskID` (string, required) – Task ID. | Deletes task metadata and history. | Empty `200 OK`. |

---

## Torrents Scope (`torrents`)

The `torrents` scope represents the core functionality of qBittorrent, providing control over downloads, categories, tags, webseeds, queue priorities, files, and limits.

### Querying Torrents

| HTTP Method | Endpoint | Parameters | Description | Response |
|-------------|----------|------------|-------------|----------|
| **GET** / **POST** | `/api/v2/torrents/count` | *None* | Returns total count of torrents in session. | Plain text integer count. |
| **GET** / **POST** | `/api/v2/torrents/info` | `hashes` (string, optional) – Pipe-separated torrent IDs.<br>`filter` (string, optional) – `all`, `downloading`, `completed`, `paused`, `active`, etc. | Lists details of torrents matching filters. | JSON array of serialized torrent info objects. |
| **GET** / **POST** | `/api/v2/torrents/properties` | `hash` (string, required) – Torrent ID. | Returns static and runtime properties of a torrent. | JSON object containing torrent properties. |
| **GET** / **POST** | `/api/v2/torrents/files` | `hash` (string, required) – Torrent ID. | Returns files and priority details of a torrent. | JSON array of file info objects. |
| **GET** / **POST** | `/api/v2/torrents/pieceHashes` | `hash` (string, required) – Torrent ID. | Returns SHA-1 hashes of torrent pieces. | JSON array of piece hashes strings. |
| **GET** / **POST** | `/api/v2/torrents/pieceStates` | `hash` (string, required) – Torrent ID. | Returns download state of torrent pieces. | JSON array of states: `0` (not downloaded), `1` (downloading), `2` (downloaded). |
| **GET** / **POST** | `/api/v2/torrents/pieceAvailability` | `hash` (string, required) – Torrent ID. | Returns availability coefficient of torrent pieces. | JSON array of floating numbers. |

### Adding & Deleting Torrents

| HTTP Method | Endpoint | Parameters | Description | Response |
|-------------|----------|------------|-------------|----------|
| **POST** | `/api/v2/torrents/add` | `urls` (string, optional) – New line-separated URL list.<br>`torrents` (multipart file, optional) – Local torrent files.<br>Many optional parameters (e.g. `savepath`, `category`, `tags`, `sequentialDownload`, `stopped`). | Adds a new torrent from local files or URLs. | Empty `200 OK` on success; `400 Bad Request` on failure. |
| **POST** | `/api/v2/torrents/delete` | `hashes` (string, required) – Pipe-separated torrent IDs.<br>`deleteFiles` (bool, required) – Delete downloaded data. | Deletes one or more torrents. | Empty `200 OK`. |

### Torrent Action Control

| HTTP Method | Endpoint | Parameters | Description | Response |
|-------------|----------|------------|-------------|----------|
| **POST** | `/api/v2/torrents/start` | `hashes` (string, required) – Pipe-separated torrent IDs. | Resumes/starts torrents. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/stop` | `hashes` (string, required) – Pipe-separated torrent IDs. | Pauses/stops torrents. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/recheck` | `hashes` (string, required) – Pipe-separated torrent IDs. | Triggers hash recheck for torrents. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/reannounce` | `hashes` (string, required) – Pipe-separated torrent IDs. | Forces reannounce to trackers. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/rename` | `hash` (string, required) – Torrent ID.<br>`name` (string, required) – New name. | Renames torrent display name. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/setComment` | `hash` (string, required) – Torrent ID.<br>`comment` (string, required) – Text comment. | Sets comment text. | Empty `200 OK`. |

### Category & Tag Management

| HTTP Method | Endpoint | Parameters | Description | Response |
|-------------|----------|------------|-------------|----------|
| **POST** | `/api/v2/torrents/setCategory` | `hashes` (string, required) – Torrent IDs.<br>`category` (string, required) – Category name. | Assigns category to torrents. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/createCategory` | `category` (string, required) – Category name.<br>`savePath` (string, optional) – Category save directory. | Creates a new category. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/editCategory` | `category` (string, required) – Category name.<br>`savePath` (string, required) – New save path. | Updates category directory path. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/removeCategories` | `categories` (string, required) – Newline-separated list. | Deletes categories. | Empty `200 OK`. |
| **GET** / **POST** | `/api/v2/torrents/categories` | *None* | Lists all categories. | JSON object map. |
| **POST** | `/api/v2/torrents/addTags` | `hashes` (string, required) – Torrent IDs.<br>`tags` (string, required) – Comma-separated list. | Adds tags to torrents. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/setTags` | `hashes` (string, required) – Torrent IDs.<br>`tags` (string, required) – Comma-separated list. | Sets/replaces tags of torrents. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/removeTags` | `hashes` (string, required) – Torrent IDs.<br>`tags` (string, required) – Comma-separated list. | Removes tags from torrents. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/createTags` | `tags` (string, required) – Comma-separated list. | Creates new tags in database. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/deleteTags` | `tags` (string, required) – Comma-separated list. | Deletes tags. | Empty `200 OK`. |
| **GET** / **POST** | `/api/v2/torrents/tags` | *None* | Lists all database tags. | JSON array of strings. |

### Trackers & Web Seeds

| HTTP Method | Endpoint | Parameters | Description | Response |
|-------------|----------|------------|-------------|----------|
| **GET** / **POST** | `/api/v2/torrents/trackers` | `hash` (string, required) – Torrent ID. | Returns torrent trackers list. | JSON array of tracker objects. |
| **POST** | `/api/v2/torrents/addTrackers` | `hash` (string, required) – Torrent ID.<br>`urls` (string, required) – Newline-separated list. | Adds trackers to a torrent. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/editTracker` | `hash` (string, required) – Torrent ID.<br>`origUrl` (string, required) – Original URL.<br>`newUrl` (string, required) – New URL. | Updates tracker URL. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/removeTrackers` | `hash` (string, required) – Torrent ID.<br>`urls` (string, required) – Pipe-separated list. | Removes trackers from a torrent. | Empty `200 OK`. |
| **GET** / **POST** | `/api/v2/torrents/webseeds` | `hash` (string, required) – Torrent ID. | Lists HTTP web seeds of a torrent. | JSON array of web seed objects. |
| **POST** | `/api/v2/torrents/addWebSeeds` | `hash` (string, required) – Torrent ID.<br>`urls` (string, required) – Pipe-separated list. | Adds web seeds. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/editWebSeed` | `hash` (string, required) – Torrent ID.<br>`origUrl` (string, required) – Original URL.<br>`newUrl` (string, required) – New URL. | Updates web seed URL. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/removeWebSeeds` | `hash` (string, required) – Torrent ID.<br>`urls` (string, required) – Pipe-separated list. | Removes web seeds. | Empty `200 OK`. |

### Torrent Peers & Limits

| HTTP Method | Endpoint | Parameters | Description | Response |
|-------------|----------|------------|-------------|----------|
| **POST** | `/api/v2/torrents/addPeers` | `hashes` (string, required) – Torrent IDs.<br>`peers` (string, required) – Pipe-separated list of `IP:port`. | Manually connects peers to torrents. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/filePrio` | `hash` (string, required) – Torrent ID.<br>`id` (string, required) – Pipe-separated file indices.<br>`priority` (int, required) – `0` (do not download) to `7` (maximum). | Sets priorities of individual files. | Empty `200 OK`. |
| **GET** / **POST** | `/api/v2/torrents/uploadLimit` / `downloadLimit` | `hashes` (string, required) – Pipe-separated torrent IDs. | Gets upload/download speed limit of torrents. | JSON mapping of torrent ID to limit in bytes/sec. |
| **POST** | `/api/v2/torrents/setUploadLimit` / `setDownloadLimit` | `hashes` (string, required) – Torrent IDs.<br>`limit` (int, required) – Speed limit in bytes/sec. | Sets upload/download speed limit of torrents. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/setShareLimits` | `hashes` (string, required) – Torrent IDs.<br>`ratioLimit` (double, required), `seedingTimeLimit`/`inactiveSeedingTimeLimit` (int, required), `shareLimitsMode` (int, required). | Sets sharing limits (seeding limit conditions). | Empty `200 OK`. |

### Priority & Operations

| HTTP Method | Endpoint | Parameters | Description | Response |
|-------------|----------|------------|-------------|----------|
| **POST** | `/api/v2/torrents/increasePrio` / `decreasePrio` | `hashes` (string, required) – Torrent IDs. | Increases or decreases priority in queue. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/topPrio` / `bottomPrio` | `hashes` (string, required) – Torrent IDs. | Moves torrents to top/bottom of queue. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/setLocation` / `setSavePath` | `hashes` (string, required) – Torrent IDs.<br>`location`/`path` (string, required) – Destination directory. | Changes storage path and moves data files. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/setAutoManagement` | `hashes` (string, required) – Torrent IDs.<br>`enable` (bool, required) – `true` or `false`. | Enables or disables Auto Torrent Management. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/setSuperSeeding` | `hashes` (string, required) – Torrent IDs.<br>`value` (bool, required) – `true` or `false`. | Sets Super Seeding status. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/setForceStart` | `hashes` (string, required) – Torrent IDs.<br>`value` (bool, required) – `true` or `false`. | Forces start of stopped torrents. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/toggleSequentialDownload` | `hashes` (string, required) – Torrent IDs. | Toggles download of pieces in sequential order. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/toggleFirstLastPiecePrio` | `hashes` (string, required) – Torrent IDs. | Toggles prioritizations of first/last pieces. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/renameFile` | `hash` (string, required) – Torrent ID.<br>`oldPath` (string, required) – Current file path.<br>`newPath` (string, required) – New file path. | Renames a file inside torrent structure. | Empty `200 OK`. |
| **POST** | `/api/v2/torrents/renameFolder` | `hash` (string, required) – Torrent ID.<br>`oldPath` (string, required) – Current folder path.<br>`newPath` (string, required) – New folder path. | Renames a folder inside torrent structure. | Empty `200 OK`. |
| **GET** / **POST** | `/api/v2/torrents/export` | `hash` (string, required) – Torrent ID. | Exports and downloads the `.torrent` file. | Binary attachment of the `.torrent` file. |

---

## Transfer Scope (`transfer`)

The `transfer` scope provides control over alternative speed limits, global transfer speeds, and IP banning.

| HTTP Method | Endpoint | Parameters | Description | Response |
|-------------|----------|------------|-------------|----------|
| **GET** / **POST** | `/api/v2/transfer/info` | *None* | Returns global transfer rates, external addresses, connection status, etc. | JSON object with transfer information. |
| **GET** / **POST** | `/api/v2/transfer/speedLimitsMode` | *None* | Gets current global speed limit mode. | Plain text string integer: `0` (global limits) or `1` (alternative limits). |
| **POST** | `/api/v2/transfer/setSpeedLimitsMode` | `mode` (int, required) – `0` or `1`. | Enables or disables alternative speed limits. | Empty `200 OK`. |
| **POST** | `/api/v2/transfer/toggleSpeedLimitsMode` | *None* | Toggles between alternative and normal speed limits. | Empty `200 OK`. |
| **GET** / **POST** | `/api/v2/transfer/uploadLimit` / `downloadLimit` | *None* | Gets current global upload/download limit in bytes/sec. | Plain text string integer. |
| **POST** | `/api/v2/transfer/setUploadLimit` / `setDownloadLimit` | `limit` (int, required) – Speed limit in bytes/sec. | Sets global upload/download speed limit. | Empty `200 OK`. |
| **GET** / **POST** | `/api/v2/transfer/getSpeedLimits` | *None* | Retrieves all configured speed limits. | JSON object containing global and alternative upload/download limits. |
| **POST** | `/api/v2/transfer/setSpeedLimits` | `up_limit`, `dl_limit`, `alt_up_limit`, `alt_dl_limit` (int, required). | Updates normal and alternative upload/download speed limits. | Empty `200 OK`. |
| **POST** | `/api/v2/transfer/banPeers` | `peers` (string, required) – Pipe-separated list of peer IP addresses. | Bans target IP addresses globally in the session. | Empty `200 OK`. |

---

### Complete Endpoint mapping table

| Scope | Action | Controller | Method | Allowed HTTP Methods |
|-------|--------|------------|--------|----------------------|
| **auth** | login | AuthController | loginAction | POST |
| **auth** | logout | AuthController | logoutAction | POST |
| **app** | webapiVersion | AppController | webapiVersionAction | GET / POST / HEAD |
| **app** | version | AppController | versionAction | GET / POST / HEAD |
| **app** | buildInfo | AppController | buildInfoAction | GET / POST / HEAD |
| **app** | processInfo | AppController | processInfoAction | GET / POST / HEAD |
| **app** | shutdown | AppController | shutdownAction | POST |
| **app** | preferences | AppController | preferencesAction | GET / POST / HEAD |
| **app** | setPreferences | AppController | setPreferencesAction | POST |
| **app** | defaultSavePath | AppController | defaultSavePathAction | GET / POST / HEAD |
| **app** | sendTestEmail | AppController | sendTestEmailAction | POST |
| **app** | getDirectoryContent | AppController | getDirectoryContentAction | GET / POST / HEAD |
| **app** | getFreeSpaceAtPath | AppController | getFreeSpaceAtPathAction | GET / POST / HEAD |
| **app** | cookies | AppController | cookiesAction | GET / POST / HEAD |
| **app** | setCookies | AppController | setCookiesAction | POST |
| **app** | rotateAPIKey | AppController | rotateAPIKeyAction | POST |
| **app** | deleteAPIKey | AppController | deleteAPIKeyAction | POST |
| **app** | networkInterfaceList | AppController | networkInterfaceListAction | GET / POST / HEAD |
| **app** | networkInterfaceAddressList | AppController | networkInterfaceAddressListAction | GET / POST / HEAD |
| **clientdata** | load | ClientDataController | loadAction | GET / POST / HEAD |
| **clientdata** | store | ClientDataController | storeAction | POST |
| **log** | main | LogController | mainAction | GET / POST / HEAD |
| **log** | peers | LogController | peersAction | GET / POST / HEAD |
| **rss** | addFolder | RSSController | addFolderAction | POST |
| **rss** | addFeed | RSSController | addFeedAction | POST |
| **rss** | setFeedURL | RSSController | setFeedURLAction | POST |
| **rss** | setFeedRefreshInterval | RSSController | setFeedRefreshIntervalAction | GET / POST / HEAD |
| **rss** | removeItem | RSSController | removeItemAction | POST |
| **rss** | moveItem | RSSController | moveItemAction | POST |
| **rss** | items | RSSController | itemsAction | GET / POST / HEAD |
| **rss** | markAsRead | RSSController | markAsReadAction | POST |
| **rss** | refreshItem | RSSController | refreshItemAction | POST |
| **rss** | setRule | RSSController | setRuleAction | POST |
| **rss** | renameRule | RSSController | renameRuleAction | POST |
| **rss** | cloneRule | RSSController | cloneRuleAction | POST |
| **rss** | removeRule | RSSController | removeRuleAction | POST |
| **rss** | rules | RSSController | rulesAction | GET / POST / HEAD |
| **rss** | matchingArticles | RSSController | matchingArticlesAction | GET / POST / HEAD |
| **search** | start | SearchController | startAction | POST |
| **search** | stop | SearchController | stopAction | POST |
| **search** | status | SearchController | statusAction | GET / POST / HEAD |
| **search** | results | SearchController | resultsAction | GET / POST / HEAD |
| **search** | delete | SearchController | deleteAction | POST |
| **search** | downloadTorrent | SearchController | downloadTorrentAction | GET / POST / HEAD |
| **search** | plugins | SearchController | pluginsAction | GET / POST / HEAD |
| **search** | installPlugin | SearchController | installPluginAction | POST |
| **search** | uninstallPlugin | SearchController | uninstallPluginAction | POST |
| **search** | enablePlugin | SearchController | enablePluginAction | POST |
| **search** | updatePlugins | SearchController | updatePluginsAction | POST |
| **sync** | maindata | SyncController | maindataAction | GET / POST / HEAD |
| **sync** | torrentPeers | SyncController | torrentPeersAction | GET / POST / HEAD |
| **torrentcreator** | addTask | TorrentCreatorController | addTaskAction | POST |
| **torrentcreator** | status | TorrentCreatorController | statusAction | GET / POST / HEAD |
| **torrentcreator** | torrentFile | TorrentCreatorController | torrentFileAction | GET / POST / HEAD |
| **torrentcreator** | deleteTask | TorrentCreatorController | deleteTaskAction | POST |
| **torrents** | count | TorrentsController | countAction | GET / POST / HEAD |
| **torrents** | info | TorrentsController | infoAction | GET / POST / HEAD |
| **torrents** | properties | TorrentsController | propertiesAction | GET / POST / HEAD |
| **torrents** | trackers | TorrentsController | trackersAction | GET / POST / HEAD |
| **torrents** | webseeds | TorrentsController | webseedsAction | GET / POST / HEAD |
| **torrents** | addWebSeeds | TorrentsController | addWebSeedsAction | POST |
| **torrents** | editWebSeed | TorrentsController | editWebSeedAction | POST |
| **torrents** | removeWebSeeds | TorrentsController | removeWebSeedsAction | POST |
| **torrents** | files | TorrentsController | filesAction | GET / POST / HEAD |
| **torrents** | pieceHashes | TorrentsController | pieceHashesAction | GET / POST / HEAD |
| **torrents** | pieceStates | TorrentsController | pieceStatesAction | GET / POST / HEAD |
| **torrents** | pieceAvailability | TorrentsController | pieceAvailabilityAction | GET / POST / HEAD |
| **torrents** | start | TorrentsController | startAction | POST |
| **torrents** | stop | TorrentsController | stopAction | POST |
| **torrents** | recheck | TorrentsController | recheckAction | POST |
| **torrents** | reannounce | TorrentsController | reannounceAction | POST |
| **torrents** | rename | TorrentsController | renameAction | POST |
| **torrents** | setComment | TorrentsController | setCommentAction | POST |
| **torrents** | setCategory | TorrentsController | setCategoryAction | POST |
| **torrents** | createCategory | TorrentsController | createCategoryAction | POST |
| **torrents** | editCategory | TorrentsController | editCategoryAction | POST |
| **torrents** | removeCategories | TorrentsController | removeCategoriesAction | POST |
| **torrents** | categories | TorrentsController | categoriesAction | GET / POST / HEAD |
| **torrents** | addTags | TorrentsController | addTagsAction | POST |
| **torrents** | setTags | TorrentsController | setTagsAction | POST |
| **torrents** | removeTags | TorrentsController | removeTagsAction | POST |
| **torrents** | createTags | TorrentsController | createTagsAction | POST |
| **torrents** | deleteTags | TorrentsController | deleteTagsAction | POST |
| **torrents** | tags | TorrentsController | tagsAction | GET / POST / HEAD |
| **torrents** | add | TorrentsController | addAction | POST |
| **torrents** | delete | TorrentsController | deleteAction | POST |
| **torrents** | addTrackers | TorrentsController | addTrackersAction | POST |
| **torrents** | editTracker | TorrentsController | editTrackerAction | POST |
| **torrents** | removeTrackers | TorrentsController | removeTrackersAction | POST |
| **torrents** | addPeers | TorrentsController | addPeersAction | POST |
| **torrents** | filePrio | TorrentsController | filePrioAction | POST |
| **torrents** | uploadLimit | TorrentsController | uploadLimitAction | GET / POST / HEAD |
| **torrents** | downloadLimit | TorrentsController | downloadLimitAction | GET / POST / HEAD |
| **torrents** | setUploadLimit | TorrentsController | setUploadLimitAction | POST |
| **torrents** | setDownloadLimit | TorrentsController | setDownloadLimitAction | POST |
| **torrents** | setShareLimits | TorrentsController | setShareLimitsAction | POST |
| **torrents** | increasePrio | TorrentsController | increasePrioAction | POST |
| **torrents** | decreasePrio | TorrentsController | decreasePrioAction | POST |
| **torrents** | topPrio | TorrentsController | topPrioAction | POST |
| **torrents** | bottomPrio | TorrentsController | bottomPrioAction | POST |
| **torrents** | setLocation | TorrentsController | setLocationAction | POST |
| **torrents** | setSavePath | TorrentsController | setSavePathAction | POST |
| **torrents** | setDownloadPath | TorrentsController | setDownloadPathAction | POST |
| **torrents** | setAutoManagement | TorrentsController | setAutoManagementAction | POST |
| **torrents** | setSuperSeeding | TorrentsController | setSuperSeedingAction | POST |
| **torrents** | setForceStart | TorrentsController | setForceStartAction | POST |
| **torrents** | toggleSequentialDownload | TorrentsController | toggleSequentialDownloadAction | POST |
| **torrents** | toggleFirstLastPiecePrio | TorrentsController | toggleFirstLastPiecePrioAction | POST |
| **torrents** | renameFile | TorrentsController | renameFileAction | POST |
| **torrents** | renameFolder | TorrentsController | renameFolderAction | POST |
| **torrents** | export | TorrentsController | exportAction | GET / POST / HEAD |
| **torrents** | SSLParameters | TorrentsController | SSLParametersAction | GET / POST / HEAD |
| **torrents** | setSSLParameters | TorrentsController | setSSLParametersAction | POST |
| **torrents** | fetchMetadata | TorrentsController | fetchMetadataAction | POST |
| **torrents** | parseMetadata | TorrentsController | parseMetadataAction | POST |
| **torrents** | saveMetadata | TorrentsController | saveMetadataAction | GET / POST / HEAD |
| **torrents** | downloadFile | TorrentsController | downloadFileAction | GET / POST / HEAD |
| **transfer** | info | TransferController | infoAction | GET / POST / HEAD |
| **transfer** | speedLimitsMode | TransferController | speedLimitsModeAction | GET / POST / HEAD |
| **transfer** | setSpeedLimitsMode | TransferController | setSpeedLimitsModeAction | POST |
| **transfer** | toggleSpeedLimitsMode | TransferController | toggleSpeedLimitsModeAction | POST |
| **transfer** | uploadLimit | TransferController | uploadLimitAction | GET / POST / HEAD |
| **transfer** | downloadLimit | TransferController | downloadLimitAction | GET / POST / HEAD |
| **transfer** | setUploadLimit | TransferController | setUploadLimitAction | POST |
| **transfer** | setDownloadLimit | TransferController | setDownloadLimitAction | POST |
| **transfer** | getSpeedLimits | TransferController | getSpeedLimitsAction | GET / POST / HEAD |
| **transfer** | setSpeedLimits | TransferController | setSpeedLimitsAction | POST |
| **transfer** | banPeers | TransferController | banPeersAction | POST |

---

*Generated by Antigravity – your pair programming AI assistant.*

