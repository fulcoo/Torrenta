<template>
  <dialog :open="open" class="modal bg-black/60 z-50" :class="{ 'modal-open': open }">
    <div class="modal-box bg-base-200 border border-base-content/10 max-w-2xl w-full rounded-2xl p-6 shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-base-content/10 shrink-0">
        <h3 class="font-black text-lg text-primary flex items-center gap-2">
          <GlobeIcon class="h-5.5 w-5.5 text-primary" /> 
          {{ t('torrent.trackerModalTitle') }}
          <span class="badge badge-sm badge-neutral ml-1 rounded-lg">
            {{ t('dashboard.selectedCount', { count: torrentIds.length }) }}
          </span>
        </h3>
        <button type="button" @click="closeModal" class="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:bg-base-content/10 h-8 w-8">
          <XIcon class="h-4 w-4" />
        </button>
      </div>

      <!-- Info Messages -->
      <div v-if="infoMessage" class="alert alert-info py-2 px-3 shadow-sm rounded-xl mt-3 text-xs font-semibold shrink-0 flex items-center gap-2">
        <InfoIcon class="h-4 w-4 shrink-0" />
        <span>{{ infoMessage }}</span>
      </div>

      <!-- Error Messages -->
      <div v-if="errorMessage" class="alert alert-error py-2 px-3 shadow-sm rounded-xl mt-3 text-xs font-semibold shrink-0 flex items-center gap-2">
        <AlertTriangleIcon class="h-4 w-4 shrink-0 animate-bounce" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex-1 flex flex-col items-center justify-center py-12 gap-3 text-sm font-semibold opacity-70">
        <span class="loading loading-spinner loading-md text-primary"></span>
        <span>{{ t('torrent.loading') }}</span>
      </div>

      <!-- Editor Content (Visible when loaded) -->
      <div v-else class="flex-1 overflow-y-auto my-4 pr-1 min-h-0 flex flex-col gap-4">
        <!-- View Toggle Tabs -->
        <div class="tabs tabs-boxed bg-base-300/40 p-1 rounded-xl flex shrink-0">
          <button 
            type="button"
            class="tab tab-sm flex-1 font-bold rounded-lg transition-all"
            :class="{ 'bg-primary text-primary-content shadow': viewMode === 'visual' }"
            @click="viewMode = 'visual'"
          >
            {{ t('torrent.visualMode') }}
          </button>
          <button 
            type="button"
            class="tab tab-sm flex-1 font-bold rounded-lg transition-all"
            :class="{ 'bg-primary text-primary-content shadow': viewMode === 'raw' }"
            @click="viewMode = 'raw'"
          >
            {{ t('torrent.rawMode') }}
          </button>
        </div>

        <!-- 1. Visual Mode View -->
        <div v-if="viewMode === 'visual'" class="flex flex-col gap-4">
          <div 
            v-for="tierIndex in activeTiers" 
            :key="tierIndex"
            class="border border-base-content/10 bg-base-200/40 rounded-2xl p-4 flex flex-col gap-3 relative transition-all hover:border-primary/20"
          >
            <!-- Tier Container Header -->
            <div class="flex items-center justify-between">
              <span class="font-bold text-xs uppercase opacity-75 flex items-center gap-1.5">
                <span class="w-1.5 h-3.5 bg-primary rounded-full"></span>
                {{ t('torrent.tier') }} {{ tierIndex }}
              </span>
            </div>

            <!-- Trackers inside this tier -->
            <div class="flex flex-col gap-2">
              <div 
                v-for="tracker in trackersByTier[tierIndex]" 
                :key="tracker.id"
                class="flex items-center gap-2 bg-base-300/30 border rounded-xl p-2 group transition-all"
                :class="isTrackerUrlInvalid(tracker.url) ? 'border-error/45 bg-error/5 text-error focus-within:border-error/50' : 'border-base-content/5 focus-within:border-primary/30'"
              >
                <input
                  v-model="trackers[tracker.originalIndex].url"
                  type="text"
                  :placeholder="t('torrent.trackerUrl')"
                  class="input input-ghost input-xs flex-1 bg-transparent border-0 outline-none text-xs font-mono select-all focus:outline-none focus:bg-transparent"
                  :class="isTrackerUrlInvalid(tracker.url) ? 'text-error placeholder-error/50' : ''"
                />
                <!-- Warning icon for invalid URL -->
                <AlertTriangleIcon v-if="isTrackerUrlInvalid(tracker.url)" class="h-3.5 w-3.5 text-error shrink-0 animate-pulse" :title="t('torrent.trackerUrlInvalidTitle')" />
                <!-- Move Tier Select -->
                <CustomSelect
                  v-model="trackers[tracker.originalIndex].tier"
                  :options="tierOptions"
                  size="sm"
                  class="!w-32 shrink-0"
                  button-class="!h-7 !min-h-[28px] !px-2 rounded-lg text-[10px] bg-base-100 hover:bg-base-300/40 font-bold border-base-content/10 focus:outline-none"
                />
                <!-- Delete Tracker -->
                <button 
                  type="button" 
                  @click="deleteTrackerById(tracker.id)"
                  class="btn btn-ghost btn-xs btn-square text-error hover:bg-error/15 h-7 w-7 min-h-[28px] shrink-0"
                  :title="t('torrent.deleteTracker')"
                >
                  <Trash2Icon class="h-3.5 w-3.5" />
                </button>
              </div>

              <!-- Empty state inside this tier -->
              <div 
                v-if="!trackersByTier[tierIndex] || trackersByTier[tierIndex].length === 0" 
                class="text-[10px] text-base-content/40 italic py-2 text-center select-none"
              >
                {{ t('torrent.noTrackers') }}
              </div>
            </div>

            <!-- Add tracker button for this specific tier -->
            <button 
              type="button" 
              @click="addTracker(tierIndex)"
              class="btn btn-ghost btn-xs text-primary font-bold hover:bg-primary/10 rounded-lg justify-start gap-1 h-8 mt-1 border border-dashed border-primary/15"
            >
              <PlusIcon class="h-3.5 w-3.5" />
              {{ t('torrent.addTracker') }}
            </button>
          </div>

          <!-- Add new Tier Card Button -->
          <button 
            type="button" 
            @click="addTier"
            class="btn btn-neutral btn-sm rounded-xl font-bold gap-1.5 h-10 w-full"
          >
            <PlusIcon class="h-4 w-4" />
            {{ t('torrent.addTier') }}
          </button>
        </div>

        <!-- 2. Raw Text Mode View -->
        <div v-else class="flex-1 flex flex-col gap-2 min-h-[240px]">
          <textarea
            v-model="rawText"
            rows="12"
            class="textarea textarea-bordered w-full flex-1 rounded-xl bg-base-200/50 border border-base-content/10 font-mono text-xs leading-relaxed focus:outline-none focus:border-primary p-4 whitespace-pre select-all"
            placeholder="udp://tracker.coppersurfer.tk:6969/announce&#10;udp://tracker.leechers-paradise.org:6969/announce&#10;&#10;udp://tracker.coppersurfer2.tk:6969/announce"
          ></textarea>
          <div class="text-[10px] opacity-50 px-1 font-medium leading-normal flex items-start gap-1">
            <InfoIcon class="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <span>{{ t('torrent.trackerRawDesc') }}</span>
          </div>
          <div v-if="hasInvalidUrlsInRaw" class="text-[10px] text-error font-extrabold px-1 flex items-start gap-1 mt-1 animate-fadeIn">
            <AlertTriangleIcon class="h-3.5 w-3.5 text-error shrink-0" />
            <span>{{ t('torrent.trackerRawInvalidWarn') }}</span>
          </div>
        </div>

        <!-- Safety Strategy Section (Mandatory for Multi-torrent Bulk updates) -->
        <div 
          v-if="torrentIds.length > 1" 
          class="border-t border-base-content/10 pt-4 shrink-0 flex flex-col gap-3.5"
        >
          <span class="font-bold text-xs uppercase text-warning flex items-center gap-1.5">
            <AlertTriangleIcon class="h-4 w-4 text-warning" />
            {{ t('torrent.safetyPolicyTitle') }}
          </span>

          <div class="flex flex-col gap-2">
            <!-- Append policy card -->
            <label 
              class="flex items-start gap-3 p-3 rounded-2xl border border-base-content/10 bg-base-200/30 hover:bg-base-200/60 cursor-pointer transition-all"
              :class="{ 'border-primary/40 bg-primary/5 shadow-md shadow-primary/5': safetyPolicy === 'append' }"
            >
              <input
                v-model="safetyPolicy"
                type="radio"
                value="append"
                name="safety-policy"
                class="radio radio-primary radio-sm mt-0.5 shrink-0"
              />
              <div class="flex flex-col text-left gap-0.5">
                <span class="text-xs font-black" :class="{ 'text-primary': safetyPolicy === 'append' }">
                  {{ t('torrent.policyAppend') }}
                </span>
                <span class="text-[10px] opacity-70 leading-normal">
                  {{ t('torrent.policyAppendDesc') }}
                </span>
              </div>
            </label>

            <!-- Overwrite policy card -->
            <label 
              class="flex items-start gap-3 p-3 rounded-2xl border border-base-content/10 bg-base-200/30 hover:bg-base-200/60 cursor-pointer transition-all"
              :class="{ 'border-error/40 bg-error/5 shadow-md shadow-error/5': safetyPolicy === 'overwrite' }"
            >
              <input
                v-model="safetyPolicy"
                type="radio"
                value="overwrite"
                name="safety-policy"
                class="radio radio-error radio-sm mt-0.5 shrink-0"
              />
              <div class="flex flex-col text-left gap-0.5">
                <span class="text-xs font-black text-error">
                  {{ t('torrent.policyOverwrite') }}
                </span>
                <span class="text-[10px] opacity-70 leading-normal">
                  {{ t('torrent.policyOverwriteDesc') }}
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Actions Footer -->
      <div class="modal-action gap-2 justify-end pt-4 border-t border-base-content/10 shrink-0 mt-0">
        <button 
          type="button" 
          @click="closeModal" 
          class="btn btn-ghost btn-sm rounded-xl font-bold h-9 min-h-[36px]"
          :disabled="isSaving"
        >
          {{ t('common.cancel') }}
        </button>
        <button 
          type="button" 
          @click="confirmSave" 
          class="btn btn-primary btn-sm rounded-xl px-5 shadow-lg shadow-primary/20 font-black h-9 min-h-[36px] flex items-center gap-1.5"
          :disabled="isSaving || isLoading || (torrentIds.length > 1 && !safetyPolicy)"
        >
          <span v-if="isSaving" class="loading loading-spinner loading-xs"></span>
          {{ t('torrent.confirm') }}
        </button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import CustomSelect from '@/components/CustomSelect.vue';
import { useTorrentStore } from '@/stores/torrent';
import { useI18n } from '@/i18n/useI18n';
import { 
  GlobeIcon, 
  XIcon, 
  Trash2Icon, 
  PlusIcon, 
  AlertTriangleIcon, 
  InfoIcon 
} from 'lucide-vue-next';

const props = defineProps<{
  open: boolean;
  torrentIds: string[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved', payload: { success: boolean }): void;
}>();

const torrentStore = useTorrentStore();
const { t } = useI18n();

const isLoading = ref(false);
const isSaving = ref(false);
const viewMode = ref<'visual' | 'raw'>('visual');
let tempIdCounter = 0;

const safetyPolicy = ref<'append' | 'overwrite' | ''>('');
const trackers = ref<{ id: number; url: string; tier: number }[]>([]);
const rawText = ref('');
const tiersCount = ref(1);
const infoMessage = ref('');
const errorMessage = ref('');

const tierOptions = computed(() => {
  const options = [];
  for (let i = 0; i < tiersCount.value; i++) {
    options.push({ value: i, label: `${t('torrent.tier')} ${i}` });
  }
  options.push({ value: tiersCount.value, label: `+ ${t('torrent.addTier')} (${t('torrent.tier')} ${tiersCount.value})` });
  return options;
});

// URL Validity Checks helper
function isTrackerUrlInvalid(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return !['http:', 'https:', 'udp:', 'ws:', 'wss:'].includes(parsed.protocol);
  } catch (err) {
    return true;
  }
}

// Warning flag computed for raw text view
const hasInvalidUrlsInRaw = computed(() => {
  if (viewMode.value !== 'raw') return false;
  const lines = rawText.value.split(/\r?\n/);
  return lines.some(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    return isTrackerUrlInvalid(trimmed);
  });
});

const MAX_TIERS = 100;

// Sync conversion functions
function visualToRaw(list: { id: number; url: string; tier: number }[]): string {
  if (list.length === 0) return '';
  const rawMaxT = Math.max(0, ...list.map(t => t.tier));
  const maxT = Math.min(Math.max(0, isFinite(rawMaxT) && !isNaN(rawMaxT) ? rawMaxT : 0), MAX_TIERS - 1);
  const linesByTier: string[][] = Array.from({ length: maxT + 1 }, () => []);
  
  list.forEach(t => {
    const u = t.url.trim();
    if (u) {
      const sanitizedTier = Math.min(Math.max(0, isFinite(t.tier) && !isNaN(t.tier) ? t.tier : 0), maxT);
      linesByTier[sanitizedTier].push(u);
    }
  });
  
  return linesByTier.map(tierList => tierList.join('\n')).join('\n\n');
}

function rawToVisual(text: string): { id: number; url: string; tier: number }[] {
  const lines = text.split(/\r?\n/);
  const result: { id: number; url: string; tier: number }[] = [];
  let currentT = 0;
  let hasTrackersInCurrentTier = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      if (hasTrackersInCurrentTier) {
        currentT++;
        hasTrackersInCurrentTier = false;
      }
    } else {
      if (currentT >= MAX_TIERS) {
        currentT = MAX_TIERS - 1;
      }
      result.push({ id: tempIdCounter++, url: trimmed, tier: currentT });
      hasTrackersInCurrentTier = true;
    }
  }
  return result;
}

// Watch view mode transitions to perform bi-directional live sync
watch(viewMode, (newMode) => {
  if (newMode === 'raw') {
    rawText.value = visualToRaw(trackers.value);
  } else if (newMode === 'visual') {
    trackers.value = rawToVisual(rawText.value);
    const rawMaxT = trackers.value.length > 0 ? Math.max(...trackers.value.map(t => t.tier)) : 0;
    const maxT = Math.min(Math.max(0, isFinite(rawMaxT) && !isNaN(rawMaxT) ? rawMaxT : 0), MAX_TIERS - 1);
    tiersCount.value = Math.max(1, maxT + 1);
  }
});

// Watch when modal is opened to perform data initialization
watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    // Reset state
    isLoading.value = true;
    isSaving.value = false;
    viewMode.value = 'visual';
    safetyPolicy.value = '';
    trackers.value = [];
    rawText.value = '';
    tiersCount.value = 1;
    infoMessage.value = '';
    errorMessage.value = '';
    tempIdCounter = 0;

    try {
      if (props.torrentIds.length === 1) {
        // Single task load
        const res = await torrentStore.getTorrentTrackers(props.torrentIds[0]);
        trackers.value = res.map(t => ({ id: tempIdCounter++, url: t.url, tier: Math.min(Math.max(0, t.tier), MAX_TIERS - 1) }));
        
        const rawMaxT = trackers.value.length > 0 ? Math.max(...trackers.value.map(t => t.tier)) : 0;
        const maxT = Math.min(Math.max(0, isFinite(rawMaxT) && !isNaN(rawMaxT) ? rawMaxT : 0), MAX_TIERS - 1);
        tiersCount.value = Math.max(1, maxT + 1);
      } else if (props.torrentIds.length > 1) {
        // Multi-task load (Common Intersection)
        const responses = await Promise.all(
          props.torrentIds.map(id => torrentStore.getTorrentTrackers(id))
        );

        // Strict intersection comparison
        const commonList: { url: string; tier: number }[] = [];
        if (responses.length > 0) {
          const firstList = responses[0];
          for (const item of firstList) {
            let matchesAll = true;
            for (let i = 1; i < responses.length; i++) {
              const matchedTracker = responses[i].find(t => t.url === item.url);
              if (!matchedTracker || matchedTracker.tier !== item.tier) {
                matchesAll = false;
                break;
              }
            }
            if (matchesAll) {
              commonList.push({ ...item });
            }
          }
        }

        trackers.value = commonList.map(t => ({ id: tempIdCounter++, url: t.url, tier: Math.min(Math.max(0, t.tier), MAX_TIERS - 1) }));

        if (commonList.length === 0) {
          // Empty Canvas Warning Tip
          infoMessage.value = t('torrent.emptyCanvasTip');
          tiersCount.value = 1;
        } else {
          const rawMaxT = trackers.value.length > 0 ? Math.max(...trackers.value.map(t => t.tier)) : 0;
          const maxT = Math.min(Math.max(0, isFinite(rawMaxT) && !isNaN(rawMaxT) ? rawMaxT : 0), MAX_TIERS - 1);
          tiersCount.value = Math.max(1, maxT + 1);
        }
      }
    } catch (err) {
      console.error('Failed to initialize trackers modal:', err);
      errorMessage.value = t('torrent.trackerLoadError');
    } finally {
      isLoading.value = false;
    }
  }
});

const activeTiers = computed(() => {
  const list = [];
  for (let i = 0; i < tiersCount.value; i++) {
    list.push(i);
  }
  return list;
});

const trackersByTier = computed(() => {
  const groups: Record<number, { id: number; url: string; tier: number; originalIndex: number }[]> = {};
  for (let i = 0; i < tiersCount.value; i++) {
    groups[i] = [];
  }
  trackers.value.forEach((t, idx) => {
    const tier = t.tier;
    if (groups[tier] === undefined) {
      groups[tier] = [];
    }
    groups[tier].push({ ...t, originalIndex: idx });
  });
  return groups;
});

// Operations in visual view mode
function addTracker(tier: number) {
  trackers.value.push({ id: tempIdCounter++, url: '', tier: Math.min(Math.max(0, tier), MAX_TIERS - 1) });
}

function deleteTrackerById(id: number) {
  trackers.value = trackers.value.filter(t => t.id !== id);
}

function addTier() {
  if (tiersCount.value < MAX_TIERS) {
    tiersCount.value++;
  }
}

// Watch tiers dropdown select to auto-expand tiersCount if user assigns to an index outside current count
watch(trackers, (newList) => {
  newList.forEach(t => {
    if (t.tier >= tiersCount.value) {
      tiersCount.value = Math.min(t.tier + 1, MAX_TIERS);
    }
  });
}, { deep: true });

function closeModal() {
  emit('close');
}

async function confirmSave() {
  // Clear messages
  errorMessage.value = '';

  // Synchronize rawText to list if saved from Raw Text view mode
  if (viewMode.value === 'raw') {
    trackers.value = rawToVisual(rawText.value);
  }

  // Filter trackers to ensure only valid URLs are sent
  const filtered = trackers.value
    .map(t => ({ url: t.url.trim(), tier: t.tier }))
    .filter(t => t.url !== '');

  // Validation: Check if there are any invalid non-empty tracker URLs
  const hasInvalid = filtered.some(t => isTrackerUrlInvalid(t.url));
  if (hasInvalid) {
    errorMessage.value = t('torrent.trackerSaveInvalidError');
    return;
  }

  // For multi-torrents bulk edits, strategy policy is mandatory
  if (props.torrentIds.length > 1 && !safetyPolicy.value) {
    errorMessage.value = t('torrent.policyRequiredError');
    return;
  }

  isSaving.value = true;
  try {
    const success = await torrentStore.saveTorrentTrackers(
      props.torrentIds,
      filtered,
      props.torrentIds.length > 1 ? (safetyPolicy.value as 'append' | 'overwrite') : undefined
    );

    if (success) {
      emit('saved', { success: true });
      closeModal();
    } else {
      errorMessage.value = t('torrent.saveFailed');
      emit('saved', { success: false });
    }
  } catch (err) {
    console.error('Save failed:', err);
    errorMessage.value = t('torrent.saveFailed');
    emit('saved', { success: false });
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped>
</style>
