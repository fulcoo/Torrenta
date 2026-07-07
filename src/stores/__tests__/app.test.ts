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
});
