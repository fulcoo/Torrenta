<template>
  <div
    class="flex flex-row items-center gap-1.5 sm:gap-3.5 p-3 sm:py-3 sm:px-4.5 rounded-xl transition-all duration-300 hover:scale-[1.002] hover:shadow-md group relative overflow-hidden border cursor-pointer select-none shrink-0"
    :class="selected ? 'bg-base-200 border-primary/30 shadow-md' : 'bg-base-100 border-base-content/10 shadow-sm'"
    @click="$emit('click-card')"
  >
    <!-- Left Visualizer solid vertical bar -->
    <div
      class="absolute left-0 top-0 bottom-0 w-[4px] transition-all duration-300 z-10"
      :class="statusColorClass"
    ></div>

    <!-- Progress Background overlay -->
    <div
      class="absolute inset-y-0 left-0 transition-all duration-500 ease-out pointer-events-none z-0"
      :class="[
         progressBgClass,
         isDownloadingFast ? 'animate-pulse' : ''
      ]"
      :style="progressBgStyle"
    ></div>

    <!-- Select Checkbox & Status Icon (Touch Ergonomic) -->
    <div class="flex items-center gap-1 sm:gap-2 relative z-10" @click.stop>
      <!-- Checkbox wrapper with min 44x44px touch space -->
      <label class="flex items-center justify-center h-8 w-6 sm:h-9 sm:w-9 cursor-pointer select-none">
        <input
          type="checkbox"
          :checked="selected"
          @change="$emit('toggle-select')"
          class="checkbox checkbox-primary checkbox-xs sm:checkbox-sm border-base-content/30 transition-transform duration-200 active:scale-95"
        />
      </label>

      <!-- Circle Status Indicator -->
      <div
        class="h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all duration-300"
        :class="statusBadgeClass"
      >
        <component :is="statusIcon" class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </div>
    </div>

    <!-- Central Telemetry Section -->
    <div class="flex-1 min-w-0 flex flex-col gap-1 sm:gap-1.5 relative z-10">
      <!-- Row 1: Name, Category, Progress percentage -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5 min-w-0 flex-1">
          <h3 class="text-xs sm:text-[13.5px] font-bold text-base-content truncate flex-1" :title="torrent.name">
            {{ torrent.name }}
          </h3>
          <!-- Category Badge -->
          <span
            v-if="torrent.category"
            class="badge bg-base-300 text-base-content/75 border-none text-[8px] sm:text-[9px] px-1.5 py-0.5 h-4.5 font-bold shrink-0"
          >
            {{ torrent.category }}
          </span>
        </div>
        
        <div class="flex items-center gap-2 shrink-0">
          <span 
            class="text-xs font-black tabular-nums"
            :class="progressTextColorClass"
          >
            {{ torrent.progress.toFixed(1) }}%
          </span>
        </div>
      </div>

      <!-- Row 2: Size & Save Path & Time (plus Speeds & Status on mobile to save a row) -->
      <div class="flex items-center gap-x-2 text-[9px] sm:text-[10px] text-base-content/50 font-bold w-full whitespace-nowrap overflow-hidden">
        <div class="shrink-0">{{ formatSize(torrent.size) }}</div>
        
        <template v-if="torrent.savepath">
          <span class="opacity-30 hidden sm:inline shrink-0">•</span>
          <div class="hidden sm:flex items-center gap-1 min-w-0 truncate" :title="torrent.savepath">
            <span class="opacity-60 shrink-0">{{ t('torrent.saveTo') }}:</span>
            <span class="font-mono truncate">{{ torrent.savepath }}</span>
          </div>
        </template>
 
        <template v-if="torrent.added_on">
          <span class="opacity-30 hidden sm:inline shrink-0">•</span>
          <div class="hidden sm:block shrink-0">{{ displayDateText }}</div>
        </template>
 
        <!-- Mobile-only Speeds & ETA -->
        <span v-if="torrent.downloadSpeed > 0 || torrent.uploadSpeed > 0" class="opacity-30 sm:hidden shrink-0">•</span>
        <div v-if="torrent.downloadSpeed > 0" class="flex sm:hidden items-center gap-0.5 text-primary font-bold tabular-nums shrink-0">
          <ArrowDownIcon class="h-3 w-3 shrink-0" />
          <span>{{ formatSpeed(torrent.downloadSpeed) }}</span>
        </div>
        <div v-if="torrent.uploadSpeed > 0" class="flex sm:hidden items-center gap-0.5 text-secondary font-bold tabular-nums shrink-0">
          <ArrowUpIcon class="h-3 w-3 shrink-0" />
          <span>{{ formatSpeed(torrent.uploadSpeed) }}</span>
        </div>
        <div v-if="torrent.status === 'downloading' && torrent.eta > 0" class="flex sm:hidden items-center gap-0.5 text-base-content/80 font-bold shrink-0">
          <ClockIcon class="h-3 w-3 opacity-60 shrink-0" />
          <span>{{ formatEta(torrent.eta) }}</span>
        </div>
 
        <!-- Mobile-only Status Badge -->
        <div class="sm:hidden capitalize text-[8px] font-extrabold px-1.5 py-0.2 rounded bg-base-content/10 text-base-content/80 select-none ml-auto shrink-0">
          {{ t('torrent.status.' + torrent.status) }}
        </div>
      </div>
 
      <!-- Row 3: Speeds & Swarm Details & Status Badge (Desktop only) -->
      <div class="hidden sm:flex items-center gap-x-2 sm:gap-x-3 text-[10px] sm:text-[10.5px] text-base-content/65 font-semibold whitespace-nowrap overflow-hidden">
        <!-- Downloading speed -->
        <div v-if="torrent.downloadSpeed > 0" class="flex items-center gap-0.5 text-primary font-bold tabular-nums shrink-0">
          <ArrowDownIcon class="h-3 w-3 shrink-0" />
          <span>{{ formatSpeed(torrent.downloadSpeed) }}</span>
        </div>
 
        <!-- Uploading speed -->
        <div v-if="torrent.uploadSpeed > 0" class="flex items-center gap-0.5 text-secondary font-bold tabular-nums shrink-0">
          <ArrowUpIcon class="h-3 w-3 shrink-0" />
          <span>{{ formatSpeed(torrent.uploadSpeed) }}</span>
        </div>
 
        <!-- ETA -->
        <div v-if="torrent.status === 'downloading' && torrent.eta > 0" class="flex items-center gap-0.5 text-base-content/80 font-bold shrink-0">
          <ClockIcon class="h-3 w-3 opacity-60 shrink-0" />
          <span>{{ formatEta(torrent.eta) }}</span>
        </div>
 
        <!-- Swarm Seeds / Peers (Hidden on Mobile) -->
        <div class="hidden sm:flex items-center gap-2 opacity-80 text-[10px] font-bold shrink-0">
          <span class="text-base-content/15">|</span>
          <span class="flex items-center gap-0.5">
            <span class="text-base-content/40">{{ t('torrent.seedsCount') }}:</span>
            <span class="text-base-content/80 font-mono">{{ torrent.num_seeds ?? 0 }}/{{ torrent.num_seeds_total ?? 0 }}</span>
          </span>
          <span class="flex items-center gap-0.5">
            <span class="text-base-content/40">{{ t('torrent.peersCount') }}:</span>
            <span class="text-base-content/80 font-mono">{{ torrent.num_peers ?? 0 }}/{{ torrent.num_peers_total ?? 0 }}</span>
          </span>
        </div>
 
        <!-- Share Ratio (Hidden on Mobile) -->
        <div class="hidden sm:flex items-center gap-1 text-[10px] font-bold shrink-0">
          <span class="text-base-content/15">|</span>
          <span class="text-base-content/40">{{ t('torrent.ratio', { ratio: '' }).replace(':', '').trim() }}:</span>
          <span class="text-base-content/80 font-mono">{{ torrent.ratio.toFixed(2) }}</span>
        </div>
 
        <!-- Uploaded volume (Hidden on Mobile) -->
        <template v-if="torrent.uploaded">
          <div class="hidden sm:flex items-center gap-0.5 text-[10px] font-bold shrink-0">
            <span class="text-base-content/15">|</span>
            <span class="text-base-content/40">{{ t('torrent.uploadedShort') }}:</span>
            <span class="text-secondary/80 font-mono">{{ formatSize(torrent.uploaded) }}</span>
          </div>
        </template>
 
        <!-- Status Badge -->
        <div class="capitalize text-[8.5px] sm:text-[9.5px] font-extrabold px-1.5 py-0.2 rounded bg-base-content/10 text-base-content/80 select-none ml-auto shrink-0">
          {{ t('torrent.status.' + torrent.status) }}
        </div>
      </div>
    </div>

    <!-- Actions Sidebar (Visible on Hover in Desktop, persistent on touch screen) -->
    <div
      class="flex items-center justify-end gap-1.5 sm:gap-2 pl-2 sm:pl-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 relative z-10 shrink-0"
    >
      <button
        v-if="torrent.status === 'paused'"
        @click.stop="$emit('resume')"
        class="btn btn-primary w-8 h-8 min-h-[32px] sm:w-9 sm:h-9 sm:min-h-[36px] flex items-center justify-center rounded-full p-0 hover:scale-105 active:scale-95 shadow-md shadow-primary/20 shrink-0"
        :title="t('torrent.resume')"
      >
        <PlayIcon class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>

      <button
        v-else-if="torrent.status === 'downloading' || torrent.status === 'seeding' || torrent.status === 'queued' || torrent.status === 'moving'"
        @click.stop="$emit('pause')"
        class="btn btn-neutral w-8 h-8 min-h-[32px] sm:w-9 sm:h-9 sm:min-h-[36px] flex items-center justify-center rounded-full p-0 hover:scale-105 active:scale-95 shrink-0"
        :title="t('torrent.pause')"
      >
        <PauseIcon class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>

      <button
        @click.stop="$emit('delete')"
        class="btn btn-ghost w-8 h-8 min-h-[32px] sm:w-9 sm:h-9 sm:min-h-[36px] flex items-center justify-center rounded-full p-0 hover:bg-error/20 text-error hover:scale-105 active:scale-95 shrink-0"
        :title="t('torrent.delete')"
      >
        <Trash2Icon class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { UnifiedTorrent } from '@/models/torrent';
import { useI18n } from '@/i18n/useI18n';
import {
  PlayIcon,
  PauseIcon,
  Trash2Icon,
  ArrowDownIcon,
  ArrowUpIcon,
  DownloadIcon,
  UploadIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  ClockIcon,
  MoveIcon,
} from 'lucide-vue-next';

const props = defineProps<{
  torrent: UnifiedTorrent;
  selected: boolean;
}>();

defineEmits<{
  (e: 'toggle-select'): void;
  (e: 'pause'): void;
  (e: 'resume'): void;
  (e: 'delete'): void;
  (e: 'click-card'): void;
}>();

const { t } = useI18n();

// Fast download animation trigger ( > 1 MB/s )
const isDownloadingFast = computed(() => {
  return props.torrent.status === 'downloading' && props.torrent.downloadSpeed > 1024 * 1024;
});

// Left visual solid color code
const statusColorClass = computed(() => {
  switch (props.torrent.status) {
    case 'downloading':
      return 'bg-primary';
    case 'seeding':
      return 'bg-success';
    case 'paused':
      return 'bg-base-content/25';
    case 'checking':
      return 'bg-warning';
    case 'error':
      return 'bg-error';
    case 'queued':
      return 'bg-info';
    case 'moving':
      return 'bg-cyan-500';
    default:
      return 'bg-base-content/20';
  }
});

// Progress overlay background color class (utilizes framework's native theme colors)
const progressBgClass = computed(() => {
  switch (props.torrent.status) {
    case 'downloading':
      return 'bg-primary';
    case 'seeding':
      return 'bg-success';
    case 'paused':
      return 'bg-base-content';
    case 'checking':
      return 'bg-warning';
    case 'error':
      return 'bg-error';
    case 'queued':
      return 'bg-info';
    case 'moving':
      return 'bg-cyan-500';
    default:
      return 'bg-primary';
  }
});

// Progress overlay background style (controls width and transparency in a standard-compliant manner)
const progressBgStyle = computed(() => {
  let opacity = 0.15;
  
  switch (props.torrent.status) {
    case 'paused':
      opacity = 0.08;
      break;
    case 'error':
      opacity = 0.2;
      break;
    default:
      opacity = 0.15;
  }
  
  return {
    width: props.torrent.progress + '%',
    opacity: opacity
  };
});


// Progress percentage text color code
const progressTextColorClass = computed(() => {
  switch (props.torrent.status) {
    case 'downloading':
      return 'text-primary';
    case 'seeding':
      return 'text-success';
    case 'paused':
      return 'text-base-content/60';
    case 'checking':
      return 'text-warning';
    case 'error':
      return 'text-error';
    case 'queued':
      return 'text-info';
    case 'moving':
      return 'text-cyan-500';
    default:
      return 'text-primary';
  }
});

// Circle badge status styles
const statusBadgeClass = computed(() => {
  switch (props.torrent.status) {
    case 'downloading':
      return 'bg-primary/10 text-primary glow-primary';
    case 'seeding':
      return 'bg-success/10 text-success glow-success';
    case 'paused':
      return 'bg-base-200 text-base-content/60 border border-base-content/10';
    case 'checking':
      return 'bg-warning/10 text-warning glow-warning';
    case 'error':
      return 'bg-error/10 text-error glow-error';
    case 'queued':
      return 'bg-info/10 text-info glow-info';
    case 'moving':
      return 'bg-cyan-500/10 text-cyan-500';
    default:
      return 'bg-base-content/10 text-base-content';
  }
});

// Icons mapping based on state
const statusIcon = computed(() => {
  switch (props.torrent.status) {
    case 'downloading':
      return DownloadIcon;
    case 'seeding':
      return UploadIcon;
    case 'paused':
      return PauseIcon;
    case 'checking':
      return RefreshCwIcon;
    case 'error':
      return AlertCircleIcon;
    case 'queued':
      return ClockIcon;
    case 'moving':
      return MoveIcon;
    default:
      return DownloadIcon;
  }
});

// Utility format size
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0 || !isFinite(bytes) || isNaN(bytes)) return t('common.unknown');
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Utility format speed
function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0) return '0 B/s';
  if (bytesPerSec < 0 || !isFinite(bytesPerSec) || isNaN(bytesPerSec)) return t('common.unknown');
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.min(Math.floor(Math.log(bytesPerSec) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Utility format ETA
function formatEta(seconds: number): string {
  if (seconds === 8640000 || seconds >= 315360000 || !isFinite(seconds) || isNaN(seconds)) return '∞';
  if (seconds <= 0) return '0s';
  
  const w = Math.floor(seconds / (86400 * 7));
  const d = Math.floor((seconds % (86400 * 7)) / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (w > 0) parts.push(`${w}w`);
  if (d > 0 && parts.length < 2) parts.push(`${d}d`);
  if (h > 0 && parts.length < 2) parts.push(`${h}h`);
  if (m > 0 && parts.length < 2) parts.push(`${m}m`);
  if (s > 0 && parts.length < 2) parts.push(`${s}s`);
  return parts.join(' ');
}

// Format date helper
function formatDate(timestamp?: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Display date text computed based on state
const displayDateText = computed(() => {
  if (props.torrent.status === 'seeding' && props.torrent.completion_on) {
    return t('torrent.completedOn', { date: formatDate(props.torrent.completion_on) });
  }
  return t('torrent.addedOn', { date: formatDate(props.torrent.added_on) });
});
</script>

<style scoped>
/* Scoped glow transitions */
.glow-primary {
  box-shadow: 0 0 10px hsla(var(--p), 0.5);
}
.glow-success {
  box-shadow: 0 0 10px hsla(var(--su), 0.5);
}
.glow-warning {
  box-shadow: 0 0 10px hsla(var(--wa), 0.5);
}
.glow-error {
  box-shadow: 0 0 10px hsla(var(--er), 0.5);
}
.glow-info {
  box-shadow: 0 0 10px hsla(var(--in), 0.5);
}
</style>
