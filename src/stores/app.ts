import { defineStore } from 'pinia';
import { ref } from 'vue';
import { safeStorage } from '@/utils/storage';

export interface CategoryConfig {
  name: string;
  paths: string[];
}

export const useAppStore = defineStore('appStore', () => {
  const url = ref(safeStorage.getItem('torrenta_url') || '');
  const username = ref(safeStorage.getItem('torrenta_username') || '');
  const password = ref(safeStorage.getItem('torrenta_password') || '');
  const driverType = ref<'qbittorrent' | 'transmission' | 'aria2'>(
    (safeStorage.getItem('torrenta_driver_type') as any) || 'qbittorrent'
  );
  const theme = ref(safeStorage.getItem('torrenta_theme') || 'dracula');
  const locale = ref<'zh' | 'en'>(
    (safeStorage.getItem('torrenta_locale') as any) || 
    (typeof navigator !== 'undefined' && navigator.language?.startsWith('zh') ? 'zh' : 'en')
  );
  const categoryConfigs = ref<CategoryConfig[]>(
    safeStorage.getJSON('torrenta_category_configs', [])
  );
  const simulationMode = ref(import.meta.env.DEV && safeStorage.getItem('torrenta_simulation_mode') === 'true');
  const simulatedCount = ref(parseInt(safeStorage.getItem('torrenta_simulated_count') || '12', 10));
  const showMobileSidebar = ref(false);

  // Sidebar customizations
  const defaultSidebarOrder = ['status', 'category', 'tag', 'savepath', 'tracker'];
  const sidebarOrder = ref<string[]>(
    safeStorage.getJSON('torrenta_sidebar_sections_order', defaultSidebarOrder)
  );
  const sidebarHidden = ref<string[]>(
    safeStorage.getJSON('torrenta_sidebar_sections_hidden', [])
  );
  const sidebarCollapsed = ref<Record<string, boolean>>(
    safeStorage.getJSON('torrenta_sidebar_collapsed', {
      status: false,
      category: true,
      tag: true,
      savepath: false,
      tracker: false,
    })
  );

  // Default torrent add options
  const addToTopOfQueue = ref(safeStorage.getItem('torrenta_add_to_top_of_queue') === 'true');
  const doNotStart = ref(safeStorage.getItem('torrenta_do_not_start') === 'true');
  const mergeDuplicateTrackers = ref(safeStorage.getItem('torrenta_merge_duplicate_trackers') === 'true');
  const askBeforeMergeTrackers = ref(safeStorage.getItem('torrenta_ask_before_merge_trackers') !== 'false');
  const skipChecking = ref(safeStorage.getItem('torrenta_skip_checking') === 'true');
  const autoTMM = ref(safeStorage.getItem('torrenta_auto_tmm') === 'true');
  const contentLayout = ref(safeStorage.getItem('torrenta_content_layout') || 'Original');
  const stopCondition = ref(safeStorage.getItem('torrenta_stop_condition') || 'None');
  const forced = ref(safeStorage.getItem('torrenta_forced') === 'true');
  const useDownloadPath = ref(safeStorage.getItem('torrenta_use_download_path') === 'true');
  const downloadPath = ref(safeStorage.getItem('torrenta_download_path') || '');
  const autoDeleteMode = ref(parseInt(safeStorage.getItem('torrenta_auto_delete_mode') || '0', 10));

  let syncTimer: any = null;

  function scheduleServerSync(delay = 500) {
    if (typeof window === 'undefined') return;
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      persistSettingsToServer();
    }, delay);
  }

  async function persistSettingsToServer() {
    if (typeof fetch === 'undefined') return;
    try {
      const payload = {
        version: 1,
        updated_at: Math.floor(Date.now() / 1000),
        appearance: {
          theme: theme.value,
          locale: locale.value,
        },
        sidebar: {
          order: sidebarOrder.value,
          hidden: sidebarHidden.value,
          collapsed: sidebarCollapsed.value,
        },
        category_mapping: {
          categoryConfigs: categoryConfigs.value,
        },
        task_defaults: {
          addToTopOfQueue: addToTopOfQueue.value,
          doNotStart: doNotStart.value,
          mergeDuplicateTrackers: mergeDuplicateTrackers.value,
          askBeforeMergeTrackers: askBeforeMergeTrackers.value,
          skipChecking: skipChecking.value,
          autoTMM: autoTMM.value,
          contentLayout: contentLayout.value,
          stopCondition: stopCondition.value,
          forced: forced.value,
          useDownloadPath: useDownloadPath.value,
          downloadPath: downloadPath.value,
          autoDeleteMode: autoDeleteMode.value,
        },
        connection: {
          url: url.value,
          username: username.value,
          driverType: driverType.value,
        },
      };

      await fetch('/api/user-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // Non-blocking fallback to local storage
    }
  }

  async function loadServerSettings() {
    if (typeof fetch === 'undefined') return;
    try {
      const res = await fetch('/api/user-settings');
      if (!res.ok) return;
      const data = await res.json();
      if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        return;
      }

      // 1. Appearance
      if (data.appearance) {
        if (data.appearance.theme && data.appearance.theme !== theme.value) {
          theme.value = data.appearance.theme;
          safeStorage.setItem('torrenta_theme', data.appearance.theme);
          if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', data.appearance.theme);
          }
        }
        if (data.appearance.locale && (data.appearance.locale === 'zh' || data.appearance.locale === 'en')) {
          locale.value = data.appearance.locale;
          safeStorage.setItem('torrenta_locale', data.appearance.locale);
        }
      }

      // 2. Category mapping
      if (data.category_mapping?.categoryConfigs && Array.isArray(data.category_mapping.categoryConfigs)) {
        categoryConfigs.value = data.category_mapping.categoryConfigs;
        safeStorage.setJSON('torrenta_category_configs', data.category_mapping.categoryConfigs);
      }

      // 3. Sidebar
      if (data.sidebar) {
        if (Array.isArray(data.sidebar.order)) {
          sidebarOrder.value = data.sidebar.order;
          safeStorage.setJSON('torrenta_sidebar_sections_order', data.sidebar.order);
        }
        if (Array.isArray(data.sidebar.hidden)) {
          sidebarHidden.value = data.sidebar.hidden;
          safeStorage.setJSON('torrenta_sidebar_sections_hidden', data.sidebar.hidden);
        }
        if (data.sidebar.collapsed && typeof data.sidebar.collapsed === 'object') {
          sidebarCollapsed.value = { ...sidebarCollapsed.value, ...data.sidebar.collapsed };
          safeStorage.setJSON('torrenta_sidebar_collapsed', sidebarCollapsed.value);
        }
      }

      // 4. Task defaults
      if (data.task_defaults) {
        const td = data.task_defaults;
        if (typeof td.addToTopOfQueue === 'boolean') {
          addToTopOfQueue.value = td.addToTopOfQueue;
          safeStorage.setItem('torrenta_add_to_top_of_queue', String(td.addToTopOfQueue));
        }
        if (typeof td.doNotStart === 'boolean') {
          doNotStart.value = td.doNotStart;
          safeStorage.setItem('torrenta_do_not_start', String(td.doNotStart));
        }
        if (typeof td.mergeDuplicateTrackers === 'boolean') {
          mergeDuplicateTrackers.value = td.mergeDuplicateTrackers;
          safeStorage.setItem('torrenta_merge_duplicate_trackers', String(td.mergeDuplicateTrackers));
        }
        if (typeof td.askBeforeMergeTrackers === 'boolean') {
          askBeforeMergeTrackers.value = td.askBeforeMergeTrackers;
          safeStorage.setItem('torrenta_ask_before_merge_trackers', String(td.askBeforeMergeTrackers));
        }
        if (typeof td.skipChecking === 'boolean') {
          skipChecking.value = td.skipChecking;
          safeStorage.setItem('torrenta_skip_checking', String(td.skipChecking));
        }
        if (typeof td.autoTMM === 'boolean') {
          autoTMM.value = td.autoTMM;
          safeStorage.setItem('torrenta_auto_tmm', String(td.autoTMM));
        }
        if (typeof td.contentLayout === 'string') {
          contentLayout.value = td.contentLayout;
          safeStorage.setItem('torrenta_content_layout', td.contentLayout);
        }
        if (typeof td.stopCondition === 'string') {
          stopCondition.value = td.stopCondition;
          safeStorage.setItem('torrenta_stop_condition', td.stopCondition);
        }
        if (typeof td.forced === 'boolean') {
          forced.value = td.forced;
          safeStorage.setItem('torrenta_forced', String(td.forced));
        }
        if (typeof td.useDownloadPath === 'boolean') {
          useDownloadPath.value = td.useDownloadPath;
          safeStorage.setItem('torrenta_use_download_path', String(td.useDownloadPath));
        }
        if (typeof td.downloadPath === 'string') {
          downloadPath.value = td.downloadPath;
          safeStorage.setItem('torrenta_download_path', td.downloadPath);
        }
        if (typeof td.autoDeleteMode === 'number') {
          autoDeleteMode.value = td.autoDeleteMode;
          safeStorage.setItem('torrenta_auto_delete_mode', String(td.autoDeleteMode));
        }
      }

      // 5. Connection
      if (data.connection) {
        if (data.connection.url && !url.value) {
          url.value = data.connection.url;
          safeStorage.setItem('torrenta_url', data.connection.url);
        }
        if (data.connection.username && !username.value) {
          username.value = data.connection.username;
          safeStorage.setItem('torrenta_username', data.connection.username);
        }
        if (data.connection.driverType && !driverType.value) {
          driverType.value = data.connection.driverType;
          safeStorage.setItem('torrenta_driver_type', data.connection.driverType);
        }
      }
    } catch (err) {
      // Non-blocking fallback to local storage
    }
  }

  function saveConfig(
    newUrl: string,
    newUser: string,
    newPass: string,
    newDriver: 'qbittorrent' | 'transmission' | 'aria2'
  ) {
    url.value = newUrl;
    username.value = newUser;
    password.value = newPass;
    driverType.value = newDriver;

    safeStorage.setItem('torrenta_url', newUrl);
    safeStorage.setItem('torrenta_username', newUser);
    safeStorage.setItem('torrenta_password', newPass);
    safeStorage.setItem('torrenta_driver_type', newDriver);

    safeStorage.setJSON(
      'torrenta_app_config',
      { url: newUrl, username: newUser }
    );
    scheduleServerSync();
  }

  function setTheme(newTheme: string) {
    theme.value = newTheme;
    safeStorage.setItem('torrenta_theme', newTheme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
    scheduleServerSync();
  }

  function setLocale(newLocale: 'zh' | 'en') {
    locale.value = newLocale;
    safeStorage.setItem('torrenta_locale', newLocale);
    scheduleServerSync();
  }

  function addCategory(name: string) {
    const clean = name.trim();
    if (clean && !categoryConfigs.value.some((c) => c.name === clean)) {
      categoryConfigs.value.push({ name: clean, paths: [] });
      saveCategoryConfigs();
    }
  }

  function removeCategory(name: string) {
    categoryConfigs.value = categoryConfigs.value.filter((c) => c.name !== name);
    saveCategoryConfigs();
  }

  function syncCategories(serverNames: string[]) {
    let changed = false;
    serverNames.forEach((name) => {
      if (!categoryConfigs.value.some((c) => c.name === name)) {
        categoryConfigs.value.push({ name, paths: [] });
        changed = true;
      }
    });

    const beforeCount = categoryConfigs.value.length;
    categoryConfigs.value = categoryConfigs.value.filter((c) => serverNames.includes(c.name));
    if (categoryConfigs.value.length !== beforeCount) {
      changed = true;
    }

    if (changed) {
      saveCategoryConfigs();
    }
  }

  function addPathToCategory(catName: string, path: string) {
    const cleanPath = path.trim();
    const cat = categoryConfigs.value.find((c) => c.name === catName);
    if (cat && cleanPath && !cat.paths.includes(cleanPath)) {
      cat.paths.push(cleanPath);
      saveCategoryConfigs();
    }
  }

  function removePathFromCategory(catName: string, path: string) {
    const cat = categoryConfigs.value.find((c) => c.name === catName);
    if (cat) {
      cat.paths = cat.paths.filter((p) => p !== path);
      saveCategoryConfigs();
    }
  }

  function saveCategoryConfigs() {
    safeStorage.setJSON('torrenta_category_configs', categoryConfigs.value);
    scheduleServerSync();
  }

  function setSidebarOrder(newOrder: string[]) {
    sidebarOrder.value = newOrder;
    safeStorage.setJSON('torrenta_sidebar_sections_order', newOrder);
    scheduleServerSync();
  }

  function setSidebarHidden(newHidden: string[]) {
    sidebarHidden.value = newHidden;
    safeStorage.setJSON('torrenta_sidebar_sections_hidden', newHidden);
    scheduleServerSync();
  }

  function setSidebarCollapsed(newCollapsed: Record<string, boolean>) {
    sidebarCollapsed.value = newCollapsed;
    safeStorage.setJSON('torrenta_sidebar_collapsed', newCollapsed);
    scheduleServerSync();
  }

  function toggleSidebarCollapsed(key: string) {
    sidebarCollapsed.value[key] = !sidebarCollapsed.value[key];
    safeStorage.setJSON('torrenta_sidebar_collapsed', sidebarCollapsed.value);
    scheduleServerSync();
  }

  function setSimulationMode(enabled: boolean) {
    simulationMode.value = enabled;
    safeStorage.setItem('torrenta_simulation_mode', String(enabled));
    if (!enabled) {
      const mockCats = ['Movies', 'Music', 'Software', 'Books'];
      categoryConfigs.value = categoryConfigs.value.filter(
        (c) => !(mockCats.includes(c.name) && c.paths.length === 0)
      );
      saveCategoryConfigs();
    }
  }

  function setSimulatedCount(count: number) {
    simulatedCount.value = count;
    safeStorage.setItem('torrenta_simulated_count', String(count));
  }

  function setAddToTopOfQueue(val: boolean) {
    addToTopOfQueue.value = val;
    safeStorage.setItem('torrenta_add_to_top_of_queue', String(val));
    scheduleServerSync();
  }

  function setDoNotStart(val: boolean) {
    doNotStart.value = val;
    safeStorage.setItem('torrenta_do_not_start', String(val));
    scheduleServerSync();
  }

  function setMergeDuplicateTrackers(val: boolean) {
    mergeDuplicateTrackers.value = val;
    safeStorage.setItem('torrenta_merge_duplicate_trackers', String(val));
    scheduleServerSync();
  }

  function setAskBeforeMergeTrackers(val: boolean) {
    askBeforeMergeTrackers.value = val;
    safeStorage.setItem('torrenta_ask_before_merge_trackers', String(val));
    scheduleServerSync();
  }

  function setSkipChecking(val: boolean) {
    skipChecking.value = val;
    safeStorage.setItem('torrenta_skip_checking', String(val));
    scheduleServerSync();
  }

  function setAutoTMM(val: boolean) {
    autoTMM.value = val;
    safeStorage.setItem('torrenta_auto_tmm', String(val));
    scheduleServerSync();
  }

  function setContentLayout(val: string) {
    contentLayout.value = val;
    safeStorage.setItem('torrenta_content_layout', val);
    scheduleServerSync();
  }

  function setStopCondition(val: string) {
    stopCondition.value = val;
    safeStorage.setItem('torrenta_stop_condition', val);
    scheduleServerSync();
  }

  function setForced(val: boolean) {
    forced.value = val;
    safeStorage.setItem('torrenta_forced', String(val));
    scheduleServerSync();
  }

  function setUseDownloadPath(val: boolean) {
    useDownloadPath.value = val;
    safeStorage.setItem('torrenta_use_download_path', String(val));
    scheduleServerSync();
  }

  function setDownloadPath(val: string) {
    downloadPath.value = val;
    safeStorage.setItem('torrenta_download_path', val);
    scheduleServerSync();
  }

  function setAutoDeleteMode(val: number) {
    autoDeleteMode.value = val;
    safeStorage.setItem('torrenta_auto_delete_mode', String(val));
    scheduleServerSync();
  }

  // Initialize theme on mount
  setTheme(theme.value);

  // Clean up mock categories on boot if simulation mode is disabled
  if (!simulationMode.value) {
    const mockCats = ['Movies', 'Music', 'Software', 'Books'];
    categoryConfigs.value = categoryConfigs.value.filter(
      (c) => !(mockCats.includes(c.name) && c.paths.length === 0)
    );
    saveCategoryConfigs();
  }

  // Hydrate persistent settings from server on boot
  if (typeof window !== 'undefined') {
    loadServerSettings();
  }

  return {
    url,
    username,
    password,
    driverType,
    theme,
    locale,
    categoryConfigs,
    simulationMode,
    simulatedCount,
    showMobileSidebar,
    sidebarOrder,
    sidebarHidden,
    sidebarCollapsed,
    setSidebarOrder,
    setSidebarHidden,
    setSidebarCollapsed,
    toggleSidebarCollapsed,
    loadServerSettings,
    persistSettingsToServer,
    scheduleServerSync,
    setSimulationMode,
    setSimulatedCount,
    saveConfig,
    setTheme,
    setLocale,
    addCategory,
    removeCategory,
    syncCategories,
    addPathToCategory,
    removePathFromCategory,
    addToTopOfQueue,
    doNotStart,
    setAddToTopOfQueue,
    setDoNotStart,
    mergeDuplicateTrackers,
    askBeforeMergeTrackers,
    setMergeDuplicateTrackers,
    setAskBeforeMergeTrackers,
    skipChecking,
    setSkipChecking,
    autoTMM,
    setAutoTMM,
    contentLayout,
    setContentLayout,
    stopCondition,
    setStopCondition,
    forced,
    setForced,
    useDownloadPath,
    setUseDownloadPath,
    downloadPath,
    setDownloadPath,
    autoDeleteMode,
    setAutoDeleteMode,
  };
});
