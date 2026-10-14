<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { useTorrentStore } from '@/stores/torrent';
import { useI18n } from '@/i18n/useI18n';
import {
  ActivityIcon,
  UserIcon,
  LockIcon,
  GlobeIcon,
  EyeIcon,
  EyeOffIcon,
  LogInIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  LanguagesIcon,
  HelpCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  ServerIcon
} from 'lucide-vue-next';

const authStore = useAuthStore();
const appStore = useAppStore();
const torrentStore = useTorrentStore();
const { t } = useI18n();

const url = ref(appStore.url || '');
const username = ref(appStore.username || 'admin');
const password = ref('');
const showPassword = ref(false);
const errorMessage = ref('');
const isLoading = ref(false);
const showSolutions = ref(true);
const showAdvancedUrl = ref(false);

// Watch for store changes to initialize inputs
watch(
  () => appStore.username,
  (val) => {
    if (val && !username.value) {
      username.value = val;
    }
  },
  { immediate: true }
);

watch(
  () => appStore.url,
  (val) => {
    if (val && !url.value) {
      url.value = val;
    }
  },
  { immediate: true }
);

const isLocked = computed(() => authStore.isLocked);
const lockReason = computed(() => authStore.lockReason);
const isConnectionIssue = computed(() => {
  return lockReason.value === 'connection_failed' || lockReason.value === 'not_configured';
});

async function handleLogin() {
  if (!username.value.trim()) {
    errorMessage.value = t('settings.authUsernameEmpty');
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    const result = await authStore.login(username.value, password.value, url.value);
    isLoading.value = false;

    if (result.success) {
      password.value = '';
      errorMessage.value = '';
    } else {
      errorMessage.value = result.error || t('auth.invalidCredentials');
    }
  } catch (err: any) {
    isLoading.value = false;
    errorMessage.value = err.message || t('auth.invalidCredentials');
  }
}

function handleSwitchToSimulation() {
  appStore.setSimulationMode(true);
  torrentStore.bootClient().then(() => {
    errorMessage.value = '';
  });
}

function toggleLocale() {
  const nextLocale = appStore.locale === 'zh' ? 'en' : 'zh';
  appStore.setLocale(nextLocale);
}
</script>

<template>
  <transition name="auth-fade">
    <div
      v-if="isLocked"
      class="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-base-300/85 backdrop-blur-xl select-none overflow-y-auto"
    >
      <!-- Background Ambient Glow -->
      <div class="fixed -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="fixed -bottom-40 -right-40 w-96 h-96 bg-secondary/20 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Login Card -->
      <div
        class="relative w-full max-w-lg bg-base-100/95 backdrop-blur-2xl border border-base-content/15 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-primary/10 flex flex-col gap-5 my-auto"
      >
        <!-- Top Language Selector -->
        <div class="absolute top-4 right-4 z-10">
          <button
            type="button"
            @click="toggleLocale"
            class="btn btn-ghost btn-xs rounded-xl gap-1.5 opacity-70 hover:opacity-100 text-xs font-bold"
            :title="appStore.locale === 'zh' ? 'Switch to English' : '切换为简体中文'"
          >
            <LanguagesIcon class="h-3.5 w-3.5" />
            <span>{{ appStore.locale === 'zh' ? 'English' : '简体中文' }}</span>
          </button>
        </div>

        <!-- Brand & Header -->
        <div class="flex flex-col items-center text-center gap-2 pt-1">
          <div class="h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-xl shadow-primary/30">
            <ActivityIcon class="h-6 w-6" />
          </div>
          <div>
            <h1 class="text-lg font-black tracking-wider bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              TORRENTA
            </h1>
            <p class="text-sm font-bold text-base-content mt-0.5 flex items-center justify-center gap-1.5">
              <ServerIcon v-if="isConnectionIssue" class="h-4 w-4 text-warning" />
              <ShieldCheckIcon v-else class="h-4 w-4 text-primary" />
              <span>{{ isConnectionIssue ? t('auth.connIssueTitle') : t('auth.modalTitle') }}</span>
            </p>
            <p class="text-xs opacity-60 mt-0.5 max-w-sm mx-auto">
              {{ isConnectionIssue ? t('auth.connIssueSubtitle') : t('auth.modalSubtitle') }}
            </p>
          </div>
        </div>

        <!-- Connection Error Banner (When connection issue exists) -->
        <div
          v-if="isConnectionIssue && (torrentStore.connectionError || errorMessage)"
          class="bg-warning/15 border border-warning/30 text-base-content rounded-2xl p-3 text-xs flex flex-col gap-1.5 animate-fadeIn"
        >
          <div class="flex items-center gap-2 font-bold text-amber-600 dark:text-warning">
            <AlertTriangleIcon class="h-4 w-4 shrink-0" />
            <span>{{ t('auth.connErrorAlert', { error: errorMessage || torrentStore.connectionError || 'Connection failed' }) }}</span>
          </div>
        </div>

        <!-- General Error Banner (When standard auth fails) -->
        <transition name="slide-down">
          <div
            v-if="!isConnectionIssue && errorMessage"
            class="bg-error/15 border border-error/30 text-error rounded-xl p-3 text-xs font-bold flex items-center gap-2.5 animate-shake"
          >
            <AlertCircleIcon class="h-4 w-4 shrink-0" />
            <span class="flex-1">{{ errorMessage }}</span>
          </div>
        </transition>

        <!-- Troubleshooting Solutions Card (When connection issue exists) -->
        <div v-if="isConnectionIssue" class="bg-base-200/50 border border-base-content/10 rounded-2xl overflow-hidden transition-all text-left">
          <button
            type="button"
            @click="showSolutions = !showSolutions"
            class="w-full p-3 flex items-center justify-between text-xs font-bold text-base-content/85 hover:bg-base-content/5 transition-colors"
          >
            <span class="flex items-center gap-1.5 text-primary">
              <HelpCircleIcon class="h-4 w-4" />
              <span>{{ t('auth.solutionsTitle') }}</span>
            </span>
            <component :is="showSolutions ? ChevronUpIcon : ChevronDownIcon" class="h-3.5 w-3.5 opacity-60" />
          </button>

          <div v-if="showSolutions" class="p-3 pt-0 flex flex-col gap-2.5 text-[11px] border-t border-base-content/5 divide-y divide-base-content/5">
            <!-- Solution 1 -->
            <div class="pt-2 flex flex-col gap-0.5">
              <span class="font-bold text-base-content flex items-center gap-1.5">
                <span class="badge badge-primary badge-xs scale-90">1</span>
                {{ t('auth.solution1Title') }}
              </span>
              <span class="text-base-content/70 pl-5 leading-relaxed">{{ t('auth.solution1Desc') }}</span>
            </div>

            <!-- Solution 2 -->
            <div class="pt-2 flex flex-col gap-0.5">
              <span class="font-bold text-base-content flex items-center gap-1.5">
                <span class="badge badge-secondary badge-xs scale-90">2</span>
                {{ t('auth.solution2Title') }}
              </span>
              <span class="text-base-content/70 pl-5 leading-relaxed">{{ t('auth.solution2Desc') }}</span>
            </div>

            <!-- Solution 3 -->
            <div class="pt-2 flex flex-col gap-0.5">
              <span class="font-bold text-base-content flex items-center gap-1.5">
                <span class="badge badge-accent badge-xs scale-90">3</span>
                {{ t('auth.solution3Title') }}
              </span>
              <span class="text-base-content/70 pl-5 leading-relaxed">{{ t('auth.solution3Desc') }}</span>
            </div>

            <!-- Solution 4 -->
            <div class="pt-2 flex flex-col gap-0.5">
              <span class="font-bold text-base-content flex items-center gap-1.5">
                <span class="badge badge-neutral badge-xs scale-90">4</span>
                {{ t('auth.solution4Title') }}
              </span>
              <span class="text-base-content/70 pl-5 leading-relaxed">{{ t('auth.solution4Desc') }}</span>
            </div>
          </div>
        </div>

        <!-- Form Fields (Solve directly on login page) -->
        <form @submit.prevent="handleLogin" class="flex flex-col gap-3.5 text-left">
          <!-- WebUI Server URL (Always visible if connection issue, or toggleable) -->
          <div v-if="isConnectionIssue || showAdvancedUrl" class="form-control w-full animate-fadeIn">
            <label class="label py-1 text-xs font-bold opacity-75 justify-between">
              <span>{{ t('auth.serverUrl') }}</span>
              <span class="text-[10px] text-primary lowercase">{{ t('settings.autoDetect') }}</span>
            </label>
            <div class="relative flex items-center">
              <GlobeIcon class="absolute left-3.5 h-4 w-4 opacity-40 pointer-events-none" />
              <input
                v-model="url"
                type="text"
                :placeholder="t('auth.serverUrlPlaceholder')"
                class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-xs h-10 !pl-10 pr-4 border border-base-content/15 font-mono"
              />
            </div>
          </div>

          <!-- Toggle Advanced URL when not in connection issue mode -->
          <div v-else class="text-right">
            <button
              type="button"
              @click="showAdvancedUrl = true"
              class="text-[11px] text-primary/80 hover:text-primary font-semibold underline underline-offset-2"
            >
              {{ t('auth.serverUrl') }}
            </button>
          </div>

          <!-- Username Input -->
          <div class="form-control w-full">
            <label class="label py-1 text-xs font-bold opacity-75">
              <span>{{ t('auth.username') }}</span>
            </label>
            <div class="relative flex items-center">
              <UserIcon class="absolute left-3.5 h-4 w-4 opacity-40 pointer-events-none" />
              <input
                v-model="username"
                type="text"
                autocomplete="username"
                autofocus
                :placeholder="t('auth.usernamePlaceholder')"
                class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-sm h-11 !pl-10 pr-4 border border-base-content/15 font-medium transition-all"
                :class="{ 'border-error': errorMessage }"
              />
            </div>
          </div>

          <!-- Password Input -->
          <div class="form-control w-full">
            <label class="label py-1 text-xs font-bold opacity-75">
              <span>{{ t('auth.password') }}</span>
            </label>
            <div class="relative flex items-center">
              <LockIcon class="absolute left-3.5 h-4 w-4 opacity-40 pointer-events-none" />
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                :placeholder="t('auth.passwordPlaceholder')"
                class="input input-bordered w-full rounded-xl bg-base-200 focus:outline-none focus:border-primary text-sm h-11 !pl-10 pr-10 border border-base-content/15 font-mono transition-all"
                :class="{ 'border-error': errorMessage }"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 btn btn-ghost btn-xs btn-circle opacity-50 hover:opacity-100"
                tabindex="-1"
              >
                <EyeOffIcon v-if="showPassword" class="h-4 w-4" />
                <EyeIcon v-else class="h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- 24-hour Session Expiry Notice -->
          <div class="flex items-center gap-2 p-2.5 rounded-xl bg-base-200/50 border border-base-content/5 text-[11px] text-base-content/70">
            <ClockIcon class="h-4 w-4 text-primary shrink-0" />
            <span>{{ t('auth.sessionPolicy') }}</span>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="btn btn-primary w-full rounded-xl font-bold h-11 shadow-lg shadow-primary/25 mt-1 gap-2 flex items-center justify-center text-sm"
          >
            <span v-if="isLoading" class="loading loading-spinner loading-xs"></span>
            <LogInIcon v-else class="h-4 w-4" />
            <span>{{ isLoading ? t('auth.loggingIn') : (isConnectionIssue ? t('auth.connectAndLoginBtn') : t('auth.loginBtn')) }}</span>
          </button>
        </form>

        <!-- Fallback: Quick Switch to Simulation Mode (Preview UI) -->
        <div v-if="isConnectionIssue" class="border-t border-base-content/10 pt-3 flex justify-center">
          <button
            type="button"
            @click="handleSwitchToSimulation"
            class="btn btn-ghost btn-xs rounded-xl gap-1.5 text-xs font-semibold opacity-75 hover:opacity-100 text-secondary"
          >
            <SparklesIcon class="h-3.5 w-3.5 text-warning" />
            <span>{{ t('auth.switchToSimulation') }}</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.auth-fade-enter-active,
.auth-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.auth-fade-enter-from,
.auth-fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease-out;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}

.animate-shake {
  animation: shake 0.4s ease-in-out;
}
</style>
