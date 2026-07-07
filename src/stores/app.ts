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
    addPathToCategory,
    removePathFromCategory,
    addToTopOfQueue,
    doNotStart,
    setAddToTopOfQueue,
    setDoNotStart,
  };
});
