import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { safeStorage } from '@/utils/storage';
import { appApiPath, usesDirectLogin, usesFnOSGateway } from '@/services/api';
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
  skipGatewayPassword?: boolean;
}

export const useAuthStore = defineStore('authStore', () => {
  const appStore = useAppStore();
  const torrentStore = useTorrentStore();
  const directLogin = usesDirectLogin();
  const fnosGateway = usesFnOSGateway();
  const supportsGatewayLoginPreference = fnosGateway || directLogin;
  const directSessionReady = ref(!directLogin);

  const authEnabled = ref(safeStorage.getItem('torrenta_auth_enabled') === 'true');
  const skipGatewayPassword = ref(safeStorage.getItem('torrenta_skip_gateway_password') === 'true');
  const gatewayPasswordBypassed = computed(() => fnosGateway && authEnabled.value && skipGatewayPassword.value);
  const requiresAppLogin = computed(() => directLogin || (authEnabled.value && !gatewayPasswordBypassed.value));
  
  // The authentication credentials directly match qBittorrent
  const effectiveUsername = computed(() => {
    return appStore.username || safeStorage.getItem('torrenta_username') || safeStorage.getItem('torrenta_auth_username', 'admin') || 'admin';
  });

  const effectivePassword = computed(() => {
    return appStore.password || safeStorage.getItem('torrenta_password') || safeStorage.getItem('torrenta_auth_password', '');
  });

  const session = ref<AuthSession | null>(
    directLogin ? null : safeStorage.getJSON<AuthSession | null>('torrenta_auth_session', null)
  );
  let directLogout: Promise<void> | undefined;

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
    if (directLogin) return !!session.value && !isExpired.value;
    if (!requiresAppLogin.value) return true;
    if (!session.value) return false;
    if (session.value.username !== effectiveUsername.value) return false;
    return !isExpired.value;
  });

  const needsDirectLogin = computed(() => directLogin && !isAuthenticated.value);

  // Determines why the login/connect modal is currently active
  const lockReason = computed<'none' | 'auth_required' | 'connection_failed' | 'not_configured'>(() => {
    if (needsDirectLogin.value) return 'auth_required';

    if (appStore.simulationMode) {
      return requiresAppLogin.value && !isAuthenticated.value ? 'auth_required' : 'none';
    }

    // 1. If downloader is not connected after boot attempt
    if (torrentStore.hasAttemptedBoot && !torrentStore.isConnected) {
      if (!appStore.url && !appStore.username && !appStore.password) {
        return 'not_configured';
      }
      return 'connection_failed';
    }

    // 2. If login protection is enabled and user is not authenticated or expired
    if (requiresAppLogin.value && !isAuthenticated.value) {
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
    if (directLogin) return;
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

  function setDirectSession(data: { username: string; expiresAt: number }) {
    now.value = Date.now();
    session.value = { username: data.username, loginTime: data.expiresAt - SESSION_DURATION_MS };
  }

  async function restoreDirectSession() {
    if (!directLogin) return true;
    try {
      const response = await fetch(appApiPath('torrenta-session'));
      if (!response.ok) return false;
      const data = await response.json();
      await appStore.loadServerSettings();
      setDirectSession(data);
      return isAuthenticated.value;
    } catch {
      return false;
    } finally {
      directSessionReady.value = true;
    }
  }

  async function loginDirect(username: string, password: string) {
    try {
      await directLogout;
      const response = await fetch(appApiPath('torrenta-session'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'invalidCredentials' };
      }
      if (data.qbCredentials) {
        appStore.saveConfig('', username, password, 'qbittorrent');
      }
      await appStore.loadServerSettings();
      setDirectSession(data);
      void torrentStore.bootClient().catch(() => {});
      return { success: true };
    } catch {
      return { success: false, error: 'directBackendUnavailable' };
    }
  }

  async function login(user: string, pass: string, url?: string): Promise<{ success: boolean; error?: string }> {
    const cleanUser = (user || '').trim();
    const cleanPass = pass || '';
    const cleanUrl = url !== undefined ? url.trim() : appStore.url;
    if (needsDirectLogin.value) return loginDirect(cleanUser, cleanPass);

    // Try real downloader connection attempt
    try {
      const success = await torrentStore.connectWithCredentials(cleanUrl, cleanUser, cleanPass);
      if (success) {
        if (directLogin) return { success: true };
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
    if (directLogin) {
      clearDirectSession();
      if (!directLogout) {
        directLogout = fetch(appApiPath('torrenta-session'), { method: 'DELETE' })
          .then(() => {}, () => {})
          .finally(() => { directLogout = undefined; });
      }
      return;
    }
    session.value = null;
    safeStorage.removeItem('torrenta_auth_session');
  }

  function clearDirectSession() {
    session.value = null;
    torrentStore.stopSyncLoop();
    torrentStore.isConnected = false;
  }

  function updateAuthConfig(params: {
    enabled: boolean;
    username: string;
    password?: string;
    skipGatewayPassword?: boolean;
  }) {
    authEnabled.value = params.enabled;
    safeStorage.setItem('torrenta_auth_enabled', String(params.enabled));
    if (supportsGatewayLoginPreference && params.skipGatewayPassword !== undefined) {
      skipGatewayPassword.value = params.skipGatewayPassword;
      safeStorage.setItem('torrenta_skip_gateway_password', String(skipGatewayPassword.value));
    }

    const cleanUser = params.username.trim() || 'admin';
    safeStorage.setItem('torrenta_auth_username', cleanUser);

    if (params.password !== undefined && params.password !== '') {
      safeStorage.setItem('torrenta_auth_password', params.password);
      // Sync with qBittorrent config in appStore
      appStore.saveConfig(appStore.url, cleanUser, params.password, appStore.driverType);
    } else {
      appStore.saveConfig(appStore.url, cleanUser, appStore.password, appStore.driverType);
    }

    if (directLogin) return;
    if (requiresAppLogin.value) {
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

  async function saveGatewayLoginPreference(authEnabled: boolean, skipGatewayPassword: boolean) {
    const response = await fetch(appApiPath('gateway-login-preference'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authEnabled, skipGatewayPassword }),
    });
    if (!response.ok) throw new Error('Failed to save gateway login settings');
  }

  function getSecurityData(): SecurityConfig {
    return {
      authEnabled: authEnabled.value,
      authUsername: effectiveUsername.value,
      authPassword: effectivePassword.value,
      ...(supportsGatewayLoginPreference ? { skipGatewayPassword: skipGatewayPassword.value } : {}),
    };
  }

  function hydrateSecurityData(data?: Partial<SecurityConfig>) {
    if (!data) return;
    if (typeof data.authEnabled === 'boolean') {
      authEnabled.value = data.authEnabled;
      safeStorage.setItem('torrenta_auth_enabled', String(data.authEnabled));
    }
    if (supportsGatewayLoginPreference && typeof data.skipGatewayPassword === 'boolean') {
      skipGatewayPassword.value = data.skipGatewayPassword;
      safeStorage.setItem('torrenta_skip_gateway_password', String(skipGatewayPassword.value));
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
    fnosGateway,
    supportsGatewayLoginPreference,
    saveGatewayLoginPreference,
    skipGatewayPassword,
    gatewayPasswordBypassed,
    requiresAppLogin,
    directLogin,
    directSessionReady,
    needsDirectLogin,
    restoreDirectSession,
    clearDirectSession,
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
