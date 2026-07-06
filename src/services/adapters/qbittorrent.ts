import { api } from '../api';
import type { DownloaderAdapter, AddTorrentOptions } from './interface';
import type { UnifiedTorrent, GlobalState, TorrentProperties } from '@/models/torrent';
import { safeStorage } from '@/utils/storage';

export class QBittorrentAdapter implements DownloaderAdapter {
  async connect(url: string, username?: string, password?: string): Promise<boolean> {
    // Write configuration to localStorage immediately so that the api interceptor pick up the URL
    safeStorage.setJSON('torrenta_app_config', { url, username });

    try {
      if (username || password) {
        const params = new URLSearchParams();
        if (username) params.append('username', username);
        if (password) params.append('password', password);

        // Attempt login
        await api.post('/auth/login', params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
      }

      // Verify connection by calling transfer/info or sync/maindata
      await api.get('/transfer/info');
      return true;
    } catch (err: any) {
      console.error('Failed to connect to qBittorrent WebUI:', err);
      // Clean config on failure so we don't lock ourselves in a bad state
      throw err;
    }
  }

  async getTorrents(): Promise<UnifiedTorrent[]> {
    try {
      const response = await api.get<any[]>('/torrents/info');
      if (!response || !Array.isArray(response.data)) {
        return [];
      }
      return response.data
        .filter((t) => t && typeof t === 'object')
        .map((t) => ({
          id: t.hash,
          name: t.name,
          progress: (t.progress || 0) * 100, // qBittorrent returns progress as 0 to 1
          size: t.size || 0,
          downloadSpeed: t.dlspeed || 0,
          uploadSpeed: t.upspeed || 0,
          status: this.mapStatus(t.state),
          eta: t.eta || 0,
          category: t.category || '',
          ratio: t.ratio || 0,
          num_seeds: t.num_seeds || 0,
          num_seeds_total: t.num_complete || 0,
          num_peers: t.num_leechs || 0,
          num_peers_total: t.num_incomplete || 0,
          uploaded: t.uploaded || 0,
          tracker: t.tracker || '',
          added_on: t.added_on || 0,
          completion_on: t.completion_on || 0,
          savepath: t.save_path || '',
          tags: (t.tags && typeof t.tags === 'string') ? t.tags.split(',').map((tag: any) => tag.trim()).filter(Boolean) : [],
        }));
    } catch (err) {
      console.error('Failed to get qBittorrent torrents:', err);
      return [];
    }
  }

  async getGlobalState(): Promise<GlobalState> {
    try {
      // sync/maindata contains comprehensive info including free_space_on_disk
      const res = await api.get('/sync/maindata?rid=0');
      const state = res.data?.server_state || {};
      const torrents = res.data?.torrents || {};
      const fallbackCount = Object.keys(torrents).length;

      return {
        globalDownloadSpeed: state.dl_info_speed || 0,
        globalUploadSpeed: state.up_info_speed || 0,
        freeSpaceOnDisk: state.free_space_on_disk || 0,
        allTorrentsCount:
          state.all_torrents_count !== undefined
            ? state.all_torrents_count
            : fallbackCount,
      };
    } catch (err) {
      console.warn('sync/maindata failed, falling back to transfer/info:', err);
      // Fallback to transfer/info if sync/maindata is restricted or blocked
      try {
        const res = await api.get('/transfer/info');
        return {
          globalDownloadSpeed: res.data?.dl_info_speed || 0,
          globalUploadSpeed: res.data?.up_info_speed || 0,
          freeSpaceOnDisk: 0,
          allTorrentsCount: 0,
        };
      } catch (fallbackErr) {
        console.error('Fallback /transfer/info failed:', fallbackErr);
        return {
          globalDownloadSpeed: 0,
          globalUploadSpeed: 0,
          freeSpaceOnDisk: 0,
          allTorrentsCount: 0,
        };
      }
    }
  }

  async pauseTorrents(ids: string[]): Promise<boolean> {
    if (ids.length === 0) return true;
    // 支持 'all' 特殊值，对应 qBittorrent API 的 hashes=all
    const hashes = ids.includes('all') ? 'all' : ids.join('|');
    try {
      const params = new URLSearchParams();
      params.append('hashes', hashes);
      // 新版 API: /torrents/stop（旧版为 /torrents/pause）
      await api.post('/torrents/stop', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      return true;
    } catch (err: any) {
      // 新版 API 失败时回退到旧版 /torrents/pause
      if (err?.response?.status === 404) {
        try {
          const params = new URLSearchParams();
          params.append('hashes', hashes);
          await api.post('/torrents/pause', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
          return true;
        } catch (fallbackErr) {
          console.error('Failed to pause torrents (fallback):', fallbackErr);
          return false;
        }
      }
      console.error('Failed to pause torrents:', err);
      return false;
    }
  }

  async resumeTorrents(ids: string[]): Promise<boolean> {
    if (ids.length === 0) return true;
    // 支持 'all' 特殊值，对应 qBittorrent API 的 hashes=all
    const hashes = ids.includes('all') ? 'all' : ids.join('|');
    try {
      const params = new URLSearchParams();
      params.append('hashes', hashes);
      // 新版 API: /torrents/start（旧版为 /torrents/resume）
      await api.post('/torrents/start', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      return true;
    } catch (err: any) {
      // 新版 API 失败时回退到旧版 /torrents/resume
      if (err?.response?.status === 404) {
        try {
          const params = new URLSearchParams();
          params.append('hashes', hashes);
          await api.post('/torrents/resume', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
          return true;
        } catch (fallbackErr) {
          console.error('Failed to resume torrents (fallback):', fallbackErr);
          return false;
        }
      }
      console.error('Failed to resume torrents:', err);
      return false;
    }
  }

  async deleteTorrents(ids: string[], deleteData: boolean): Promise<boolean> {
    if (ids.length === 0) return true;
    try {
      const params = new URLSearchParams();
      params.append('hashes', ids.join('|'));
      params.append('deleteFiles', deleteData ? 'true' : 'false');
      await api.post('/torrents/delete', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      return true;
    } catch (err) {
      console.error('Failed to delete torrents:', err);
      return false;
    }
  }

  async addTorrents(options: AddTorrentOptions): Promise<boolean> {
    try {
      const formData = new FormData();
      if (options.urls) {
        formData.append('urls', options.urls);
      }
      if (options.files && options.files.length > 0) {
        options.files.forEach((file) => {
          formData.append('torrents', file);
        });
      }
      if (options.savepath) {
        formData.append('savepath', options.savepath);
      }
      if (options.category) {
        formData.append('category', options.category);
      }
      if (options.paused !== undefined) {
        formData.append('paused', options.paused ? 'true' : 'false');
      }
      if (options.skip_checking !== undefined) {
        formData.append('skip_checking', options.skip_checking ? 'true' : 'false');
      }
      if (options.autoTMM !== undefined) {
        formData.append('autoTMM', options.autoTMM ? 'true' : 'false');
      }
      if (options.sequentialDownload !== undefined) {
        formData.append('sequentialDownload', options.sequentialDownload ? 'true' : 'false');
      }
      if (options.firstLastAsStream !== undefined) {
        formData.append('firstLastAsStream', options.firstLastAsStream ? 'true' : 'false');
      }

      await api.post('/torrents/add', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return true;
    } catch (err) {
      console.error('Failed to add qBittorrent torrents:', err);
      return false;
    }
  }

  async changeCredentials(username: string, password?: string): Promise<boolean> {
    try {
      const prefs: Record<string, string> = {
        web_ui_username: username,
      };
      if (password !== undefined && password !== '') {
        prefs.web_ui_password = password;
      }

      const params = new URLSearchParams();
      params.append('json', JSON.stringify(prefs));

      await api.post('/app/setPreferences', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      return true;
    } catch (err: any) {
      console.error('Failed to change qBittorrent WebUI credentials:', err);
      throw err;
    }
  }

  async getTorrentProperties(id: string): Promise<TorrentProperties | null> {
    try {
      const response = await api.get<TorrentProperties>(`/torrents/properties?hash=${id}`);
      return response.data;
    } catch (err) {
      console.error(`Failed to get qBittorrent torrent properties for ${id}:`, err);
      return null;
    }
  }

  async forceStartTorrents(ids: string[]): Promise<boolean> {
    if (ids.length === 0) return true;
    try {
      const hashes = ids.join('|');
      const params = new URLSearchParams();
      params.append('hashes', hashes);
      params.append('value', 'true');
      const res = await api.post('/torrents/setForceStart', params);
      return res.status === 200;
    } catch (err) {
      console.error('Failed to force start torrents:', err);
      return false;
    }
  }

  async setTorrentsLocation(ids: string[], location: string): Promise<boolean> {
    if (ids.length === 0) return true;
    try {
      const hashes = ids.join('|');
      const params = new URLSearchParams();
      params.append('hashes', hashes);
      params.append('location', location);
      const res = await api.post('/torrents/setLocation', params);
      return res.status === 200;
    } catch (err) {
      console.error('Failed to set location for torrents:', err);
      return false;
    }
  }

  async renameTorrent(id: string, name: string): Promise<boolean> {
    try {
      const params = new URLSearchParams();
      params.append('hash', id);
      params.append('name', name);
      const res = await api.post('/torrents/rename', params);
      return res.status === 200;
    } catch (err) {
      console.error('Failed to rename torrent:', err);
      return false;
    }
  }

  async addTorrentTags(ids: string[], tags: string[]): Promise<boolean> {
    if (ids.length === 0 || tags.length === 0) return true;
    try {
      const params = new URLSearchParams();
      params.append('hashes', ids.join('|'));
      params.append('tags', tags.join(','));
      const res = await api.post('/torrents/addTags', params);
      return res.status === 200;
    } catch (err) {
      console.error('Failed to add tags to torrents:', err);
      return false;
    }
  }

  async removeTorrentTags(ids: string[], tags: string[]): Promise<boolean> {
    if (ids.length === 0 || tags.length === 0) return true;
    try {
      const params = new URLSearchParams();
      params.append('hashes', ids.join('|'));
      params.append('tags', tags.join(','));
      const res = await api.post('/torrents/removeTags', params);
      return res.status === 200;
    } catch (err) {
      console.error('Failed to remove tags from torrents:', err);
      return false;
    }
  }

  async setTorrentTags(ids: string[], tags: string[]): Promise<boolean> {
    if (ids.length === 0) return true;
    try {
      const params = new URLSearchParams();
      params.append('hashes', ids.join('|'));
      params.append('tags', tags.join(','));
      const res = await api.post('/torrents/setTags', params);
      return res.status === 200;
    } catch (err) {
      console.error('Failed to set tags for torrents:', err);
      return false;
    }
  }

  async getTags(): Promise<string[]> {
    try {
      const res = await api.get('/torrents/tags');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error('Failed to get tags from qBittorrent:', err);
      return [];
    }
  }

  async createTags(tags: string[]): Promise<boolean> {
    if (tags.length === 0) return true;
    try {
      const params = new URLSearchParams();
      params.append('tags', tags.join(','));
      const res = await api.post('/torrents/createTags', params);
      return res.status === 200;
    } catch (err) {
      console.error('Failed to create tags in qBittorrent:', err);
      return false;
    }
  }

  async deleteTags(tags: string[]): Promise<boolean> {
    if (tags.length === 0) return true;
    try {
      const params = new URLSearchParams();
      params.append('tags', tags.join(','));
      const res = await api.post('/torrents/deleteTags', params);
      return res.status === 200;
    } catch (err) {
      console.error('Failed to delete tags in qBittorrent:', err);
      return false;
    }
  }

  async getTorrentTrackers(id: string): Promise<{ url: string; tier: number }[]> {
    try {
      const res = await api.get<any[]>(`/torrents/trackers?hash=${id}`);
      if (!Array.isArray(res.data)) return [];
      return res.data
        .filter((t: any) => t.url && !t.url.startsWith('**'))
        .map((t: any) => ({
          url: t.url,
          tier: typeof t.tier === 'number' ? t.tier : 0,
        }));
    } catch (err) {
      console.error(`Failed to get trackers for torrent ${id}:`, err);
      return [];
    }
  }

  async removeTorrentTrackers(id: string, urls: string[]): Promise<boolean> {
    if (urls.length === 0) return true;
    try {
      const params = new URLSearchParams();
      params.append('hash', id);
      params.append('urls', urls.join('|'));
      const res = await api.post('/torrents/removeTrackers', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      return res.status === 200;
    } catch (err) {
      console.error(`Failed to remove trackers from torrent ${id}:`, err);
      return false;
    }
  }

  async addTorrentTrackers(id: string, urls: string): Promise<boolean> {
    if (!urls.trim()) return true;
    try {
      const params = new URLSearchParams();
      params.append('hash', id);
      params.append('urls', urls);
      const res = await api.post('/torrents/addTrackers', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      return res.status === 200;
    } catch (err) {
      console.error(`Failed to add trackers to torrent ${id}:`, err);
      return false;
    }
  }

  async editTorrentTrackerTier(id: string, url: string, tier: number): Promise<boolean> {
    try {
      const params = new URLSearchParams();
      params.append('hash', id);
      params.append('origUrl', url);
      params.append('newUrl', url);
      params.append('tier', tier.toString());
      const res = await api.post('/torrents/editTracker', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      return res.status === 200;
    } catch (err) {
      console.error(`Failed to edit tracker tier for torrent ${id} and url ${url}:`, err);
      return false;
    }
  }

  /**
   * Helper mapping qBittorrent states cleanly.
   * State references:
   * downloading, stalledDL -> downloading
   * pausedDL, pausedUL -> paused
   * stalledUL, uploading -> seeding
   * checkingDL, checkingUL, checkingResumeData -> checking
   * error, missingFiles -> error
   * queuedDL, queuedUL -> queued
   */
  private mapStatus(state: string): UnifiedTorrent['status'] {
    switch (state) {
      case 'downloading':
      case 'stalledDL':
        return 'downloading';
      case 'pausedDL':
      case 'pausedUL':
      case 'stoppedDL':
      case 'stoppedUL':
      case 'stopped':
        return 'paused';
      case 'stalledUL':
      case 'uploading':
      case 'forcedUP': // Explicitly map forced seeding
        return 'seeding';
      case 'forcedDL': // Explicitly map forced downloading
        return 'downloading';
      case 'checkingDL':
      case 'checkingUL':
      case 'checkingResumeData':
        return 'checking';
      case 'error':
      case 'missingFiles':
        return 'error';
      case 'queuedDL':
      case 'queuedUL':
        return 'queued';
      default:
        // Safeguard heuristics (order matters: check for check/pause/stop first)
        if (state.includes('pause') || state.includes('stop')) return 'paused';
        if (state.includes('check')) return 'checking';
        if (state.includes('DL')) return 'downloading';
        if (state.includes('UL') || state.includes('UP')) return 'seeding';
        return 'queued';
    }
  }
}
