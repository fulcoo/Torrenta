import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QBittorrentAdapter } from '../qbittorrent';
import { api } from '../../api';

// Mock the api Axios instance
vi.mock('../../api', () => {
  return {
    api: {
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

describe('QBittorrentAdapter', () => {
  let adapter: QBittorrentAdapter;

  beforeEach(() => {
    adapter = new QBittorrentAdapter();
    vi.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect successfully without credentials', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: {} });

      const success = await adapter.connect('http://localhost:8080');
      expect(success).toBe(true);
      expect(api.get).toHaveBeenCalledWith('/transfer/info');
      expect(api.post).not.toHaveBeenCalled();
    });

    it('should login and then connect successfully when credentials provided', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: 'Ok.' });
      vi.mocked(api.get).mockResolvedValueOnce({ data: {} });

      const success = await adapter.connect('http://localhost:8080', 'admin', 'adminadmin');
      expect(success).toBe(true);
      expect(api.post).toHaveBeenCalledWith('/auth/login', expect.any(URLSearchParams), expect.any(Object));
      expect(api.get).toHaveBeenCalledWith('/transfer/info');
    });

    it('should propagate errors on connection failure', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Network Error'));

      await expect(adapter.connect('http://localhost:8080')).rejects.toThrow('Network Error');
    });
  });

  describe('getTorrents', () => {
    it('should map raw qbittorrent torrent data to UnifiedTorrent', async () => {
      const mockRawTorrents = [
        {
          hash: 'hash1',
          name: 'Torrent 1',
          progress: 0.5,
          size: 1000,
          dlspeed: 100,
          upspeed: 200,
          state: 'downloading',
          eta: 50,
          category: 'movies',
          ratio: 1.5,
          num_seeds: 5,
          num_complete: 10,
          num_leechs: 2,
          num_incomplete: 4,
          uploaded: 1500,
          tracker: 'http://tracker.com',
          added_on: 1600000000,
          completion_on: 1600005000,
          save_path: '/downloads',
          tags: 'tag1, tag2',
        },
      ];

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockRawTorrents });

      const torrents = await adapter.getTorrents();
      expect(torrents).toHaveLength(1);
      expect(torrents[0]).toEqual({
        id: 'hash1',
        name: 'Torrent 1',
        progress: 50, // 0.5 * 100
        size: 1000,
        downloadSpeed: 100,
        uploadSpeed: 200,
        status: 'downloading',
        eta: 50,
        category: 'movies',
        ratio: 1.5,
        num_seeds: 5,
        num_seeds_total: 10,
        num_peers: 2,
        num_peers_total: 4,
        uploaded: 1500,
        tracker: 'http://tracker.com',
        added_on: 1600000000,
        completion_on: 1600005000,
        savepath: '/downloads',
        tags: ['tag1', 'tag2'],
      });
    });

    it('should return empty list if getTorrents api call fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.get).mockRejectedValueOnce(new Error('API failure'));

      const torrents = await adapter.getTorrents();
      expect(torrents).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('getGlobalState', () => {
    it('should retrieve global states from sync/maindata', async () => {
      const mockMainData = {
        server_state: {
          dl_info_speed: 1000,
          up_info_speed: 500,
          free_space_on_disk: 20000,
          all_torrents_count: 5,
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockMainData });

      const state = await adapter.getGlobalState();
      expect(state).toEqual({
        globalDownloadSpeed: 1000,
        globalUploadSpeed: 500,
        freeSpaceOnDisk: 20000,
        allTorrentsCount: 5,
      });
    });

    it('should fallback to transfer/info if sync/maindata throws error', async () => {
      vi.mocked(api.get)
        .mockRejectedValueOnce(new Error('Forbidden')) // maindata fail
        .mockResolvedValueOnce({
          data: {
            dl_info_speed: 1200,
            up_info_speed: 600,
          },
        }); // transfer/info success

      const state = await adapter.getGlobalState();
      expect(state).toEqual({
        globalDownloadSpeed: 1200,
        globalUploadSpeed: 600,
        freeSpaceOnDisk: 0,
        allTorrentsCount: 0,
      });
    });
  });

  describe('pauseTorrents', () => {
    it('should post to /torrents/stop for newer qBittorrent WebUI versions', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: 'Ok.' });

      const success = await adapter.pauseTorrents(['hash1', 'hash2']);
      expect(success).toBe(true);
      expect(api.post).toHaveBeenCalledWith('/torrents/stop', expect.any(URLSearchParams), expect.any(Object));
    });

    it('should fallback to /torrents/pause if /torrents/stop returns 404', async () => {
      const error404 = { response: { status: 404 } };
      vi.mocked(api.post)
        .mockRejectedValueOnce(error404) // stop throws 404
        .mockResolvedValueOnce({ data: 'Ok.' }); // pause succeeds

      const success = await adapter.pauseTorrents(['hash1']);
      expect(success).toBe(true);
      expect(api.post).toHaveBeenNthCalledWith(1, '/torrents/stop', expect.any(URLSearchParams), expect.any(Object));
      expect(api.post).toHaveBeenNthCalledWith(2, '/torrents/pause', expect.any(URLSearchParams), expect.any(Object));
    });
  });

  describe('addTorrents', () => {
    it('should post options to /torrents/add including advanced parameters', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: 'Ok.' });

      const options = {
        urls: 'magnet:?xt=urn:btih:xyz',
        paused: true,
        autoTMM: true,
        tags: 'test-tag',
        rename: 'new-name',
        upLimit: 10240,
        dlLimit: 20480,
        ratioLimit: 2.0,
        seedingTimeLimit: 120,
        stopCondition: 'MetadataReceived' as const,
        contentLayout: 'Subfolder' as const,
        forced: true,
      };

      const success = await adapter.addTorrents(options);
      expect(success).toBe(true);
      expect(api.post).toHaveBeenCalledWith('/torrents/add', expect.any(FormData), expect.any(Object));

      const calledFormData = vi.mocked(api.post).mock.calls[0][1] as FormData;
      expect(calledFormData.get('urls')).toBe('magnet:?xt=urn:btih:xyz');
      expect(calledFormData.get('paused')).toBe('true');
      expect(calledFormData.get('autoTMM')).toBe('true');
      expect(calledFormData.get('tags')).toBe('test-tag');
      expect(calledFormData.get('rename')).toBe('new-name');
      expect(calledFormData.get('upLimit')).toBe('10240');
      expect(calledFormData.get('dlLimit')).toBe('20480');
      expect(calledFormData.get('ratioLimit')).toBe('2');
      expect(calledFormData.get('seedingTimeLimit')).toBe('120');
      expect(calledFormData.get('stopCondition')).toBe('MetadataReceived');
      expect(calledFormData.get('contentLayout')).toBe('Subfolder');
      expect(calledFormData.get('forced')).toBe('true');
    });
  });

  describe('preferences', () => {
    it('should retrieve preferences successfully', async () => {
      const mockPrefs = {
        preallocate_all: true,
        incomplete_files_ext: false,
        auto_tmm_enabled: true,
        export_dir: '/backups',
        up_limit: 1024000,
        dl_limit: 5120000,
        alt_up_limit: 51200,
        alt_dl_limit: 102400,
        scheduler_enabled: true,
        schedule_from_hour: 8,
        schedule_from_min: 0,
        schedule_to_hour: 20,
        schedule_to_min: 0,
        scheduler_days: 0,
        bittorrent_protocol: 0,
        listen_port: 45682,
        upnp: true,
        max_connec: 500,
        max_connec_per_torrent: 100,
        max_uploads: 80,
        max_uploads_per_torrent: 20,
        proxy_type: -1,
        proxy_ip: '',
        proxy_port: 8080,
        proxy_peer_connections: false,
        proxy_username: '',
        proxy_password: '',
      };
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockPrefs });

      const prefs = await adapter.getPreferences();
      expect(prefs).toEqual(mockPrefs);
      expect(api.get).toHaveBeenCalledWith('/app/preferences');
    });

    it('should set preferences successfully', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: 'Ok.' });

      const prefPayload = {
        preallocate_all: true,
        auto_tmm_enabled: true,
        export_dir: '/backups',
        up_limit: 1024000,
        dl_limit: 5120000,
        alt_up_limit: 51200,
        alt_dl_limit: 102400,
        scheduler_enabled: true,
        schedule_from_hour: 8,
        schedule_from_min: 0,
        schedule_to_hour: 20,
        schedule_to_min: 0,
        scheduler_days: 0,
        bittorrent_protocol: 0,
        listen_port: 45682,
        upnp: true,
        max_connec: 500,
        max_connec_per_torrent: 100,
        max_uploads: 80,
        max_uploads_per_torrent: 20,
        proxy_type: -1,
        proxy_ip: '',
        proxy_port: 8080,
        proxy_peer_connections: false,
        proxy_username: '',
        proxy_password: '',
      };
      const success = await adapter.setPreferences(prefPayload);
      expect(success).toBe(true);
      expect(api.post).toHaveBeenCalledWith('/app/setPreferences', expect.any(URLSearchParams), expect.any(Object));
      
      const calledParams = vi.mocked(api.post).mock.calls[0][1] as URLSearchParams;
      expect(calledParams.get('json')).toBe(JSON.stringify(prefPayload));
    });
  });

  describe('categories', () => {
    it('should retrieve categories successfully', async () => {
      const mockCats = {
        Movies: { name: 'Movies', savePath: '/downloads/movies' },
      };
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCats });

      const categories = await adapter.getCategories();
      expect(categories).toEqual(mockCats);
      expect(api.get).toHaveBeenCalledWith('/torrents/categories');
    });

    it('should create category successfully', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: 'Ok.' });

      const success = await adapter.createCategory('Movies', '/downloads/movies');
      expect(success).toBe(true);
      expect(api.post).toHaveBeenCalledWith('/torrents/createCategory', expect.any(URLSearchParams), expect.any(Object));

      const calledParams = vi.mocked(api.post).mock.calls[0][1] as URLSearchParams;
      expect(calledParams.get('category')).toBe('Movies');
      expect(calledParams.get('savePath')).toBe('/downloads/movies');
    });

    it('should remove categories successfully', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: 'Ok.' });

      const success = await adapter.removeCategories(['Movies', 'Music']);
      expect(success).toBe(true);
      expect(api.post).toHaveBeenCalledWith('/torrents/removeCategories', expect.any(URLSearchParams), expect.any(Object));

      const calledParams = vi.mocked(api.post).mock.calls[0][1] as URLSearchParams;
      expect(calledParams.get('categories')).toBe('Movies\nMusic');
    });
  });
});

