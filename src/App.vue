<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAppStore } from '@/stores/app';
import { useTorrentStore } from '@/stores/torrent';
import { useI18n } from '@/i18n/useI18n';
import Dashboard from '@/views/Dashboard.vue';
import Settings from '@/views/Settings.vue';
import { 
  ActivityIcon, 
  SettingsIcon, 
  LayoutDashboardIcon, 
  LanguagesIcon,
  SearchIcon,
  XIcon,
  MenuIcon
} from 'lucide-vue-next';

const appStore = useAppStore();
const torrentStore = useTorrentStore();
const { t } = useI18n();

// Simple hash router
const currentPath = ref(window.location.hash || '#/');
const languageDropdownOpen = ref(false);

onMounted(() => {
  // Sync state on hashchange
  window.addEventListener('hashchange', () => {
    currentPath.value = window.location.hash || '#/';
  });

  // Apply default configured theme to html tag
  document.documentElement.setAttribute('data-theme', appStore.theme);
});

const routes: Record<string, any> = {
  '/': Dashboard,
  '/settings': Settings,
};

const currentView = computed(() => {
  const hash = currentPath.value.replace('#', '') || '/';
  // Strip query string (e.g. ?tab=download) before route lookup
  const path = hash.split('?')[0] || '/';
  return routes[path] || Dashboard;
});

const isDashboard = computed(() => {
  const hash = currentPath.value.replace('#', '') || '/';
  const path = hash.split('?')[0] || '/';
  return path === '/';
});

const isSettings = computed(() => {
  const hash = currentPath.value.replace('#', '') || '/';
  const path = hash.split('?')[0] || '/';
  return path === '/settings';
});




</script>

<template>
  <div class="min-h-screen bg-base-300 transition-colors duration-300 flex flex-col font-sans">
    <!-- Premium Global Top Navigation Bar -->
    <header class="sticky top-0 z-40 w-full bg-base-100/80 backdrop-blur-md border-b border-base-content/10 shadow-sm px-4 sm:px-6">
      <div class="max-w-[1600px] mx-auto flex items-center justify-between h-16">
        <!-- Left Side: Logo (Desktop or Non-Dashboard) or Filter Toggle (Mobile Dashboard) -->
        <div class="flex items-center gap-2">
          <!-- Filter Trigger for Mobile Dashboard -->
          <button 
            v-if="isDashboard" 
            @click="appStore.showMobileSidebar = !appStore.showMobileSidebar" 
            class="btn btn-ghost btn-sm rounded-xl lg:hidden flex items-center gap-1.5 px-3 border border-base-content/10 bg-base-200/50 hover:bg-base-200 text-base-content"
            :title="t('dashboard.filters')"
          >
            <MenuIcon class="h-4 w-4" />
            <span class="text-xs font-black">{{ t('dashboard.filters') }}</span>
          </button>
          
          <!-- Logo -->
          <a 
            href="#/" 
            class="items-center gap-2.5 group" 
            :class="isDashboard ? 'hidden lg:flex' : 'flex'"
          >
            <div class="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-105 duration-200">
              <ActivityIcon class="h-5 w-5" />
            </div>
            <span class="text-lg font-black tracking-wider bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              TORRENTA
            </span>
          </a>
        </div>

        <!-- Middle Quick Search Bar (Visible when on Dashboard and connected) -->
        <div v-if="torrentStore.isConnected && isDashboard" class="flex items-center flex-1 max-w-xs sm:max-w-md mx-4 animate-fadeIn">
          <div class="relative w-full flex items-center bg-base-200 border border-base-content/10 rounded-xl overflow-hidden shadow-inner focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200">
            <SearchIcon class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
            <input
              v-model="torrentStore.searchQuery"
              type="text"
              :placeholder="t('dashboard.searchPlaceholder')"
              class="input input-ghost input-xs sm:input-sm h-8 sm:h-9 !pl-10 pr-8 w-full focus:outline-none bg-transparent text-xs font-semibold placeholder:text-transparent sm:placeholder:text-base-content/50"
            />
            <!-- Clear button -->
            <button 
              v-if="torrentStore.searchQuery" 
              @click="torrentStore.searchQuery = ''" 
              class="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle h-5 w-5 min-h-[20px] text-base-content/60"
            >
              <XIcon class="h-3 w-3" />
            </button>
          </div>
        </div>

        <!-- Right Side Nav Switchers -->
        <div class="flex items-center gap-1">
          <!-- Language Toggle Dropdown -->
          <div class="dropdown dropdown-end mr-1" :class="{ 'dropdown-open': languageDropdownOpen }">
            <button tabindex="0" class="btn btn-ghost btn-sm rounded-xl gap-1 px-2.5 text-xs font-bold opacity-70 hover:opacity-100 focus:outline-none" @click="languageDropdownOpen = !languageDropdownOpen">
              <LanguagesIcon class="h-4 w-4" />
              <span class="hidden sm:inline">{{ appStore.locale === 'zh' ? '中文' : 'EN' }}</span>
            </button>
            <ul tabindex="0" class="dropdown-content menu p-1.5 shadow-2xl bg-base-200 border border-base-content/10 rounded-xl w-28 mt-1 z-[60]" style="--tw-bg-opacity: 1 !important; background-color: var(--b2) !important; background-color: hsl(var(--b2)) !important; background-color: oklch(var(--b2)) !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; opacity: 1 !important;">
              <li>
                <button type="button" @click="appStore.setLocale('zh'); languageDropdownOpen = false" class="font-bold text-xs py-2 px-3 rounded-lg" :class="appStore.locale === 'zh' ? 'bg-primary/10 text-primary' : ''">
                  简体中文
                </button>
              </li>
              <li>
                <button type="button" @click="appStore.setLocale('en'); languageDropdownOpen = false" class="font-bold text-xs py-2 px-3 rounded-lg" :class="appStore.locale === 'en' ? 'bg-primary/10 text-primary' : ''">
                  English
                </button>
              </li>
            </ul>
          </div>

          <a
            href="#/"
            class="btn btn-ghost btn-sm rounded-xl gap-1.5 text-xs font-bold"
            :class="isDashboard ? 'bg-base-content/5 text-primary' : 'opacity-70'"
          >
            <LayoutDashboardIcon class="h-4 w-4" />
            <span class="hidden sm:inline">{{ t('nav.dashboard') }}</span>
          </a>

          <a
            href="#/settings"
            class="btn btn-ghost btn-sm rounded-xl gap-1.5 text-xs font-bold"
            :class="isSettings ? 'bg-base-content/5 text-secondary' : 'opacity-70'"
          >
            <SettingsIcon class="h-4 w-4" />
            <span class="hidden sm:inline">{{ t('nav.settings') }}</span>
          </a>
        </div>
      </div>
    </header>

    <!-- Main Views Area -->
    <main class="flex-1 w-full relative">
      <transition name="fade" mode="out-in">
        <component :is="currentView" />
      </transition>
    </main>

    <!-- Sleek Glass footer -->
    <footer class="w-full py-4 px-6 text-center text-[10px] opacity-45 border-t border-base-content/5 mt-10">
      <div class="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>{{ t('nav.footerTitle') }}</span>
        <span>{{ t('nav.footerDesc') }}</span>
      </div>
    </footer>
  </div>
</template>

<style>
/* Page transition animation */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
