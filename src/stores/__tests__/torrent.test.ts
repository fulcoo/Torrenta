import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTorrentStore } from '../torrent';
import { useAppStore } from '../app';
import { safeStorage } from '@/utils/storage';

describe('torrentStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('should initialize with default states', () => {
    const store = useTorrentStore();
    expect(store.torrents).toEqual([]);
    expect(store.globalState).toBeNull();
    expect(store.isPollingActive).toBe(false);
    expect(store.isConnected).toBe(false);
    expect(store.searchQuery).toBe('');
    expect(store.categories).toEqual([]);
    expect(store.customTags).toEqual([]);
  });

  it('should manage custom categories', () => {
    const store = useTorrentStore();

    store.addCustomCategory('ISO');
    expect(store.categories).toContain('ISO');
    expect(safeStorage.getJSON('torrenta_custom_categories', [])).toEqual(['ISO']);

    // Ignore duplicates
    store.addCustomCategory('ISO');
    expect(store.categories).toContain('ISO');

    store.removeCustomCategory('ISO');
    expect(store.categories).not.toContain('ISO');
    expect(safeStorage.getJSON('torrenta_custom_categories', [])).toEqual([]);
  });

  it('should manage custom tags', () => {
    const store = useTorrentStore();

    store.addCustomTag('VIP');
    expect(store.customTags).toEqual(['VIP']);
    expect(safeStorage.getJSON('torrenta_custom_tags', [])).toEqual(['VIP']);

    // Ignore duplicates
    store.addCustomTag('VIP');
    expect(store.customTags).toEqual(['VIP']);

    store.removeCustomTag('VIP');
    expect(store.customTags).toEqual([]);
    expect(safeStorage.getJSON('torrenta_custom_tags', [])).toEqual([]);
  });

  it('should compute combined categories', () => {
    const appStore = useAppStore();
    const store = useTorrentStore();

    // 1. Categories from active torrents
    (store as any).torrents = [
      { id: '1', category: 'ActiveCategory' }
    ];

    // 2. Add custom category
    store.addCustomCategory('CustomCategory');

    // 3. Add appStore category
    appStore.addCategory('AppCategory');

    expect(store.categories.sort()).toEqual(['ActiveCategory', 'AppCategory', 'CustomCategory'].sort());
  });

  it('should boot client in simulation mode', async () => {
    // Enable simulation mode in appStore
    const appStore = useAppStore();
    appStore.setSimulationMode(true);
    appStore.setSimulatedCount(3);

    const store = useTorrentStore();

    // Mock window.fetch for auto login checking (which might run even in simulation on boot)
    // Actually, in simulationMode, bootClient returns early and does not call fetch.
    const success = await store.bootClient();

    expect(success).toBe(true);
    expect(store.isConnected).toBe(true);
    expect(store.isPollingActive).toBe(true);
  });

  it('should compute unique torrent save paths sorted by count and path', () => {
    const store = useTorrentStore();
    (store as any).torrents = [
      { id: '1', savepath: '/downloads/movies' },
      { id: '2', savepath: '/downloads/movies/' },
      { id: '3', savepath: '/downloads/tv' },
      { id: '4', savepath: '' },
    ];

    expect(store.torrentSavePaths).toEqual([
      { path: '/downloads/movies', count: 2 },
      { path: '/downloads/tv', count: 1 },
    ]);
  });

  it('should set torrents category in simulation mode', async () => {
    const appStore = useAppStore();
    appStore.setSimulationMode(true);
    appStore.setSimulatedCount(3);
    const store = useTorrentStore();
    await store.bootClient();

    const targetId = store.torrents[0].id;
    const res = await store.setTorrentsCategory([targetId], 'NewCat');
    expect(res).toBe(true);
    expect(store.torrents.find((t) => t.id === targetId)?.category).toBe('NewCat');
  });

  it('should use defaultCategory when adding torrents without category specified', async () => {
    const appStore = useAppStore();
    appStore.setSimulationMode(true);
    appStore.setDefaultCategory('DefaultMovies');

    const store = useTorrentStore();
    await store.addTorrents({ urls: 'https://example.com/test.torrent' });

    expect(store.torrents[0].category).toBe('DefaultMovies');
  });

  it('should support createCategory with savePath and editCategory', async () => {
    const appStore = useAppStore();
    appStore.setSimulationMode(true);

    const store = useTorrentStore();
    const created = await store.createCategory('Anime', '/downloads/anime');
    expect(created).toBe(true);

    const cat = appStore.categoryConfigs.find((c) => c.name === 'Anime');
    expect(cat).toBeDefined();
    expect(cat?.paths).toContain('/downloads/anime');

    const edited = await store.editCategory('Anime', '/downloads/anime_new');
    expect(edited).toBe(true);
  });

  it('should save trackers in simulation mode for single and multiple torrents', async () => {
    const appStore = useAppStore();
    appStore.setSimulationMode(true);
    appStore.setSimulatedCount(2);

    const store = useTorrentStore();
    await store.bootClient();

    const ids = store.torrents.map((t) => t.id);
    expect(ids.length).toBeGreaterThanOrEqual(2);

    // Single torrent overwrite
    const singleSuccess = await store.saveTorrentTrackers([ids[0]], [
      { url: 'http://tracker1.com/announce', tier: 0 },
      { url: 'http://tracker2.com/announce', tier: 1 },
    ]);
    expect(singleSuccess).toBe(true);
    const trackersSingle = await store.getTorrentTrackers(ids[0]);
    expect(trackersSingle).toHaveLength(2);

    // Multi torrent append
    const multiSuccess = await store.saveTorrentTrackers(
      [ids[0], ids[1]],
      [{ url: 'http://tracker3.com/announce', tier: 0 }],
      'append'
    );
    expect(multiSuccess).toBe(true);
  });
});
