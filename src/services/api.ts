import axios from 'axios';
import { safeStorage } from '@/utils/storage';

export const DIRECT_SESSION_EXPIRED = 'torrenta-direct-session-expired';

export function usesDirectLogin(): boolean {
  return import.meta.env.MODE === 'fpk-direct';
}

export function usesFnOSGateway(): boolean {
  return import.meta.env.MODE === 'fpk-gateway';
}

export function appApiPath(endpoint: string): string {
  return `${import.meta.env.BASE_URL}api/${endpoint}`;
}

// Create a generic axios instance
export const api = axios.create({
  timeout: 10000,
  withCredentials: true, // Necessary for qBittorrent cookie session authentication (SID)
});

/**
 * Resolves the base URL for the API.
 * Without a custom URL, use the API on the same origin and base path as the UI.
 * If an absolute URL is configured (e.g. http://192.168.1.100:8080), it cleans it and appends `/api/v2`.
 */
export function resolveBaseUrl(configuredUrl?: string): string {
  let trimmed = configuredUrl?.trim() || '';
  if (!trimmed || (import.meta.env.BASE_URL !== '/' && /^\/api\/v2\/?$/.test(trimmed))) {
    return appApiPath('v2');
  }
  
  // If the user entered a raw domain/IP (e.g. 127.0.0.1:8081 or localhost:8080)
  // and did not specify http://, https:// or a relative path starting with /
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
    trimmed = `http://${trimmed}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const cleanUrl = trimmed.replace(/\/+$/, '');
    if (cleanUrl.endsWith('/api/v2')) {
      return cleanUrl;
    }
    return `${cleanUrl}/api/v2`;
  }
  
  return trimmed;
}

function getConfiguredApiBase(): string {
  const storedConfig = safeStorage.getJSON<{ url?: string } | null>('torrenta_app_config', null);
  const url = typeof storedConfig?.url === 'string' ? storedConfig.url : undefined;
  const configuredUrl = url?.toLowerCase() || '';
  // Route local qBittorrent through the Vite dev proxy.
  if (import.meta.env.DEV && ['localhost:8080', '127.0.0.1:8080', '[::1]:8080'].some(
    host => configuredUrl.includes(host)
  )) {
    return appApiPath('v2');
  }
  return resolveBaseUrl(url);
}

api.interceptors.request.use((config) => {
  config.baseURL = getConfiguredApiBase();
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Mutex lock for silent re-authentication to prevent multiple concurrent login requests
let isReauthenticating = false;
let reauthPromise: Promise<boolean> | null = null;

export async function silentReauth(): Promise<boolean> {
  if (isReauthenticating && reauthPromise) {
    return reauthPromise;
  }
  isReauthenticating = true;
  reauthPromise = (async () => {
    try {
      let finalUser = safeStorage.getItem('torrenta_username') || safeStorage.getItem('torrenta_auth_username') || '';
      let finalPass = safeStorage.getItem('torrenta_password') || safeStorage.getItem('torrenta_auth_password') || '';

      // Check if backend autologin endpoint can provide credentials if none stored locally
      if (!finalUser && !finalPass && typeof window !== 'undefined' && typeof window.fetch === 'function') {
        try {
          const autoRes = await window.fetch(appApiPath('torrenta-autologin'));
          if (autoRes.ok) {
            const autoData = await autoRes.json();
            if (autoData?.username || autoData?.password) {
              finalUser = autoData.username || '';
              finalPass = autoData.password || '';
            }
          }
        } catch {
          // Ignore autologin fetch failures
        }
      }

      if (!finalUser && !finalPass) {
        return false;
      }

      const params = new URLSearchParams();
      if (finalUser) params.append('username', finalUser);
      if (finalPass) params.append('password', finalPass);

      // Directly call axios.post with independent config to bypass interceptor recursion
      const loginRes = await axios.post(`${getConfiguredApiBase()}/auth/login`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        withCredentials: true,
        timeout: 10000,
      });

      if (loginRes.data && typeof loginRes.data === 'string' && loginRes.data.trim() === 'Fails.') {
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Silent re-authentication to qBittorrent failed:', err);
      return false;
    } finally {
      isReauthenticating = false;
      reauthPromise = null;
    }
  })();
  return reauthPromise;
}

// Response interceptor to handle session expiration (401/403) and transparently re-login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const url = originalRequest.url || '';

    if (usesDirectLogin() && status === 401 && error.response?.data?.error === 'authRequired') {
      window.dispatchEvent(new Event(DIRECT_SESSION_EXPIRED));
      return Promise.reject(error);
    }

    // If session expired (401 or 403) and not already retrying or logging in
    if ((status === 401 || status === 403) && !originalRequest._retry && !url.includes('/auth/login')) {
      originalRequest._retry = true;
      try {
        const reloginSuccess = await silentReauth();
        if (reloginSuccess) {
          // Re-execute original request with refreshed SID cookie
          return api(originalRequest);
        }
      } catch (reauthErr) {
        return Promise.reject(reauthErr);
      }
    }

    return Promise.reject(error);
  }
);

