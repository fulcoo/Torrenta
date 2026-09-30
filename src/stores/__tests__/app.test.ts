import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAppStore } from '../app';
import { safeStorage } from '@/utils/storage';

describe('appStore', () => {
  beforeEach(() => {
    localStorage.clear();
    // Initialize a new Pinia instance before each test
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('should initialize with default states', () => {
    const store = useAppStore();
    expect(store.url).toBe('');
    expect(store.username).toBe('');
    expect(store.driverType).toBe('qbittorrent');
    expect(store.locale).toBe('en'); // Defaults to 'en' in non-zh test runner environment
    expect(store.categoryConfigs).toEqual([]);
    expect(store.simulationMode).toBe(false);
  });

  it('should save config correctly', () => {
    const store = useAppStore();
    
    store.saveConfig('http://qbittorrent:8080', 'admin', 'password123', 'qbittorrent');

    expect(store.url).toBe('http://qbittorrent:8080');
    expect(store.username).toBe('admin');
    expect(store.password).toBe('password123');
    expect(store.driverType).toBe('qbittorrent');

    // Should also write to localStorage
    expect(safeStorage.getItem('torrenta_url')).toBe('http://qbittorrent:8080');
    expect(safeStorage.getItem('torrenta_username')).toBe('admin');
    expect(safeStorage.getItem('torrenta_password')).toBe('password123');
    expect(safeStorage.getItem('torrenta_driver_type')).toBe('qbittorrent');
  });

  it('should set theme and update document element attribute', () => {
    const store = useAppStore();
    const setAttrSpy = vi.spyOn(document.documentElement, 'setAttribute');

    store.setTheme('dracula');

    expect(store.theme).toBe('dracula');
    expect(safeStorage.getItem('torrenta_theme')).toBe('dracula');
    expect(setAttrSpy).toHaveBeenCalledWith('data-theme', 'dracula');
  });

  it('should set locale', () => {
    const store = useAppStore();

    store.setLocale('zh');

    expect(store.locale).toBe('zh');
    expect(safeStorage.getItem('torrenta_locale')).toBe('zh');
  });

  it('should add and remove categories', () => {
    const store = useAppStore();

    store.addCategory('Movies');
    expect(store.categoryConfigs).toHaveLength(1);
    expect(store.categoryConfigs[0]).toEqual({ name: 'Movies', paths: [] });

    // Should ignore duplicate category
    store.addCategory('Movies');
    expect(store.categoryConfigs).toHaveLength(1);

    // Remove category
    store.removeCategory('Movies');
    expect(store.categoryConfigs).toHaveLength(0);
  });

  it('should add and remove paths inside category', () => {
    const store = useAppStore();

    store.addCategory('Movies');
    store.addPathToCategory('Movies', '/downloads/movies');
    expect(store.categoryConfigs[0].paths).toEqual(['/downloads/movies']);

    // Ignore duplicate paths
    store.addPathToCategory('Movies', '/downloads/movies');
    expect(store.categoryConfigs[0].paths).toHaveLength(1);

    // Remove path
    store.removePathFromCategory('Movies', '/downloads/movies');
    expect(store.categoryConfigs[0].paths).toHaveLength(0);
  });

  it('should set simulation mode and simulated count', () => {
    const store = useAppStore();

    store.setSimulationMode(true);
    expect(store.simulationMode).toBe(true);
    expect(safeStorage.getItem('torrenta_simulation_mode')).toBe('true');

    store.setSimulatedCount(25);
    expect(store.simulatedCount).toBe(25);
    expect(safeStorage.getItem('torrenta_simulated_count')).toBe('25');
  });

  it('should set advanced defaults options correctly', () => {
    const store = useAppStore();

    store.setSkipChecking(true);
    expect(store.skipChecking).toBe(true);
    expect(safeStorage.getItem('torrenta_skip_checking')).toBe('true');

    store.setAutoTMM(true);
    expect(store.autoTMM).toBe(true);
    expect(safeStorage.getItem('torrenta_auto_tmm')).toBe('true');

    store.setContentLayout('Subfolder');
    expect(store.contentLayout).toBe('Subfolder');
    expect(safeStorage.getItem('torrenta_content_layout')).toBe('Subfolder');

    store.setStopCondition('MetadataReceived');
    expect(store.stopCondition).toBe('MetadataReceived');
    expect(safeStorage.getItem('torrenta_stop_condition')).toBe('MetadataReceived');

    store.setForced(true);
    expect(store.forced).toBe(true);
    expect(safeStorage.getItem('torrenta_forced')).toBe('true');

    store.setUseDownloadPath(true);
    expect(store.useDownloadPath).toBe(true);
    expect(safeStorage.getItem('torrenta_use_download_path')).toBe('true');

    store.setDownloadPath('/downloads/temp');
    expect(store.downloadPath).toBe('/downloads/temp');
    expect(safeStorage.getItem('torrenta_download_path')).toBe('/downloads/temp');

    store.setAutoDeleteMode(1);
    expect(store.autoDeleteMode).toBe(1);
    expect(safeStorage.getItem('torrenta_auto_delete_mode')).toBe('1');
  });

  it('should manage sidebar order, hidden, and collapsed states', () => {
    const store = useAppStore();

    store.setSidebarOrder(['category', 'status', 'tag']);
    expect(store.sidebarOrder).toEqual(['category', 'status', 'tag']);
    expect(safeStorage.getJSON('torrenta_sidebar_sections_order', [])).toEqual(['category', 'status', 'tag']);

    store.setSidebarHidden(['tracker', 'savepath']);
    expect(store.sidebarHidden).toEqual(['tracker', 'savepath']);
    expect(safeStorage.getJSON('torrenta_sidebar_sections_hidden', [])).toEqual(['tracker', 'savepath']);

    store.toggleSidebarCollapsed('category');
    expect(store.sidebarCollapsed.category).toBe(false); // Default was true, toggled to false
    expect(safeStorage.getJSON('torrenta_sidebar_collapsed', {} as any).category).toBe(false);
  });

  it('should hydrate settings from server via loadServerSettings', async () => {
    const store = useAppStore();

    const mockSettings = {
      appearance: { theme: 'cyberpunk', locale: 'zh' },
      category_mapping: {
        categoryConfigs: [{ name: 'Movies', paths: ['/media/movies'] }],
      },
      sidebar: {
        order: ['tag', 'category', 'status'],
        hidden: ['savepath'],
        collapsed: { status: true },
      },
      task_defaults: {
        autoTMM: false,
        downloadPath: '/data/downloads',
      },
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockSettings),
    }));

    await store.loadServerSettings();

    expect(store.theme).toBe('cyberpunk');
    expect(store.locale).toBe('zh');
    expect(store.categoryConfigs).toEqual([{ name: 'Movies', paths: ['/media/movies'] }]);
    expect(store.sidebarOrder).toEqual(['tag', 'category', 'status']);
    expect(store.sidebarHidden).toEqual(['savepath']);
    expect(store.autoTMM).toBe(false);
    expect(store.downloadPath).toBe('/data/downloads');
  });
});

