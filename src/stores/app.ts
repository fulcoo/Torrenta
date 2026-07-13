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
    (navigator.language.startsWith('zh') ? 'zh' : 'en')
  );
  const categoryConfigs = ref<CategoryConfig[]>(
    safeStorage.getJSON('torrenta_category_configs', [])
  );
  const simulationMode = ref(import.meta.env.DEV && safeStorage.getItem('torrenta_simulation_mode') === 'true');
  const simulatedCount = ref(parseInt(safeStorage.getItem('torrenta_simulated_count') || '12', 10));
  const showMobileSidebar = ref(false);
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

    // Sync app config that API layer interceptors listen to
    safeStorage.setJSON(
      'torrenta_app_config',
      { url: newUrl, username: newUser }
    );
  }

  function setTheme(newTheme: string) {
    theme.value = newTheme;
    safeStorage.setItem('torrenta_theme', newTheme);
    // Apply dataset attribute to root html for DaisyUI theme toggle
    document.documentElement.setAttribute('data-theme', newTheme);
  }

  function setLocale(newLocale: 'zh' | 'en') {
    locale.value = newLocale;
    safeStorage.setItem('torrenta_locale', newLocale);
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
    // 1. Add missing categories
    serverNames.forEach((name) => {
      if (!categoryConfigs.value.some((c) => c.name === name)) {
        categoryConfigs.value.push({ name, paths: [] });
        changed = true;
      }
    });

    // 2. Remove categories that don't exist on the server anymore
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
  }

  function setSimulationMode(enabled: boolean) {
    simulationMode.value = enabled;
    safeStorage.setItem('torrenta_simulation_mode', String(enabled));
    if (!enabled) {
      // Clean up mock categories that have no custom paths
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
  }

  function setDoNotStart(val: boolean) {
    doNotStart.value = val;
    safeStorage.setItem('torrenta_do_not_start', String(val));
  }

  function setMergeDuplicateTrackers(val: boolean) {
    mergeDuplicateTrackers.value = val;
    safeStorage.setItem('torrenta_merge_duplicate_trackers', String(val));
  }

  function setAskBeforeMergeTrackers(val: boolean) {
    askBeforeMergeTrackers.value = val;
    safeStorage.setItem('torrenta_ask_before_merge_trackers', String(val));
  }

  function setSkipChecking(val: boolean) {
    skipChecking.value = val;
    safeStorage.setItem('torrenta_skip_checking', String(val));
  }

  function setAutoTMM(val: boolean) {
    autoTMM.value = val;
    safeStorage.setItem('torrenta_auto_tmm', String(val));
  }

  function setContentLayout(val: string) {
    contentLayout.value = val;
    safeStorage.setItem('torrenta_content_layout', val);
  }

  function setStopCondition(val: string) {
    stopCondition.value = val;
    safeStorage.setItem('torrenta_stop_condition', val);
  }

  function setForced(val: boolean) {
    forced.value = val;
    safeStorage.setItem('torrenta_forced', String(val));
  }

  function setUseDownloadPath(val: boolean) {
    useDownloadPath.value = val;
    safeStorage.setItem('torrenta_use_download_path', String(val));
  }

  function setDownloadPath(val: string) {
    downloadPath.value = val;
    safeStorage.setItem('torrenta_download_path', val);
  }

  function setAutoDeleteMode(val: number) {
    autoDeleteMode.value = val;
    safeStorage.setItem('torrenta_auto_delete_mode', String(val));
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
