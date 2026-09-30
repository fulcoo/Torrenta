<template>
  <div class="flex flex-col h-full p-4 w-full bg-base-100 rounded-2xl shadow-md text-base-content border border-base-content/10">
    <template v-for="(section, idx) in visibleSections" :key="section">
      <!-- Divider between sections (never before the first section) -->
      <div v-if="idx > 0" class="divider my-2 before:bg-base-content/10 after:bg-base-content/10"></div>

      <!-- Section: Status -->
      <template v-if="section === 'status'">
        <!-- Header -->
        <div 
          class="flex items-center justify-between px-2 cursor-pointer select-none group"
          :class="collapsed.status ? 'mb-0' : 'mb-3'"
          @click="toggleCollapse('status')"
        >
          <span class="font-bold tracking-wider uppercase text-xs opacity-75 group-hover:opacity-100 transition-opacity">
            {{ t('sidebar.statusFilters') }}
          </span>
          <ChevronDownIcon 
            class="h-4 w-4 opacity-50 group-hover:opacity-100 transition-transform duration-200" 
            :class="{ '-rotate-90': collapsed.status }" 
          />
        </div>

        <!-- Status List -->
        <div v-show="!collapsed.status" class="overflow-y-auto max-h-[380px] sm:max-h-[460px] px-2 -mx-2 pr-1 animate-fadeIn">
          <ul class="menu menu-sm w-full p-0 gap-0.5">
            <li v-for="status in statuses" :key="status.id">
              <button
                type="button"
                @click="selectStatus(status.id)"
                class="flex items-center justify-between py-2 px-2.5 rounded-xl transition-colors duration-200 focus:outline-none"
                :class="activeStatus === status.id ? 'bg-primary text-primary-content hover:bg-primary focus:bg-primary focus:text-primary-content shadow-lg shadow-primary/20 font-medium' : 'hover:bg-base-content/5 text-base-content/85'"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <component
                    :is="status.icon"
                    class="h-4 w-4 shrink-0 transition-transform duration-200"
                    :class="activeStatus === status.id ? 'text-primary-content' : status.iconClass"
                  />
                  <span class="truncate text-xs">{{ status.label }}</span>
                </div>
                <span
                  class="badge badge-sm border-none font-semibold shrink-0"
                  :class="activeStatus === status.id ? 'bg-primary-content text-primary' : 'bg-base-300 text-base-content/70'"
                >
                  {{ getStatusCount(status.id) }}
                </span>
              </button>
            </li>
          </ul>
        </div>
      </template>

      <!-- Section: Categories -->
      <template v-else-if="section === 'category'">
        <!-- Categories Header -->
        <div 
          class="flex items-center justify-between px-2 cursor-pointer select-none group"
          :class="collapsed.category ? 'mb-0' : 'mb-3'"
          @click="toggleCollapse('category')"
        >
          <div class="flex items-center gap-1.5">
            <span class="font-bold tracking-wider uppercase text-xs opacity-75 group-hover:opacity-100 transition-opacity">
              {{ t('sidebar.categories') }}
            </span>
            <a
              href="#/settings?tab=download"
              class="btn btn-ghost btn-xs btn-circle opacity-40 hover:opacity-100 hover:bg-secondary/15 hover:text-secondary transition-all duration-200"
              :title="t('sidebar.manageCategories')"
              @click.stop
            >
              <SettingsIcon class="h-3.5 w-3.5" />
            </a>
          </div>
          <ChevronDownIcon 
            class="h-4 w-4 opacity-50 group-hover:opacity-100 transition-transform duration-200" 
            :class="{ '-rotate-90': collapsed.category }" 
          />
        </div>

        <!-- Categories List -->
        <div v-show="!collapsed.category" class="overflow-y-auto max-h-[240px] px-2 -mx-2 pr-1 animate-fadeIn">
          <ul class="menu menu-sm w-full p-0 gap-1">
            <!-- All Categories Button -->
            <li>
              <button
                type="button"
                @click="selectCategory('')"
                class="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors duration-200 focus:outline-none"
                :class="activeCategory === '' ? 'bg-secondary text-secondary-content hover:bg-secondary focus:bg-secondary focus:text-secondary-content shadow-lg shadow-secondary/20 font-medium' : 'hover:bg-base-content/5 text-base-content/85'"
              >
                <div class="flex items-center gap-3">
                  <FolderIcon class="h-4 w-4" />
                  <span>{{ t('sidebar.allCategories') }}</span>
                </div>
                <span
                  class="badge badge-sm border-none font-semibold"
                  :class="activeCategory === '' ? 'bg-secondary-content text-secondary' : 'bg-base-300 text-base-content/70'"
                >
                  {{ torrentStore.torrents.length }}
                </span>
              </button>
            </li>

            <!-- Custom Categories -->
            <li v-for="cat in torrentStore.categories" :key="cat">
              <button
                type="button"
                @click="selectCategory(cat)"
                class="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors duration-200 focus:outline-none w-full"
                :class="activeCategory === cat ? 'bg-secondary text-secondary-content hover:bg-secondary focus:bg-secondary focus:text-secondary-content shadow-lg shadow-secondary/20 font-medium' : 'hover:bg-base-content/5 text-base-content/85'"
              >
                <div class="flex items-center gap-3 truncate">
                  <FolderOpenIcon class="h-4 w-4 shrink-0" />
                  <span class="truncate">{{ cat }}</span>
                </div>
                <span
                  class="badge badge-sm border-none font-semibold shrink-0"
                  :class="activeCategory === cat ? 'bg-secondary-content text-secondary' : 'bg-base-300 text-base-content/70'"
                >
                  {{ getCategoryCount(cat) }}
                </span>
              </button>
            </li>
          </ul>
        </div>
      </template>

      <!-- Section: Tags -->
      <template v-else-if="section === 'tag'">
        <!-- Tags Header -->
        <div 
          class="flex items-center justify-between px-2 cursor-pointer select-none group"
          :class="collapsed.tag ? 'mb-0' : 'mb-3'"
          @click="toggleCollapse('tag')"
        >
          <span class="font-bold tracking-wider uppercase text-xs opacity-75 group-hover:opacity-100 transition-opacity">
            {{ t('sidebar.tags') }}
          </span>
          <ChevronDownIcon 
            class="h-4 w-4 opacity-50 group-hover:opacity-100 transition-transform duration-200" 
            :class="{ '-rotate-90': collapsed.tag }" 
          />
        </div>

        <!-- Tags List -->
        <div v-show="!collapsed.tag" class="overflow-y-auto max-h-[240px] px-2 -mx-2 pr-1 animate-fadeIn">
          <ul class="menu menu-sm w-full p-0 gap-1">
            <!-- All Tags Button -->
            <li>
              <button
                type="button"
                @click="selectTag('')"
                class="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors duration-200 focus:outline-none"
                :class="activeTag === '' ? 'bg-accent text-accent-content hover:bg-accent focus:bg-accent focus:text-accent-content shadow-lg shadow-accent/20 font-medium' : 'hover:bg-base-content/5 text-base-content/85'"
              >
                <div class="flex items-center gap-3">
                  <TagIcon class="h-4 w-4" />
                  <span>{{ t('sidebar.allTags') }}</span>
                </div>
                <span
                  class="badge badge-sm border-none font-semibold"
                  :class="activeTag === '' ? 'bg-accent-content text-accent' : 'bg-base-300 text-base-content/70'"
                >
                  {{ torrentStore.torrents.length }}
                </span>
              </button>
            </li>

            <!-- Tag Entries -->
            <li v-for="tag in torrentStore.tags" :key="tag">
              <button
                type="button"
                @click="selectTag(tag)"
                class="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors duration-200 focus:outline-none w-full"
                :class="activeTag === tag ? 'bg-accent text-accent-content hover:bg-accent focus:bg-accent focus:text-accent-content shadow-lg shadow-accent/20 font-medium' : 'hover:bg-base-content/5 text-base-content/85'"
              >
                <div class="flex items-center gap-3 truncate">
                  <TagIcon class="h-4 w-4 shrink-0" />
                  <span class="truncate">{{ tag }}</span>
                </div>
                <span
                  class="badge badge-sm border-none font-semibold shrink-0"
                  :class="activeTag === tag ? 'bg-accent-content text-accent' : 'bg-base-300 text-base-content/70'"
                >
                  {{ getTagCount(tag) }}
                </span>
              </button>
            </li>
          </ul>
        </div>
      </template>

      <!-- Section: Save Paths -->
      <template v-else-if="section === 'savepath'">
        <!-- Save Path Header -->
        <div 
          class="flex items-center justify-between px-2 cursor-pointer select-none group"
          :class="collapsed.savepath ? 'mb-0' : 'mb-3'"
          @click="toggleCollapse('savepath')"
        >
          <span class="font-bold tracking-wider uppercase text-xs opacity-75 group-hover:opacity-100 transition-opacity">
            {{ t('sidebar.savePath') }}
          </span>
          <ChevronDownIcon 
            class="h-4 w-4 opacity-50 group-hover:opacity-100 transition-transform duration-200" 
            :class="{ '-rotate-90': collapsed.savepath }" 
          />
        </div>

        <!-- Save Path List -->
        <div v-show="!collapsed.savepath" class="overflow-y-auto max-h-[240px] px-2 -mx-2 pr-1 animate-fadeIn">
          <ul class="menu menu-sm w-full p-0 gap-1">
            <!-- All Save Paths Button -->
            <li>
              <button
                type="button"
                @click="selectSavePath('')"
                class="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors duration-200 focus:outline-none"
                :class="activeSavePath === '' ? 'bg-neutral text-neutral-content hover:bg-neutral focus:bg-neutral focus:text-neutral-content shadow-lg shadow-neutral/20 font-medium' : 'hover:bg-base-content/5 text-base-content/85'"
              >
                <div class="flex items-center gap-3">
                  <HardDriveIcon class="h-4 w-4" />
                  <span>{{ t('sidebar.allSavePaths') }}</span>
                </div>
                <span
                  class="badge badge-sm border-none font-semibold"
                  :class="activeSavePath === '' ? 'bg-neutral-content text-neutral' : 'bg-base-300 text-base-content/70'"
                >
                  {{ torrentStore.torrents.length }}
                </span>
              </button>
            </li>

            <!-- Save Path Entries -->
            <li v-for="entry in savePathEntries" :key="entry.path">
              <button
                type="button"
                @click="selectSavePath(entry.path)"
                class="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors duration-200 focus:outline-none w-full"
                :class="activeSavePath === entry.path ? 'bg-neutral text-neutral-content hover:bg-neutral focus:bg-neutral focus:text-neutral-content shadow-lg shadow-neutral/20 font-medium' : 'hover:bg-base-content/5 text-base-content/85'"
              >
                <div class="flex items-center gap-3 truncate">
                  <FolderOpenIcon class="h-4 w-4 shrink-0" />
                  <span class="truncate font-mono text-[11px]" :title="entry.path">{{ formatSavePath(entry.path) }}</span>
                </div>
                <span
                  class="badge badge-sm border-none font-semibold shrink-0"
                  :class="activeSavePath === entry.path ? 'bg-neutral-content text-neutral' : 'bg-base-300 text-base-content/70'"
                >
                  {{ entry.count }}
                </span>
              </button>
            </li>
          </ul>
        </div>
      </template>

      <!-- Section: Trackers -->
      <template v-else-if="section === 'tracker'">
        <!-- Tracker Header -->
        <div 
          class="flex items-center justify-between px-2 cursor-pointer select-none group"
          :class="collapsed.tracker ? 'mb-0' : 'mb-3'"
          @click="toggleCollapse('tracker')"
        >
          <span class="font-bold tracking-wider uppercase text-xs opacity-75 group-hover:opacity-100 transition-opacity">
            {{ t('sidebar.tracker') }}
          </span>
          <ChevronDownIcon 
            class="h-4 w-4 opacity-50 group-hover:opacity-100 transition-transform duration-200" 
            :class="{ '-rotate-90': collapsed.tracker }" 
          />
        </div>

        <!-- Tracker List -->
        <div v-show="!collapsed.tracker" class="flex-1 overflow-y-auto max-h-[240px] px-2 -mx-2 pr-1 animate-fadeIn">
          <ul class="menu menu-sm w-full p-0 gap-1">
            <!-- All Trackers Button -->
            <li>
              <button
                type="button"
                @click="selectTracker('')"
                class="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors duration-200 focus:outline-none"
                :class="activeTracker === '' ? 'bg-info text-info-content hover:bg-info focus:bg-info focus:text-info-content shadow-lg shadow-info/20 font-medium' : 'hover:bg-base-content/5 text-base-content/85'"
              >
                <div class="flex items-center gap-3">
                  <GlobeIcon class="h-4 w-4" />
                  <span>{{ t('sidebar.allTrackers') }}</span>
                </div>
                <span
                  class="badge badge-sm border-none font-semibold"
                  :class="activeTracker === '' ? 'bg-info-content text-info' : 'bg-base-300 text-base-content/70'"
                >
                  {{ torrentStore.torrents.length }}
                </span>
              </button>
            </li>

            <!-- Trackerless -->
            <li v-if="trackerlesCount > 0">
              <button
                type="button"
                @click="selectTracker('__none__')"
                class="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors duration-200 focus:outline-none w-full"
                :class="activeTracker === '__none__' ? 'bg-info text-info-content hover:bg-info focus:bg-info focus:text-info-content shadow-lg shadow-info/20 font-medium' : 'hover:bg-base-content/5 text-base-content/85'"
              >
                <div class="flex items-center gap-3 truncate">
                  <GlobeOffIcon class="h-4 w-4 shrink-0" />
                  <span class="truncate italic opacity-75">{{ t('sidebar.noTracker') }}</span>
                </div>
                <span
                  class="badge badge-sm border-none font-semibold shrink-0"
                  :class="activeTracker === '__none__' ? 'bg-info-content text-info' : 'bg-base-300 text-base-content/70'"
                >
                  {{ trackerlesCount }}
                </span>
              </button>
            </li>

            <!-- Per-Tracker entries -->
            <li v-for="entry in trackerEntries" :key="entry.domain">
              <button
                type="button"
                @click="selectTracker(entry.domain)"
                class="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors duration-200 focus:outline-none w-full"
                :class="activeTracker === entry.domain ? 'bg-info text-info-content hover:bg-info focus:bg-info focus:text-info-content shadow-lg shadow-info/20 font-medium' : 'hover:bg-base-content/5 text-base-content/85'"
              >
                <div class="flex items-center gap-3 truncate">
                  <GlobeIcon class="h-4 w-4 shrink-0" />
                  <span class="truncate">{{ entry.domain }}</span>
                </div>
                <span
                  class="badge badge-sm border-none font-semibold shrink-0"
                  :class="activeTracker === entry.domain ? 'bg-info-content text-info' : 'bg-base-300 text-base-content/70'"
                >
                  {{ entry.count }}
                </span>
              </button>
            </li>
          </ul>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from '@/stores/app';
import { useTorrentStore } from '@/stores/torrent';
import { useI18n } from '@/i18n/useI18n';
import {
  ShuffleIcon,
  ChevronsDownIcon,
  ChevronsUpIcon,
  CheckCheckIcon,
  PlayIcon,
  SquareIcon,
  ArrowUpDownIcon,
  ArrowDownUpIcon,
  PauseIcon,
  RefreshCwIcon,
  MoveIcon,
  AlertCircleIcon,
  ListOrderedIcon,
  FolderIcon,
  FolderOpenIcon,
  SettingsIcon,
  GlobeIcon,
  GlobeOffIcon,
  TagIcon,
  ChevronDownIcon,
  HardDriveIcon,
} from 'lucide-vue-next';
import { matchTorrentStatus } from '@/utils/torrentStatus';

const props = defineProps<{
  activeStatus: string;
  activeCategory: string;
  activeTracker: string;
  activeTag: string;
  activeSavePath: string;
}>();

const emit = defineEmits<{
  (e: 'update:activeStatus', value: string): void;
  (e: 'update:activeCategory', value: string): void;
  (e: 'update:activeTracker', value: string): void;
  (e: 'update:activeTag', value: string): void;
  (e: 'update:activeSavePath', value: string): void;
}>();

const appStore = useAppStore();
const torrentStore = useTorrentStore();
const { t } = useI18n();

const visibleSections = computed(() => {
  return appStore.sidebarOrder.filter((id) => id === 'status' || !appStore.sidebarHidden.includes(id));
});

const collapsed = computed(() => appStore.sidebarCollapsed);

function toggleCollapse(key: string) {
  appStore.toggleSidebarCollapsed(key);
}

const statuses = computed(() => [
  { id: 'all', label: t('sidebar.all'), icon: ShuffleIcon, iconClass: 'text-amber-500' },
  { id: 'downloading', label: t('sidebar.downloading'), icon: ChevronsDownIcon, iconClass: 'text-orange-500' },
  { id: 'seeding', label: t('sidebar.seeding'), icon: ChevronsUpIcon, iconClass: 'text-blue-500' },
  { id: 'completed', label: t('sidebar.completed'), icon: CheckCheckIcon, iconClass: 'text-purple-500' },
  { id: 'running', label: t('sidebar.running'), icon: PlayIcon, iconClass: 'text-emerald-500' },
  { id: 'stopped', label: t('sidebar.stopped'), icon: SquareIcon, iconClass: 'text-base-content/50' },
  { id: 'active', label: t('sidebar.active'), icon: ArrowUpDownIcon, iconClass: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'inactive', label: t('sidebar.inactive'), icon: ArrowDownUpIcon, iconClass: 'text-rose-500' },
  { id: 'stalled', label: t('sidebar.stalled'), icon: PauseIcon, iconClass: 'text-sky-500' },
  { id: 'stalled_uploading', label: t('sidebar.stalled_uploading'), icon: ChevronsUpIcon, iconClass: 'text-blue-400' },
  { id: 'stalled_downloading', label: t('sidebar.stalled_downloading'), icon: ChevronsDownIcon, iconClass: 'text-emerald-500' },
  { id: 'checking', label: t('sidebar.checking'), icon: RefreshCwIcon, iconClass: 'text-teal-500' },
  { id: 'moving', label: t('sidebar.moving'), icon: MoveIcon, iconClass: 'text-cyan-500' },
  { id: 'error', label: t('sidebar.error'), icon: AlertCircleIcon, iconClass: 'text-red-500' },
  { id: 'queued', label: t('sidebar.queued'), icon: ListOrderedIcon, iconClass: 'text-indigo-400' },
]);

function selectStatus(id: string) {
  emit('update:activeStatus', id);
}

function selectCategory(cat: string) {
  emit('update:activeCategory', cat);
}

function selectTag(tag: string) {
  emit('update:activeTag', tag);
}

function selectTracker(domain: string) {
  emit('update:activeTracker', domain);
}

function selectSavePath(path: string) {
  emit('update:activeSavePath', path);
}

function getStatusCount(statusId: string): number {
  if (statusId === 'all') return torrentStore.torrents.length;
  return torrentStore.torrents.filter((t) => matchTorrentStatus(t, statusId)).length;
}

function getCategoryCount(categoryName: string): number {
  return torrentStore.torrents.filter((t) => t.category === categoryName).length;
}

function getTagCount(tagName: string): number {
  return torrentStore.torrents.filter((t) => t.tags && t.tags.includes(tagName)).length;
}

/** Extract the main domain (e.g. "hdsky.me") from a tracker URL */
function extractDomain(tracker: string | undefined): string {
  if (!tracker) return '';
  try {
    const url = new URL(tracker);
    // Strip leading "www." if present
    return url.hostname.replace(/^www\./, '');
  } catch {
    // Fallback: strip protocol if URL constructor fails
    const match = tracker.match(/^(?:https?:\/\/)?(?:www\.)?([^/:]+)/i);
    return match ? match[1] : tracker;
  }
}

/** Sorted unique tracker domains with counts */
const trackerEntries = computed(() => {
  const map = new Map<string, number>();
  for (const torrent of torrentStore.torrents) {
    const domain = extractDomain(torrent.tracker);
    if (!domain) continue;
    map.set(domain, (map.get(domain) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);
});

/** Count of torrents with no tracker */
const trackerlesCount = computed(() =>
  torrentStore.torrents.filter((t) => !extractDomain(t.tracker)).length
);

/** Unique save paths with counts */
const savePathEntries = computed(() => {
  return torrentStore.torrentSavePaths;
});

function formatSavePath(path: string, maxLength: number = 22): string {
  if (path.length <= maxLength) return path;
  
  const separator = path.includes('\\') ? '\\' : '/';
  const openSeparator = path.includes('/') ? '/' : '\\';
  const actualSeparator = separator || openSeparator;
  const parts = path.split(actualSeparator);
  
  if (parts.length <= 1) {
    return '...' + path.slice(-(maxLength - 3));
  }
  
  let result = parts[parts.length - 1];
  let i = parts.length - 2;
  
  while (i >= 0) {
    const nextPart = parts[i];
    if ((nextPart + actualSeparator + result).length + 3 > maxLength) {
      break;
    }
    result = nextPart + actualSeparator + result;
    i--;
  }
  
  if (result.length + 3 > maxLength) {
    return '...' + result.slice(-(maxLength - 3));
  }
  
  return '...' + actualSeparator + result;
}
</script>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.2s ease-out forwards;
}
</style>
