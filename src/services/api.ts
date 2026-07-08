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
