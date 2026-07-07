import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveBaseUrl, api } from '../api';
import { safeStorage } from '@/utils/storage';

describe('api service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('resolveBaseUrl', () => {
    it('should return default /api/v2 if undefined or empty', () => {
      expect(resolveBaseUrl()).toBe('/api/v2');
      expect(resolveBaseUrl('')).toBe('/api/v2');
      expect(resolveBaseUrl('   ')).toBe('/api/v2');
    });

    it('should prepend http:// if not starting with protocol or slash', () => {
      expect(resolveBaseUrl('127.0.0.1:8080')).toBe('http://127.0.0.1:8080/api/v2');
      expect(resolveBaseUrl('localhost')).toBe('http://localhost/api/v2');
    });

    it('should return relative path if starting with a slash', () => {
      expect(resolveBaseUrl('/my-custom-proxy')).toBe('/my-custom-proxy');
    });

    it('should handle full HTTP/HTTPS urls and append /api/v2 if missing', () => {
      expect(resolveBaseUrl('http://192.168.1.50:8080')).toBe('http://192.168.1.50:8080/api/v2');
      expect(resolveBaseUrl('https://qb.myhost.com/')).toBe('https://qb.myhost.com/api/v2');
    });

    it('should not duplicate /api/v2 if already present', () => {
      expect(resolveBaseUrl('http://localhost:8080/api/v2')).toBe('http://localhost:8080/api/v2');
      expect(resolveBaseUrl('https://myhost.com/api/v2/')).toBe('https://myhost.com/api/v2');
    });
  });

  describe('axios request interceptor', () => {
    it('should rewrite baseURL when custom app config exists', async () => {
      // Mock safeStorage config
      safeStorage.setJSON('torrenta_app_config', { url: 'https://seedbox.com:9000' });

      // Trigger the request interceptor manually or mock the config passed to it
      // Let's find the request interceptor handler
      // api.interceptors.request has a handlers list
      // In Axios, each handler is an object with { fulfilled: Function, rejected: Function }
      const requestHandlers = (api.interceptors.request as any).handlers;
      expect(requestHandlers.length).toBeGreaterThan(0);
      
      const interceptor = requestHandlers[0].fulfilled;
      const dummyConfig = { baseURL: '' } as any;
      const updatedConfig = interceptor(dummyConfig);

      expect(updatedConfig.baseURL).toBe('https://seedbox.com:9000/api/v2');
    });

    it('should fallback to default baseURL when no custom config exists', () => {
      const requestHandlers = (api.interceptors.request as any).handlers;
      const interceptor = requestHandlers[0].fulfilled;
      const dummyConfig = { baseURL: '' } as any;
      const updatedConfig = interceptor(dummyConfig);

      expect(updatedConfig.baseURL).toBe('/api/v2');
    });
  });
});
