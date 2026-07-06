<template>
  <div class="bg-base-100 rounded-2xl p-4 shadow-sm flex flex-col w-full h-full border border-base-content/10">
    <!-- Telemetry Speeds Header -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-4">
        <!-- Download -->
        <div class="flex items-center gap-2">
          <div class="h-2 w-2 rounded-full bg-primary glow-primary"></div>
          <div>
            <div class="text-[10px] uppercase font-bold tracking-wider opacity-60">{{ t('dashboard.speedChart.globalDl') }}</div>
            <div class="text-sm font-extrabold font-mono text-primary">
              {{ formatSpeed(torrentStore.globalState?.globalDownloadSpeed || 0) }}
            </div>
          </div>
        </div>

        <!-- Upload -->
        <div class="flex items-center gap-2">
          <div class="h-2 w-2 rounded-full bg-secondary glow-secondary"></div>
          <div>
            <div class="text-[10px] uppercase font-bold tracking-wider opacity-60">{{ t('dashboard.speedChart.globalUl') }}</div>
            <div class="text-sm font-extrabold font-mono text-secondary">
              {{ formatSpeed(torrentStore.globalState?.globalUploadSpeed || 0) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Max Scale Indicator -->
      <div class="text-[10px] font-mono opacity-50 text-right">
        {{ t('dashboard.speedChart.maxScale', { speed: formatSpeed(maxSpeed) }) }}
      </div>
    </div>

    <!-- Wavy Chart SVG Frame -->
    <div class="flex-1 w-full relative min-h-[90px] mt-1" ref="container">
      <svg
        v-if="pointsCount > 0"
        viewBox="0 0 400 100"
        preserveAspectRatio="none"
        class="w-full h-full overflow-visible"
      >
        <!-- Definitions for Gradients -->
        <defs>
          <linearGradient id="dl-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="oklch(var(--p))" stop-opacity="0.3" />
            <stop offset="100%" stop-color="oklch(var(--p))" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="ul-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="oklch(var(--s))" stop-opacity="0.2" />
            <stop offset="100%" stop-color="oklch(var(--s))" stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- Grid Lines -->
        <g stroke="oklch(var(--bc) / 0.05)" stroke-width="0.5">
          <line x1="0" y1="25" x2="400" y2="25" />
          <line x1="0" y1="50" x2="400" y2="50" />
          <line x1="0" y1="75" x2="400" y2="75" />
        </g>

        <!-- DL Area under curve -->
        <path
          :d="dlAreaPath"
          fill="url(#dl-gradient)"
        />

        <!-- UL Area under curve -->
        <path
          :d="ulAreaPath"
          fill="url(#ul-gradient)"
        />

        <!-- DL Stroke Line -->
        <path
          :d="dlLinePath"
          fill="none"
          stroke="oklch(var(--p))"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- UL Stroke Line -->
        <path
          :d="ulLinePath"
          fill="none"
          stroke="oklch(var(--s))"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useTorrentStore } from '@/stores/torrent';
import { useI18n } from '@/i18n/useI18n';

const torrentStore = useTorrentStore();
const { t } = useI18n();
const pointsCount = 30;

// Track history array
const dlHistory = ref<number[]>(new Array(pointsCount).fill(0));
const ulHistory = ref<number[]>(new Array(pointsCount).fill(0));

// Capture ticks
watch(
  () => torrentStore.globalState,
  (newState) => {
    if (newState) {
      dlHistory.value.push(newState.globalDownloadSpeed);
      dlHistory.value.shift();
      ulHistory.value.push(newState.globalUploadSpeed);
      ulHistory.value.shift();
    }
  },
  { deep: true }
);

// Determine max value in history to scale graph dynamically
const maxSpeed = computed(() => {
  const all = [...dlHistory.value, ...ulHistory.value];
  const highest = Math.max(...all);
  // Default scale floor at 1 MB/s so graph isn't wildly jumping at idle speeds
  const floor = 1024 * 1024;
  return highest > floor ? highest : floor;
});

// Format bytes into human readable speed
function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0) return '0 B/s';
  if (bytesPerSec < 0 || !isFinite(bytesPerSec) || isNaN(bytesPerSec)) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.min(Math.floor(Math.log(bytesPerSec) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Compute coordinates for drawing
const dlCoordinates = computed(() => {
  return dlHistory.value.map((val, idx) => {
    const x = (idx / (pointsCount - 1)) * 400;
    // Keep 5px margin top and bottom for visual aesthetics
    const y = 95 - (val / maxSpeed.value) * 85;
    return { x, y };
  });
});

const ulCoordinates = computed(() => {
  return ulHistory.value.map((val, idx) => {
    const x = (idx / (pointsCount - 1)) * 400;
    const y = 95 - (val / maxSpeed.value) * 85;
    return { x, y };
  });
});

// SVG Bezier Curve Generator
function getBezierPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX1 = p0.x + (p1.x - p0.x) / 3;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (2 * (p1.x - p0.x)) / 3;
    const cpY2 = p1.y;
    d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }
  return d;
}

const dlLinePath = computed(() => {
  return getBezierPath(dlCoordinates.value);
});

const dlAreaPath = computed(() => {
  const linePath = dlLinePath.value;
  if (!linePath) return '';
  return `${linePath} L 400 100 L 0 100 Z`;
});

const ulLinePath = computed(() => {
  return getBezierPath(ulCoordinates.value);
});

const ulAreaPath = computed(() => {
  const linePath = ulLinePath.value;
  if (!linePath) return '';
  return `${linePath} L 400 100 L 0 100 Z`;
});
</script>

<style scoped>
/* Snappy curve rendering transitions */
path {
  transition: d 0.15s ease-in-out;
}
</style>
