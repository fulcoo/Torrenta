import axios from 'axios';
import { safeStorage } from '@/utils/storage';

// Create a generic axios instance
export const api = axios.create({
  timeout: 10000,
  withCredentials: true, // Necessary for qBittorrent cookie session authentication (SID)
});

/**
 * Resolves the base URL for the API.
 * If running in Alternative WebUI mode, it returns relative path `/api/v2`.
 * If an absolute URL is configured (e.g. http://192.168.1.100:8080), it cleans it and appends `/api/v2`.
 */
export function resolveBaseUrl(configuredUrl?: string): string {
  if (!configuredUrl) {
    return '/api/v2';
  }
  let trimmed = configuredUrl.trim();
  if (!trimmed) {
    return '/api/v2';
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

// Request interceptor to dynamically rewrite the baseURL based on current storage configs
api.interceptors.request.use((config) => {
  const storeData = safeStorage.getJSON<{ url?: string }>('torrenta_app_config', {});
  let finalBaseUrl = '/api/v2';

  if (storeData && storeData.url) {
    const urlStr = storeData.url.toLowerCase();
    // If in dev mode and the URL points to the local qBittorrent on 8080,
    // route it through the Vite dev proxy (/api/v2) to avoid CORS issues.
    if (
      import.meta.env.DEV &&
      (urlStr.includes('localhost:8080') ||
       urlStr.includes('127.0.0.1:8080') ||
       urlStr.includes('[::1]:8080'))
    ) {
      finalBaseUrl = '/api/v2';
    } else {
      finalBaseUrl = resolveBaseUrl(storeData.url);
    }
  }

  config.baseURL = finalBaseUrl;
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
          const autoRes = await window.fetch('/api/torrenta-autologin');
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

      const storeData = safeStorage.getJSON<{ url?: string }>('torrenta_app_config', {});
      let loginBaseUrl = '/api/v2';
      if (storeData && storeData.url) {
        const urlStr = storeData.url.toLowerCase();
        if (
          import.meta.env.DEV &&
          (urlStr.includes('localhost:8080') ||
           urlStr.includes('127.0.0.1:8080') ||
           urlStr.includes('[::1]:8080'))
        ) {
          loginBaseUrl = '/api/v2';
        } else {
          loginBaseUrl = resolveBaseUrl(storeData.url);
        }
      }

      // Directly call axios.post with independent config to bypass interceptor recursion
      const loginRes = await axios.post(`${loginBaseUrl}/auth/login`, params, {
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

