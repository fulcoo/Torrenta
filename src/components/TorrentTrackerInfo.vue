<template>
  <section class="pt-2 border-t border-base-content/5 min-w-0" :aria-label="t('torrent.trackerInfo')">
    <h4 class="font-black text-[11px] uppercase tracking-wider text-primary border-b border-base-content/10 pb-1.5 mb-2.5">
      {{ t('torrent.trackerInfo') }}
      <span v-if="trackers.length" class="ml-1 opacity-60">({{ trackers.length }})</span>
    </h4>
    <div v-if="loading" class="flex items-center justify-center gap-2 py-5" role="status">
      <span class="loading loading-spinner loading-xs text-primary"></span>
      <span class="opacity-50">{{ t('torrent.trackerInfoLoading') }}</span>
    </div>
    <p v-if="error" class="text-error py-2" role="alert">{{ t('torrent.trackerLoadError') }}</p>
    <p v-if="!loading && !error && !trackers.length" class="py-4 text-center opacity-50">{{ t('torrent.trackerInfoEmpty') }}</p>
    <div v-if="trackers.length" class="overflow-x-auto rounded-xl border border-base-content/10 select-text" tabindex="0" :aria-label="t('torrent.trackerInfo')">
      <table class="table table-xs w-full text-[11px]">
        <thead class="bg-base-200/50 text-base-content/60 whitespace-nowrap">
          <tr>
            <th>{{ t('torrent.trackerTier') }}</th>
            <th>{{ t('torrent.trackerAddress') }}</th>
            <th>{{ t('torrent.trackerStatus') }}</th>
            <th>{{ t('torrent.trackerPeers') }}</th>
            <th>{{ t('torrent.trackerSeeds') }}</th>
            <th>{{ t('torrent.trackerLeeches') }}</th>
            <th>{{ t('torrent.trackerDownloaded') }}</th>
            <th>{{ t('torrent.trackerMessage') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(tracker, index) in trackers" :key="`${tracker.url}-${index}`" class="border-base-content/5">
            <td class="font-mono text-center">{{ formatCount(tracker.tier) }}</td>
            <td class="min-w-[180px] max-w-[280px] break-all font-mono" :title="tracker.url">{{ tracker.url }}</td>
            <td class="whitespace-nowrap" :class="statusClass(tracker.status)">{{ statusLabel(tracker.status) }}</td>
            <td class="font-mono text-right">{{ formatCount(tracker.num_peers) }}</td>
            <td class="font-mono text-right">{{ formatCount(tracker.num_seeds) }}</td>
            <td class="font-mono text-right">{{ formatCount(tracker.num_leeches) }}</td>
            <td class="font-mono text-right">{{ formatCount(tracker.num_downloaded) }}</td>
            <td class="min-w-[120px] max-w-[280px] whitespace-pre-wrap break-words" :title="tracker.msg">{{ tracker.msg || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { TorrentTracker } from '@/models/torrent';
import { useTorrentStore } from '@/stores/torrent';
import { useI18n } from '@/i18n/useI18n';

const props = defineProps<{ torrentId: string }>();
const torrentStore = useTorrentStore();
const { t } = useI18n();
const trackers = ref<TorrentTracker[]>([]);
const loading = ref(true);
const error = ref(false);

function formatCount(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? String(value) : '—';
}

function statusLabel(status: number | undefined): string {
  const keys: Record<number, string> = {
    0: 'trackerDisabled',
    1: 'trackerNotContacted',
    2: 'trackerWorking',
    3: 'trackerUpdating',
    4: 'trackerNotWorking',
  };
  return t(status !== undefined && keys[status] ? `torrent.${keys[status]}` : 'common.unknown');
}

function statusClass(status: number | undefined): string {
  if (status === 2) return 'text-success';
  if (status === 4) return 'text-error';
  if (status === 3) return 'text-info';
  return 'text-base-content/50';
}

watch(() => props.torrentId, (id, _previousId, onCleanup) => {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  trackers.value = [];
  loading.value = true;
  error.value = false;

  onCleanup(() => {
    active = false;
    clearTimeout(timer);
  });

  async function refresh() {
    try {
      const result = await torrentStore.getTorrentTrackerDetails(id);
      if (!active) return;
      trackers.value = result;
      error.value = false;
    } catch {
      if (!active) return;
      error.value = true;
    } finally {
      if (active) {
        loading.value = false;
        // Schedule after completion to avoid overlapping requests on slow connections.
        timer = setTimeout(refresh, 2000);
      }
    }
  }

  void refresh();
}, { immediate: true });
</script>
