import axios from 'axios';

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
  const storeData = localStorage.getItem('torrenta_app_config');
  let finalBaseUrl = '/api/v2';

  if (storeData) {
    try {
      const parsed = JSON.parse(storeData);
      if (parsed && parsed.url) {
        finalBaseUrl = resolveBaseUrl(parsed.url);
      }
    } catch (e) {
      console.error('Failed to parse config for API base URL resolver:', e);
    }
  }

  config.baseURL = finalBaseUrl;
  return config;
}, (error) => {
  return Promise.reject(error);
});
