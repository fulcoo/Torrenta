import { defineStore } from 'pinia';
import { ref, shallowRef, computed } from 'vue';
import type { UnifiedTorrent, GlobalState, TorrentProperties } from '@/models/torrent';
import type { AddTorrentOptions } from '@/services/adapters/interface';
import { DownloaderFactory } from '@/services/adapters/factory';
import { useAppStore } from './app';
import { safeStorage } from '@/utils/storage';

export const useTorrentStore = defineStore('torrentStore', () => {
  const appStore = useAppStore();
  const torrents = shallowRef<UnifiedTorrent[]>([]);
  const globalState = ref<GlobalState | null>(null);
  const isPollingActive = ref(false);
  const isConnected = ref(false);
  const connectionError = ref<string | null>(null);

  const searchQuery = ref('');

  // Keep track of user custom categories locally in case the downloader doesn't support writing them
  const customCategories = ref<string[]>(
    safeStorage.getJSON('torrenta_custom_categories', [])
  );

  // Keep track of user custom tags locally and system tags from qBittorrent
  const customTags = ref<string[]>(
    safeStorage.getJSON('torrenta_custom_tags', [])
  );
  const systemTags = ref<string[]>([]);
  const simulatedTags = ref<string[]>(['Important', 'Entertainment', 'Work']);

  let driver: ReturnType<typeof DownloaderFactory.create> | null = null;
  let pollTimeoutId: any = null;
  let isFetching = false;
  const pendingStates = new Map<string, { status: UnifiedTorrent['status']; timestamp: number }>();

  const simulatedTorrents = ref<UnifiedTorrent[]>([]);
  const downloadQueue = ref<string[]>(safeStorage.getJSON('torrenta_download_queue', []));

  const simulatedTrackersMap = ref<Record<string, { url: string; tier: number }[]>>(
    safeStorage.getJSON('torrenta_simulated_trackers', {})
  );

  function saveSimulatedTrackers() {
    safeStorage.setJSON('torrenta_simulated_trackers', simulatedTrackersMap.value);
  }

  const SIMULATED_TEMPLATES = [
    { name: 'Ubuntu Desktop 26.04 LTS (x64) ISO', category: 'Software', status: 'downloading', size: 4831838208, initialProgress: 35.4 },
    { name: 'Inception 2010 2160p BluRay HEVC DTS-HD MA 5.1', category: 'Movies', status: 'downloading', size: 68719476736, initialProgress: 68.2 },
    { name: 'Daft Punk - Random Access Memories (FLAC 24bit)', category: 'Music', status: 'seeding', size: 943718400, initialProgress: 100 },
    { name: 'The Rust Programming Language 2nd Edition.pdf', category: 'Books', status: 'seeding', size: 15728640, initialProgress: 100 },
    { name: 'Big Buck Bunny Open Source Movie 4K', category: '', status: 'paused', size: 2147483648, initialProgress: 12.8 },
    { name: 'Arch Linux Installation Media Release.iso', category: 'Software', status: 'checking', size: 858993459, initialProgress: 88.5 },
    { name: 'Debian NetInst v12 x86_64 installer.iso', category: 'Software', status: 'queued', size: 419430400, initialProgress: 0 },
    { name: 'Corrupted Download File Sample.zip', category: '', status: 'error', size: 1073741824, initialProgress: 42.1 },
  ];

  function updateQueueStatus() {
    if (!appStore.simulationMode) return;

    // Get all simulated torrents that are not finished (progress < 100) and not paused/error/checking
    const activeTorrents = simulatedTorrents.value.filter(
      (t) => t.progress < 100 && t.status !== 'paused' && t.status !== 'error' && t.status !== 'checking'
    );

    // Sync downloadQueue: remove deleted torrents, add missing torrents
    const activeIds = new Set(activeTorrents.map((t) => t.id));
    
    // Clean queue of ids that don't exist anymore or are completed
    let currentQueue = downloadQueue.value.filter((id) => activeIds.has(id));

    // Add any missing active ids to the queue (bottom)
    activeTorrents.forEach((t) => {
      if (!currentQueue.includes(t.id)) {
        currentQueue.push(t.id);
      }
    });

    downloadQueue.value = currentQueue;
    safeStorage.setJSON('torrenta_download_queue', currentQueue);

    // Limit to 2 concurrent downloads
    const maxDownloads = 2;

    simulatedTorrents.value = simulatedTorrents.value.map((t) => {
      if (t.progress >= 100) {
        if (t.status === 'downloading' || t.status === 'queued') {
          return {
            ...t,
            status: 'seeding',
            downloadSpeed: 0,
            uploadSpeed: Math.floor((Math.random() * 5 + 1) * 1024 * 1024),
            eta: 0,
          };
        }
        return t;
      }

      if (t.status === 'paused' || t.status === 'error' || t.status === 'checking') {
        return t;
      }

      // Now it's either downloading or queued
      const queueIndex = currentQueue.indexOf(t.id);
      if (queueIndex !== -1 && queueIndex < maxDownloads) {
        // It is allowed to download!
        const dlSpeed = t.downloadSpeed > 0 ? t.downloadSpeed : Math.floor((Math.random() * 15 + 5) * 1024 * 1024);
        const ulSpeed = t.uploadSpeed > 0 ? t.uploadSpeed : Math.floor((Math.random() * 500 + 100) * 1024);
        return {
          ...t,
          status: 'downloading',
          downloadSpeed: dlSpeed,
          uploadSpeed: ulSpeed,
        };
      } else {
        // It must queue!
        return {
          ...t,
          status: 'queued',
          downloadSpeed: 0,
          uploadSpeed: 0,
          eta: 0,
        };
      }
    });
  }

  function resetSimulatedData() {
    const count = appStore.simulatedCount;
    const list: UnifiedTorrent[] = [];
    for (let i = 0; i < count; i++) {
      const template = SIMULATED_TEMPLATES[i % SIMULATED_TEMPLATES.length];
      const index = Math.floor(i / SIMULATED_TEMPLATES.length);
      const suffix = index > 0 ? ` #${index + 1}` : '';
      const id = `mock-hash-${i}-${template.name.replace(/\s+/g, '-').toLowerCase()}`;
      
      let dlSpeed = 0;
      let ulSpeed = 0;
      if (template.status === 'downloading') {
        dlSpeed = Math.floor((Math.random() * 15 + 5) * 1024 * 1024); // 5 - 20 MB/s
        ulSpeed = Math.floor((Math.random() * 500 + 100) * 1024); // 100 - 600 KB/s
      } else if (template.status === 'seeding') {
        ulSpeed = Math.floor((Math.random() * 5 + 1) * 1024 * 1024); // 1 - 6 MB/s
      }

      const mockSeeds = template.status === 'seeding' ? Math.floor(Math.random() * 20 + 5) : (template.status === 'downloading' ? Math.floor(Math.random() * 8 + 1) : 0);
      const mockSeedsTotal = mockSeeds + Math.floor(Math.random() * 50);
      const mockPeers = template.status === 'downloading' ? Math.floor(Math.random() * 30 + 10) : (template.status === 'seeding' ? Math.floor(Math.random() * 5) : 0);
      const mockPeersTotal = mockPeers + Math.floor(Math.random() * 100);
      const mockRatio = template.status === 'seeding' ? parseFloat((Math.random() * 3 + 1).toFixed(2)) : (template.status === 'downloading' ? parseFloat((Math.random() * 0.1).toFixed(2)) : 0);
      const mockUploaded = Math.floor(template.size * mockRatio * (Math.random() * 0.2 + 0.9));
      const mockAddedOn = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 10);
      const mockCompletionOn = template.status === 'seeding' || (template.status === 'paused' && template.initialProgress === 100) ? mockAddedOn + Math.floor(Math.random() * 3600 * 5) : 0;

      // Assign random mock tags
      const possibleTags = ['Important', 'Work', 'Entertainment'];
      const mockTags = [];
      if (Math.random() > 0.4) {
        mockTags.push(possibleTags[i % possibleTags.length]);
      }
      if (Math.random() > 0.8) {
        mockTags.push(possibleTags[(i + 1) % possibleTags.length]);
      }

      list.push({
        id,
        name: `[Mock] ${template.name}${suffix}`,
        progress: template.initialProgress,
        size: template.size,
        downloadSpeed: dlSpeed,
        uploadSpeed: ulSpeed,
        status: template.status as UnifiedTorrent['status'],
        eta: template.status === 'downloading' ? Math.floor(Math.random() * 3600 + 120) : 0,
        category: template.category,
        ratio: mockRatio,
        num_seeds: mockSeeds,
        num_seeds_total: mockSeedsTotal,
        num_peers: mockPeers,
        num_peers_total: mockPeersTotal,
        uploaded: mockUploaded,
        tracker: 'udp://tracker.coppersurfer.tk:6969/announce',
        added_on: mockAddedOn,
        completion_on: mockCompletionOn,
        savepath: template.category ? `/downloads/${template.category.toLowerCase()}` : '/downloads/unclassified',
        tags: mockTags,
      });
    }
    simulatedTorrents.value = list;
    
    // Ensure mock categories are configured in appStore
    ['Movies', 'Music', 'Software', 'Books'].forEach(cat => {
      appStore.addCategory(cat);
    });
  }

  const categories = computed(() => {
    const list = new Set<string>();
    // Collect from current active torrents
    torrents.value.forEach((t) => {
      if (t.category) {
        list.add(t.category);
      }
    });
    // Add custom defined categories
    customCategories.value.forEach((c) => list.add(c));
    // Add custom categories configured in appStore
    appStore.categoryConfigs.forEach((c) => list.add(c.name));
    return Array.from(list);
  });

  function addCustomCategory(cat: string) {
    const clean = cat.trim();
    if (clean && !customCategories.value.includes(clean)) {
      customCategories.value.push(clean);
      safeStorage.setJSON(
        'torrenta_custom_categories',
        customCategories.value
      );
    }
  }

  function removeCustomCategory(cat: string) {
    customCategories.value = customCategories.value.filter((c) => c !== cat);
    safeStorage.setJSON(
      'torrenta_custom_categories',
      customCategories.value
    );
  }

  async function createCategory(name: string, savePath?: string): Promise<boolean> {
    const cleanName = name.trim();
    if (!cleanName) return false;

    if (appStore.simulationMode) {
      appStore.addCategory(cleanName);
      return true;
    }

    if (!driver) return false;
    const success = await driver.createCategory(cleanName, savePath);
    if (success) {
      appStore.addCategory(cleanName);
    }
    return success;
  }

  async function removeCategory(name: string): Promise<boolean> {
    const cleanName = name.trim();
    if (!cleanName) return false;

    if (appStore.simulationMode) {
      appStore.removeCategory(cleanName);
      return true;
    }

    if (!driver) return false;
    const success = await driver.removeCategories([cleanName]);
    if (success) {
      appStore.removeCategory(cleanName);
    }
    return success;
  }

  const tags = computed(() => {
    const list = new Set<string>();
    torrents.value.forEach((t) => {
      if (t.tags) {
        t.tags.forEach((tag) => list.add(tag));
      }
    });
    if (appStore.simulationMode) {
      simulatedTags.value.forEach((tag) => list.add(tag));
    } else {
      systemTags.value.forEach((tag) => list.add(tag));
    }
    customTags.value.forEach((tag) => list.add(tag));
    return Array.from(list).sort();
  });

  function addCustomTag(tag: string) {
    const clean = tag.trim();
    if (clean && !customTags.value.includes(clean)) {
      customTags.value.push(clean);
      safeStorage.setJSON(
        'torrenta_custom_tags',
        customTags.value
      );
    }
  }

  function removeCustomTag(tag: string) {
    customTags.value = customTags.value.filter((t) => t !== tag);
    safeStorage.setJSON(
      'torrenta_custom_tags',
      customTags.value
    );
  }

  async function bootClient() {
    connectionError.value = null;

    if (appStore.simulationMode) {
      if (simulatedTorrents.value.length === 0) {
        resetSimulatedData();
      }
      isConnected.value = true;
      isPollingActive.value = true;
      triggerSyncLoop();
      return true;
    }

    try {
      // Check for autologin credentials served by the Nginx proxy
      try {
        const res = await window.fetch('/api/torrenta-autologin');
        if (res.ok) {
          const data = await res.json();
          if (data && data.username && data.password) {
            // Update config if username or password has changed
            if (appStore.username !== data.username || appStore.password !== data.password) {
              appStore.saveConfig('', data.username, data.password, 'qbittorrent');
            }
          }
        }
      } catch (e) {
        // Safe to ignore, endpoint might not exist (e.g. in Alternative WebUI mode)
      }

      driver = DownloaderFactory.create(appStore.driverType);
      const success = await driver.connect(
        appStore.url,
        appStore.username,
        appStore.password
      );
      if (success) {
        isConnected.value = true;
        isPollingActive.value = true;
        triggerSyncLoop();
        return true;
      }
      return false;
    } catch (err: any) {
      isConnected.value = false;
      isPollingActive.value = false;
      connectionError.value = err.message || 'Connection failed';
      stopSyncLoop();
      throw err;
    }
  }

  function stopSyncLoop() {
    isPollingActive.value = false;
    if (pollTimeoutId) {
      clearTimeout(pollTimeoutId);
      pollTimeoutId = null;
    }
  }

  function triggerSyncLoop() {
    stopSyncLoop();
    isPollingActive.value = true;

    async function poll() {
      if (!isPollingActive.value) return;
      if (isFetching) return;

      isFetching = true;
      try {
        if (appStore.simulationMode) {
          if (simulatedTorrents.value.length === 0) {
            resetSimulatedData();
          }

          // Sync simulation queue status before progress tick
          updateQueueStatus();

          // Tick simulated torrents
          simulatedTorrents.value = simulatedTorrents.value.map((t) => {
            const next = { ...t };
            if (next.status === 'downloading') {
              // Fluctuate speed +/- 15%
              const ratio = 0.85 + Math.random() * 0.3;
              next.downloadSpeed = Math.max(1024 * 1024, Math.floor(next.downloadSpeed * ratio));
              next.uploadSpeed = Math.max(10 * 1024, Math.floor(next.uploadSpeed * ratio));
              
              // Increment progress: speed in bytes/sec * 1.5s
              const delta = next.size > 0 ? (next.downloadSpeed * 1.5) / next.size * 100 : 0;
              next.progress = Math.min(100, next.progress + delta);
              
              if (next.progress >= 100) {
                next.progress = 100;
                next.status = 'seeding';
                next.downloadSpeed = 0;
                next.uploadSpeed = Math.floor((Math.random() * 3 + 1) * 1024 * 1024);
                next.eta = 0;
              } else {
                next.eta = next.downloadSpeed > 0
                  ? Math.max(1, Math.round(((next.size * (1 - next.progress / 100)) / next.downloadSpeed)))
                  : 0;
              }
            } else if (next.status === 'seeding') {
              const ratio = 0.9 + Math.random() * 0.2;
              next.uploadSpeed = Math.max(512 * 1024, Math.floor(next.uploadSpeed * ratio));
              next.ratio += next.size > 0 ? (next.uploadSpeed * 1.5) / next.size : 0;
              next.ratio = parseFloat(next.ratio.toFixed(2));
            } else if (next.status === 'checking') {
              next.progress = Math.min(100, next.progress + Math.random() * 4 + 2);
              if (next.progress >= 100) {
                next.progress = 10;
                next.status = 'downloading';
                next.downloadSpeed = Math.floor((Math.random() * 15 + 5) * 1024 * 1024);
              }
            }
            return next;
          });

          // Calculate global stats
          let totalDL = 0;
          let totalUL = 0;
          simulatedTorrents.value.forEach((t) => {
            totalDL += t.downloadSpeed;
            totalUL += t.uploadSpeed;
          });

          // Free space starting at 1.2TB and declining slightly
          const initialFree = 1200 * 1024 * 1024 * 1024;
          const totalDownloaded = simulatedTorrents.value.reduce((acc, t) => acc + (t.size * (t.progress / 100)), 0);
          const currentFree = Math.max(10 * 1024 * 1024 * 1024, initialFree - totalDownloaded);

          torrents.value = [...simulatedTorrents.value];
          globalState.value = {
            globalDownloadSpeed: totalDL,
            globalUploadSpeed: totalUL,
            freeSpaceOnDisk: currentFree,
            allTorrentsCount: simulatedTorrents.value.length,
          };
          isConnected.value = true;
        } else {
          if (!driver) {
            driver = DownloaderFactory.create(appStore.driverType);
          }

          // Concurrency Guard: execute getTorrents, getGlobalState, getTags and getCategories concurrently
          const [rawList, rawStats, rawTags, rawCategories] = await Promise.all([
            driver.getTorrents(),
            driver.getGlobalState(),
            driver.getTags(),
            driver.getCategories(),
          ]);

          // Reconcile categories from the server with appStore
          if (rawCategories) {
            appStore.syncCategories(Object.keys(rawCategories));
          }

          const now = Date.now();
          // Cleanup expired pending states (> 4000ms)
          for (const [id, value] of pendingStates.entries()) {
            if (now - value.timestamp > 4000) {
              pendingStates.delete(id);
            }
          }

          torrents.value = rawList.map((t) => {
            const pending = pendingStates.get(t.id);
            if (pending) {
              if (now - pending.timestamp < 2500) {
                // Enforce optimistic state unconditionally for 2.5s to let backend catch up
                return { ...t, status: pending.status };
              } else {
                // Time window expired, let server state take over and cleanup
                pendingStates.delete(t.id);
              }
            }
            return t;
          });
          globalState.value = rawStats;
          systemTags.value = rawTags;
          isConnected.value = true;
        }
      } catch (err) {
        console.error('Torrenta telemetry dropped sync:', err);
        // Do not throw to keep loop running, but register connection issue
        isConnected.value = false;
      } finally {
        isFetching = false;
        // Schedule next poll recursively to prevent HTTP queue clogging on slow routes
        if (isPollingActive.value) {
          pollTimeoutId = setTimeout(poll, 1500);
        }
      }
    }

    poll();
  }

  // Bulk Operations
  async function pauseTorrents(ids: string[]) {
    if (appStore.simulationMode) {
      simulatedTorrents.value = simulatedTorrents.value.map((t) => {
        if (ids.includes(t.id)) {
          return {
            ...t,
            status: 'paused',
            downloadSpeed: 0,
            uploadSpeed: 0,
          };
        }
        return t;
      });
      torrents.value = [...simulatedTorrents.value];
      return true;
    }

    if (!driver) return false;

    const matchAll = ids.includes('all');
    const resolvedIds = matchAll ? torrents.value.map((t) => t.id) : ids;
    
    // Optimistic state: set pendingState immediately
    resolvedIds.forEach((id) => {
      pendingStates.set(id, { status: 'paused', timestamp: Date.now() });
    });
    
    // Update local UI immediately
    torrents.value = torrents.value.map((t) =>
      (matchAll || ids.includes(t.id)) ? { ...t, status: 'paused' as const } : t
    );

    const success = await driver.pauseTorrents(ids);
    if (!success) {
      // Revert optimistic state on failure
      resolvedIds.forEach((id) => {
        pendingStates.delete(id);
      });
      triggerSyncLoop();
    }
    return success;
  }

  async function resumeTorrents(ids: string[]) {
    if (appStore.simulationMode) {
      simulatedTorrents.value = simulatedTorrents.value.map((t) => {
        if (ids.includes(t.id)) {
          const isComplete = t.progress >= 100;
          return {
            ...t,
            status: isComplete ? 'seeding' : 'downloading',
            downloadSpeed: isComplete ? 0 : Math.floor((Math.random() * 15 + 5) * 1024 * 1024),
            uploadSpeed: isComplete ? Math.floor((Math.random() * 5 + 1) * 1024 * 1024) : Math.floor((Math.random() * 500 + 100) * 1024),
          };
        }
        return t;
      });
      torrents.value = [...simulatedTorrents.value];
      return true;
    }

    if (!driver) return false;

    const matchAll = ids.includes('all');
    const resolvedIds = matchAll ? torrents.value.map((t) => t.id) : ids;

    // Optimistic state: set pendingState immediately
    resolvedIds.forEach((id) => {
      const t = torrents.value.find((x) => x.id === id);
      const targetStatus = (t && t.progress >= 100) ? 'seeding' : 'downloading';
      pendingStates.set(id, { status: targetStatus, timestamp: Date.now() });
    });

    // Update local UI immediately
    torrents.value = torrents.value.map((t) => {
      if (matchAll || ids.includes(t.id)) {
        const targetStatus = t.progress >= 100 ? ('seeding' as const) : ('downloading' as const);
        return { ...t, status: targetStatus };
      }
      return t;
    });

    const success = await driver.resumeTorrents(ids);
    if (!success) {
      // Revert optimistic state on failure
      resolvedIds.forEach((id) => {
        pendingStates.delete(id);
      });
      triggerSyncLoop();
    }
    return success;
  }

  async function deleteTorrents(ids: string[], deleteData: boolean) {
    if (appStore.simulationMode) {
      simulatedTorrents.value = simulatedTorrents.value.filter((t) => !ids.includes(t.id));
      torrents.value = [...simulatedTorrents.value];
      if (globalState.value) {
        globalState.value.allTorrentsCount = simulatedTorrents.value.length;
      }
      return true;
    }

    if (!driver) return false;
    const success = await driver.deleteTorrents(ids, deleteData);
    if (success) {
      // Filter out deleted elements
      torrents.value = torrents.value.filter((t) => !ids.includes(t.id));
    }
    return success;
  }

  async function pauseAll() {
    if (appStore.simulationMode) {
      // 模拟模式：更新所有未暂停的种子
      const ids = simulatedTorrents.value
        .filter((t) => t.status !== 'paused')
        .map((t) => t.id);
      return pauseTorrents(ids);
    }
    // 实际 API：直接传 'all'，让 qBittorrent 一次性暫停所有种子
    return pauseTorrents(['all']);
  }

  async function resumeAll() {
    if (appStore.simulationMode) {
      // 模拟模式：只恢复已暂停的种子
      const ids = simulatedTorrents.value
        .filter((t) => t.status === 'paused')
        .map((t) => t.id);
      return resumeTorrents(ids);
    }
    // 实际 API：直接传 'all'，让 qBittorrent 一次性开始所有种子
    return resumeTorrents(['all']);
  }

  async function addTorrents(options: AddTorrentOptions) {
    const shouldPause = options.paused !== undefined ? options.paused : appStore.doNotStart;
    const shouldAddToTop = options.addToTopOfQueue !== undefined ? options.addToTopOfQueue : appStore.addToTopOfQueue;

    if (appStore.simulationMode) {
      let torrentName = 'Added Torrent';
      if (options.files && options.files.length > 0) {
        torrentName = options.files[0].name;
      } else if (options.urls) {
        const lines = options.urls.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          const first = lines[0];
          if (first.startsWith('magnet:')) {
            const dn = new URLSearchParams(first.split('?')[1] || '').get('dn');
            torrentName = dn ? decodeURIComponent(dn) : 'Magnet Link Download';
          } else {
            const parts = first.split('/');
            torrentName = parts[parts.length - 1] || 'URL Download';
          }
        }
      }

      const size = Math.floor((Math.random() * 4 + 1) * 1024 * 1024 * 1024); // 1GB - 5GB
      const id = `mock-hash-added-${Date.now()}`;
      
      const newTorrent: UnifiedTorrent = {
        id,
        name: `[Mock] ${torrentName}`,
        progress: 0,
        size,
        downloadSpeed: shouldPause ? 0 : Math.floor((Math.random() * 15 + 5) * 1024 * 1024),
        uploadSpeed: shouldPause ? 0 : Math.floor((Math.random() * 500 + 100) * 1024),
        status: shouldPause ? 'paused' : 'downloading',
        eta: shouldPause ? 0 : Math.floor(Math.random() * 3600 + 120),
        category: options.category || '',
        ratio: 0,
      };

      if (!shouldPause) {
        if (shouldAddToTop) {
          downloadQueue.value.unshift(id);
        } else {
          downloadQueue.value.push(id);
        }
        safeStorage.setJSON('torrenta_download_queue', downloadQueue.value);
      }

      simulatedTorrents.value.unshift(newTorrent);
      torrents.value = [...simulatedTorrents.value];
      if (globalState.value) {
        globalState.value.allTorrentsCount = simulatedTorrents.value.length;
      }
      return true;
    }

    if (!driver) return false;
    const finalOptions: AddTorrentOptions = {
      ...options,
      paused: shouldPause,
      addToTopOfQueue: shouldAddToTop,
    };
    const success = await driver.addTorrents(finalOptions);
    if (success) {
      triggerSyncLoop();
    }
    return success;
  }

  async function changeCredentials(username: string, password?: string) {
    if (appStore.simulationMode) {
      appStore.saveConfig(appStore.url, username, password || '', appStore.driverType);
      return true;
    }

    if (!driver) {
      throw new Error('Downloader client is not connected');
    }

    const success = await driver.changeCredentials(username, password);
    if (success) {
      appStore.saveConfig(
        appStore.url,
        username,
        password !== undefined && password !== '' ? password : appStore.password,
        appStore.driverType
      );
      await bootClient();
    }
    return success;
  }

  async function getPreferences(): Promise<Record<string, any>> {
    if (appStore.simulationMode) {
      return {
        preallocate_all: safeStorage.getItem('torrenta_preallocate_all') === 'true',
        incomplete_files_ext: safeStorage.getItem('torrenta_incomplete_files_ext') === 'true',
        use_unwanted_folder: safeStorage.getItem('torrenta_use_unwanted_folder') === 'true',
        auto_tmm_enabled: safeStorage.getItem('torrenta_auto_tmm_enabled') !== 'false', // Default to true or active TMM
        torrent_changed_tmm_enabled: safeStorage.getItem('torrenta_torrent_changed_tmm_enabled') === 'true',
        save_path_changed_tmm_enabled: safeStorage.getItem('torrenta_save_path_changed_tmm_enabled') === 'true',
        category_changed_tmm_enabled: safeStorage.getItem('torrenta_category_changed_tmm_enabled') === 'true',
        use_category_paths_in_manual_mode: safeStorage.getItem('torrenta_use_category_paths_in_manual_mode') === 'true',
        export_dir: safeStorage.getItem('torrenta_export_dir') || '',
        export_dir_fin: safeStorage.getItem('torrenta_export_dir_fin') || '',
        download_in_scan_dirs: safeStorage.getItem('torrenta_download_in_scan_dirs') === 'true',
        scan_dirs: safeStorage.getJSON('torrenta_scan_dirs', {}),
        up_limit: parseInt(safeStorage.getItem('torrenta_up_limit') || '0'),
        dl_limit: parseInt(safeStorage.getItem('torrenta_dl_limit') || '0'),
        alt_up_limit: parseInt(safeStorage.getItem('torrenta_alt_up_limit') || '51200'), // Default 50 KiB/s
        alt_dl_limit: parseInt(safeStorage.getItem('torrenta_alt_dl_limit') || '102400'), // Default 100 KiB/s
        scheduler_enabled: safeStorage.getItem('torrenta_scheduler_enabled') === 'true',
        schedule_from_hour: parseInt(safeStorage.getItem('torrenta_schedule_from_hour') || '8'),
        schedule_from_min: parseInt(safeStorage.getItem('torrenta_schedule_from_min') || '0'),
        schedule_to_hour: parseInt(safeStorage.getItem('torrenta_schedule_to_hour') || '20'),
        schedule_to_min: parseInt(safeStorage.getItem('torrenta_schedule_to_min') || '0'),
        scheduler_days: parseInt(safeStorage.getItem('torrenta_scheduler_days') || '0'),
        bittorrent_protocol: parseInt(safeStorage.getItem('torrenta_bittorrent_protocol') || '0'),
        listen_port: parseInt(safeStorage.getItem('torrenta_listen_port') || '45682'),
        upnp: safeStorage.getItem('torrenta_upnp') !== 'false', // Default to true
        max_connec: parseInt(safeStorage.getItem('torrenta_max_connec') || '500'),
        max_connec_per_torrent: parseInt(safeStorage.getItem('torrenta_max_connec_per_torrent') || '100'),
        max_uploads: parseInt(safeStorage.getItem('torrenta_max_uploads') || '80'),
        max_uploads_per_torrent: parseInt(safeStorage.getItem('torrenta_max_uploads_per_torrent') || '20'),
        proxy_type: parseInt(safeStorage.getItem('torrenta_proxy_type') || '-1'),
        proxy_ip: safeStorage.getItem('torrenta_proxy_ip') || '',
        proxy_port: parseInt(safeStorage.getItem('torrenta_proxy_port') || '8080'),
        proxy_peer_connections: safeStorage.getItem('torrenta_proxy_peer_connections') === 'true',
        proxy_username: safeStorage.getItem('torrenta_proxy_username') || '',
        proxy_password: safeStorage.getItem('torrenta_proxy_password') || '',
      };
    }

    if (!driver) {
      throw new Error('Downloader client is not connected');
    }

    return await driver.getPreferences();
  }

  async function setPreferences(prefs: Record<string, any>): Promise<boolean> {
    if (appStore.simulationMode) {
      const keys = [
        'preallocate_all',
        'incomplete_files_ext',
        'use_unwanted_folder',
        'auto_tmm_enabled',
        'torrent_changed_tmm_enabled',
        'save_path_changed_tmm_enabled',
        'category_changed_tmm_enabled',
        'use_category_paths_in_manual_mode',
        'export_dir',
        'export_dir_fin',
        'download_in_scan_dirs',
        'up_limit',
        'dl_limit',
        'alt_up_limit',
        'alt_dl_limit',
        'scheduler_enabled',
        'schedule_from_hour',
        'schedule_from_min',
        'schedule_to_hour',
        'schedule_to_min',
        'scheduler_days',
        'bittorrent_protocol',
        'listen_port',
        'upnp',
        'max_connec',
        'max_connec_per_torrent',
        'max_uploads',
        'max_uploads_per_torrent',
        'proxy_type',
        'proxy_ip',
        'proxy_port',
        'proxy_peer_connections',
        'proxy_username',
        'proxy_password',
      ];
      for (const key of keys) {
        if (prefs[key] !== undefined) {
          safeStorage.setItem(`torrenta_${key}`, String(prefs[key]));
        }
      }
      if (prefs.scan_dirs !== undefined) {
        safeStorage.setJSON('torrenta_scan_dirs', prefs.scan_dirs);
      }
      return true;
    }

    if (!driver) {
      throw new Error('Downloader client is not connected');
    }

    return await driver.setPreferences(prefs);
  }

  async function getTorrentProperties(id: string): Promise<TorrentProperties | null> {
    if (appStore.simulationMode) {
      const t = simulatedTorrents.value.find((x) => x.id === id);
      if (!t) return null;
      const pieceSize = t.size > 1024 * 1024 * 100 ? 4 * 1024 * 1024 : 1024 * 1024;
      return {
        save_path: t.savepath || '/downloads/unclassified',
        creation_date: (t.added_on ?? 0) - 3600 * 2,
        piece_size: pieceSize,
        num_pieces: Math.ceil(t.size / pieceSize),
        comment: 'https://torrenta-mock-tracker.org/details/' + id,
        total_wasted: Math.floor(Math.random() * 1024 * 1024 * 10),
        total_uploaded: t.uploaded ?? 0,
        total_uploaded_session: Math.floor((t.uploaded ?? 0) * 0.05),
        total_downloaded: Math.floor(t.size * (t.progress / 100)),
        total_downloaded_session: t.status === 'downloading' ? Math.floor(t.size * 0.01) : 0,
        up_limit: -1,
        dl_limit: -1,
        time_elapsed: 80 * 86400 + 13 * 3600 + Math.floor(Date.now() / 1000) % 3600,
        seeding_time: t.status === 'seeding' ? 80 * 86400 + 13 * 3600 + Math.floor(Date.now() / 1000) % 3600 : 0,
        connection_limit: 200,
        share_ratio: t.ratio,
        addition_date: t.added_on ?? 0,
        completion_date: t.completion_on ?? 0,
        created_by: 'dottorrent-gui/1.3.11 (https://github.com/kz26/dottorrent-gui)',
        average_download_speed: t.status === 'downloading' ? 3 * 1024 * 1024 + 102400 : 0,
        average_upload_speed: t.status === 'seeding' ? 6 * 1024 * 1024 + 500 : 6,
        peers: t.num_peers ?? 0,
        peers_total: t.num_peers_total ?? 0,
        seeds: t.num_seeds ?? 0,
        seeds_total: t.num_seeds_total ?? 0,
        last_seen: t.completion_on || Math.floor(Date.now() / 1000) - 30,
        is_private: true,
      };
    }

    if (!driver) return null;
    return await driver.getTorrentProperties(id);
  }

  async function forceStartTorrents(ids: string[]): Promise<boolean> {
    if (appStore.simulationMode) {
      simulatedTorrents.value = simulatedTorrents.value.map((t) => {
        if (ids.includes(t.id)) {
          const isComplete = t.progress >= 100;
          return {
            ...t,
            status: isComplete ? 'seeding' as const : 'downloading' as const,
            downloadSpeed: isComplete ? 0 : Math.floor((Math.random() * 25 + 15) * 1024 * 1024),
            uploadSpeed: isComplete ? Math.floor((Math.random() * 8 + 3) * 1024 * 1024) : Math.floor((Math.random() * 800 + 300) * 1024),
          };
        }
        return t;
      });
      torrents.value = [...simulatedTorrents.value];
      return true;
    }

    if (!driver) return false;
    const success = await driver.forceStartTorrents(ids);
    if (success) {
      triggerSyncLoop();
    }
    return success;
  }

  async function setTorrentsLocation(ids: string[], location: string): Promise<boolean> {
    if (appStore.simulationMode) {
      simulatedTorrents.value = simulatedTorrents.value.map((t) => {
        if (ids.includes(t.id)) {
          return {
            ...t,
            savepath: location,
          };
        }
        return t;
      });
      torrents.value = [...simulatedTorrents.value];
      return true;
    }

    if (!driver) return false;
    const success = await driver.setTorrentsLocation(ids, location);
    if (success) {
      triggerSyncLoop();
    }
    return success;
  }

  async function renameTorrent(id: string, name: string): Promise<boolean> {
    if (appStore.simulationMode) {
      simulatedTorrents.value = simulatedTorrents.value.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            name: `[Mock] ${name}`,
          };
        }
        return t;
      });
      torrents.value = [...simulatedTorrents.value];
      return true;
    }

    if (!driver) return false;
    const success = await driver.renameTorrent(id, name);
    if (success) {
      triggerSyncLoop();
    }
    return success;
  }

  async function addTorrentTags(ids: string[], tagsList: string[]): Promise<boolean> {
    if (appStore.simulationMode) {
      simulatedTorrents.value = simulatedTorrents.value.map((t) => {
        if (ids.includes(t.id)) {
          const currentTags = t.tags || [];
          const merged = Array.from(new Set([...currentTags, ...tagsList]));
          return {
            ...t,
            tags: merged,
          };
        }
        return t;
      });
      torrents.value = [...simulatedTorrents.value];
      return true;
    }

    if (!driver) return false;
    const success = await driver.addTorrentTags(ids, tagsList);
    if (success) {
      triggerSyncLoop();
    }
    return success;
  }

  async function removeTorrentTags(ids: string[], tagsList: string[]): Promise<boolean> {
    if (appStore.simulationMode) {
      simulatedTorrents.value = simulatedTorrents.value.map((t) => {
        if (ids.includes(t.id)) {
          const currentTags = t.tags || [];
          const filtered = currentTags.filter((tag) => !tagsList.includes(tag));
          return {
            ...t,
            tags: filtered,
          };
        }
        return t;
      });
      torrents.value = [...simulatedTorrents.value];
      return true;
    }

    if (!driver) return false;
    const success = await driver.removeTorrentTags(ids, tagsList);
    if (success) {
      triggerSyncLoop();
    }
    return success;
  }

  async function setTorrentTags(ids: string[], tagsList: string[]): Promise<boolean> {
    if (appStore.simulationMode) {
      simulatedTorrents.value = simulatedTorrents.value.map((t) => {
        if (ids.includes(t.id)) {
          return {
            ...t,
            tags: tagsList,
          };
        }
        return t;
      });
      torrents.value = [...simulatedTorrents.value];
      return true;
    }

    if (!driver) return false;
    const success = await driver.setTorrentTags(ids, tagsList);
    if (success) {
      triggerSyncLoop();
    }
    return success;
  }

  async function createTags(tagsList: string[]): Promise<boolean> {
    if (appStore.simulationMode) {
      tagsList.forEach((tag) => {
        const clean = tag.trim();
        if (clean && !simulatedTags.value.includes(clean)) {
          simulatedTags.value.push(clean);
        }
      });
      return true;
    }

    if (!driver) return false;
    const success = await driver.createTags(tagsList);
    if (success) {
      triggerSyncLoop();
    }
    return success;
  }

  async function deleteTags(tagsList: string[]): Promise<boolean> {
    if (appStore.simulationMode) {
      simulatedTags.value = simulatedTags.value.filter((t) => !tagsList.includes(t));
      simulatedTorrents.value = simulatedTorrents.value.map((t) => {
        if (t.tags) {
          return {
            ...t,
            tags: t.tags.filter((tag) => !tagsList.includes(tag)),
          };
        }
        return t;
      });
      torrents.value = [...simulatedTorrents.value];
      return true;
    }

    if (!driver) return false;
    const success = await driver.deleteTags(tagsList);
    if (success) {
      triggerSyncLoop();
    }
    return success;
  }

  async function getTorrentTrackers(id: string): Promise<{ url: string; tier: number }[]> {
    if (appStore.simulationMode) {
      if (simulatedTrackersMap.value[id]) {
        return simulatedTrackersMap.value[id];
      }
      // Look up if this torrent exists to keep it consistent
      const torrent = simulatedTorrents.value.find(t => t.id === id);
      const firstTracker = torrent?.tracker || 'udp://tracker.coppersurfer.tk:6969/announce';
      const defaultTrackers = [
        { url: firstTracker, tier: 0 },
        { url: 'udp://tracker.leechers-paradise.org:6969/announce', tier: 0 },
        { url: 'http://tracker.torrenta-mock-tracker.org:80/announce', tier: 1 }
      ];
      simulatedTrackersMap.value[id] = defaultTrackers;
      saveSimulatedTrackers();
      return defaultTrackers;
    }

    if (!driver) return [];
    return await driver.getTorrentTrackers(id);
  }

  async function saveTorrentTrackers(
    ids: string[],
    trackers: { url: string; tier: number }[],
    policy?: 'append' | 'overwrite'
  ): Promise<boolean> {
    if (ids.length === 0) return true;
    
    // For multiple torrents, safety policy selection is mandatory
    if (ids.length > 1 && !policy) {
      console.error('Safety policy is mandatory for batch tracker editing');
      return false;
    }

    if (appStore.simulationMode) {
      ids.forEach((id) => {
        const current = simulatedTrackersMap.value[id] || [];
        
        if (ids.length > 1 && policy === 'append') {
          // Safe Append: keep original, append target trackers shifted by max current tier + 1
          const maxTier = current.length > 0 ? Math.max(...current.map(t => t.tier), 0) : -1;
          const nextTierBase = maxTier + 1;
          const appended = trackers.map(t => ({
            url: t.url,
            tier: nextTierBase + t.tier
          }));
          simulatedTrackersMap.value[id] = [...current, ...appended];
        } else {
          // Single task or Overwrite: replace completely
          simulatedTrackersMap.value[id] = trackers.map(t => ({ ...t }));
        }

        // Update main tracker url shown in torrent list
        const torrent = simulatedTorrents.value.find(t => t.id === id);
        if (torrent) {
          const list = simulatedTrackersMap.value[id] || [];
          torrent.tracker = list[0]?.url || '';
        }
      });

      torrents.value = [...simulatedTorrents.value];
      saveSimulatedTrackers();
      return true;
    }

    if (!driver) return false;

    try {
      for (const hash of ids) {
        const current = await driver.getTorrentTrackers(hash);
        
        let target: { url: string; tier: number }[] = [];
        if (ids.length > 1 && policy === 'append') {
          const maxTier = current.length > 0 ? Math.max(...current.map(t => t.tier), 0) : -1;
          const nextTierBase = maxTier + 1;
          target = [
            ...current,
            ...trackers.map(t => ({
              url: t.url,
              tier: nextTierBase + t.tier
            }))
          ];
        } else {
          target = trackers;
        }

        // 1. Remove all current external trackers to start fresh
        const allCurrentUrls = current.map(t => t.url);
        if (allCurrentUrls.length > 0) {
          await driver.removeTorrentTrackers(hash, allCurrentUrls);
        }

        // 2. Format target trackers into qBittorrent format where blank lines represent tier separators
        // Sort target by tier to ensure they are added in order
        const sortedTarget = [...target].sort((a, b) => a.tier - b.tier);
        
        // Compress tier gaps to ensure no empty tiers (which would cause double empty lines)
        const uniqueTiers = Array.from(new Set(sortedTarget.map(t => t.tier))).sort((a, b) => a - b);
        const tierMap = new Map(uniqueTiers.map((t, idx) => [t, idx]));
        const compressedTarget = sortedTarget.map(t => ({
          url: t.url,
          tier: tierMap.get(t.tier) ?? 0
        }));

        // Group by tier
        const maxTier = compressedTarget.length > 0 ? Math.max(...compressedTarget.map(t => t.tier), 0) : 0;
        const linesByTier: string[][] = Array.from({ length: maxTier + 1 }, () => []);
        compressedTarget.forEach(t => {
          if (t.tier >= 0 && t.tier <= maxTier) {
            linesByTier[t.tier].push(t.url);
          }
        });
        
        // Join with blank lines representing tier separation
        const formattedUrls = linesByTier.map(tierList => tierList.join('\n')).join('\n\n');

        // 3. Add all trackers at once with their correct tier separators
        if (formattedUrls.trim()) {
          await driver.addTorrentTrackers(hash, formattedUrls);
        }
      }

      triggerSyncLoop();
      return true;
    } catch (err) {
      console.error('Failed to save torrent trackers:', err);
      return false;
    }
  }

  return {
    torrents,
    globalState,
    isPollingActive,
    isConnected,
    connectionError,
    searchQuery,
    categories,
    tags,
    customTags,
    systemTags,
    resetSimulatedData,
    bootClient,
    stopSyncLoop,
    triggerSyncLoop,
    addCustomCategory,
    removeCustomCategory,
    createCategory,
    removeCategory,
    addCustomTag,
    removeCustomTag,
    pauseTorrents,
    resumeTorrents,
    deleteTorrents,
    pauseAll,
    resumeAll,
    addTorrents,
    changeCredentials,
    getPreferences,
    setPreferences,
    getTorrentProperties,
    forceStartTorrents,
    setTorrentsLocation,
    renameTorrent,
    addTorrentTags,
    removeTorrentTags,
    setTorrentTags,
    createTags,
    deleteTags,
    getTorrentTrackers,
    saveTorrentTrackers,
    downloadQueue,
  };
});
