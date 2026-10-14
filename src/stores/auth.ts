import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { safeStorage } from '@/utils/storage';
import { useAppStore } from './app';
import { useTorrentStore } from './torrent';

export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface AuthSession {
  username: string;
  loginTime: number;
}

export interface SecurityConfig {
  authEnabled: boolean;
  authUsername: string;
  authPassword?: string;
}

export const useAuthStore = defineStore('authStore', () => {
  const appStore = useAppStore();
  const torrentStore = useTorrentStore();

  const authEnabled = ref(safeStorage.getItem('torrenta_auth_enabled') === 'true');
  
  // The authentication credentials directly match qBittorrent
  const effectiveUsername = computed(() => {
    return appStore.username || safeStorage.getItem('torrenta_username') || safeStorage.getItem('torrenta_auth_username', 'admin') || 'admin';
  });

  const effectivePassword = computed(() => {
    return appStore.password || safeStorage.getItem('torrenta_password') || safeStorage.getItem('torrenta_auth_password', '');
  });

  const session = ref<AuthSession | null>(
    safeStorage.getJSON<AuthSession | null>('torrenta_auth_session', null)
  );

  // Time ticker to update remaining time and trigger reactive expiry
  const now = ref(Date.now());
  let ticker: any = null;

  function startTicker() {
    if (typeof window !== 'undefined' && !ticker) {
      ticker = setInterval(() => {
        now.value = Date.now();
        checkSessionExpiry();
      }, 30000); // Check every 30s
    }
  }

  function stopTicker() {
    if (ticker) {
      clearInterval(ticker);
      ticker = null;
    }
  }

  startTicker();

  const isExpired = computed(() => {
    if (!session.value || !session.value.loginTime) return true;
    return now.value - session.value.loginTime >= SESSION_DURATION_MS;
  });

  const isAuthenticated = computed(() => {
    if (!authEnabled.value) return true;
    if (!session.value) return false;
    if (session.value.username !== effectiveUsername.value) return false;
    return !isExpired.value;
  });

  // Determines why the login/connect modal is currently active
  const lockReason = computed<'none' | 'auth_required' | 'connection_failed' | 'not_configured'>(() => {
    if (appStore.simulationMode) {
      return (authEnabled.value && !isAuthenticated.value) ? 'auth_required' : 'none';
    }

    // 1. If downloader is not connected after boot attempt
    if (torrentStore.hasAttemptedBoot && !torrentStore.isConnected) {
      if (!appStore.url && !appStore.username && !appStore.password) {
        return 'not_configured';
      }
      return 'connection_failed';
    }

    // 2. If login protection is enabled and user is not authenticated or expired
    if (authEnabled.value && !isAuthenticated.value) {
      return 'auth_required';
    }

    return 'none';
  });

  const isLocked = computed(() => {
    return lockReason.value !== 'none';
  });

  const remainingTimeMs = computed(() => {
    if (!session.value || !session.value.loginTime) return 0;
    const elapsed = now.value - session.value.loginTime;
    return Math.max(0, SESSION_DURATION_MS - elapsed);
  });

  function touchSession() {
    if (session.value && !isExpired.value) {
      session.value.loginTime = Date.now();
      now.value = Date.now();
      safeStorage.setJSON('torrenta_auth_session', session.value);
    }
  }

  function checkSessionExpiry(): boolean {
    if (session.value && isExpired.value) {
      logout();
      return true;
    }
    return false;
  }

  async function login(user: string, pass: string, url?: string): Promise<{ success: boolean; error?: string }> {
    const cleanUser = (user || '').trim();
    const cleanPass = pass || '';
    const cleanUrl = url !== undefined ? url.trim() : appStore.url;

    // Try real downloader connection attempt
    try {
      const success = await torrentStore.connectWithCredentials(cleanUrl, cleanUser, cleanPass);
      if (success) {
        // Create 24-hour session
        const newSession: AuthSession = {
          username: cleanUser,
          loginTime: Date.now(),
        };
        session.value = newSession;
        now.value = Date.now();
        safeStorage.setJSON('torrenta_auth_session', newSession);
        safeStorage.setItem('torrenta_auth_username', cleanUser);
        safeStorage.setItem('torrenta_auth_password', cleanPass);
        return { success: true };
      }
      return { success: false, error: 'invalid_credentials' };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || '连接或登录失败，请检查 qBittorrent 状态和凭据',
      };
    }
  }

  function logout() {
    session.value = null;
    safeStorage.removeItem('torrenta_auth_session');
  }

  function updateAuthConfig(params: {
    enabled: boolean;
    username: string;
    password?: string;
  }) {
    authEnabled.value = params.enabled;
    safeStorage.setItem('torrenta_auth_enabled', String(params.enabled));

    const cleanUser = params.username.trim() || 'admin';
    safeStorage.setItem('torrenta_auth_username', cleanUser);

    if (params.password !== undefined && params.password !== '') {
      safeStorage.setItem('torrenta_auth_password', params.password);
      // Sync with qBittorrent config in appStore
      appStore.saveConfig(appStore.url, cleanUser, params.password, appStore.driverType);
    } else {
      appStore.saveConfig(appStore.url, cleanUser, appStore.password, appStore.driverType);
    }

    if (params.enabled) {
      // Refresh current session so user remains logged in for next 24h
      const activeSession: AuthSession = {
        username: cleanUser,
        loginTime: Date.now(),
      };
      session.value = activeSession;
      now.value = Date.now();
      safeStorage.setJSON('torrenta_auth_session', activeSession);
    } else {
      logout();
    }
  }

  function getSecurityData(): SecurityConfig {
    return {
      authEnabled: authEnabled.value,
      authUsername: effectiveUsername.value,
      authPassword: effectivePassword.value,
    };
  }

  function hydrateSecurityData(data?: Partial<SecurityConfig>) {
    if (!data) return;
    if (typeof data.authEnabled === 'boolean') {
      authEnabled.value = data.authEnabled;
      safeStorage.setItem('torrenta_auth_enabled', String(data.authEnabled));
    }
    if (typeof data.authUsername === 'string' && data.authUsername) {
      safeStorage.setItem('torrenta_auth_username', data.authUsername);
    }
    if (typeof data.authPassword === 'string') {
      safeStorage.setItem('torrenta_auth_password', data.authPassword);
    }
  }

  return {
    authEnabled,
    authUsername: effectiveUsername,
    authPassword: effectivePassword,
    session,
    now,
    isExpired,
    isAuthenticated,
    isLocked,
    lockReason,
    remainingTimeMs,
    login,
    logout,
    touchSession,
    updateAuthConfig,
    checkSessionExpiry,
    getSecurityData,
    hydrateSecurityData,
    stopTicker,
  };
});
