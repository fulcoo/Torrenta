import { describe, it, expect, beforeEach, vi } from 'vitest';
import { safeStorage } from '../storage';

describe('safeStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getItem', () => {
    it('should return stored value if key exists', () => {
      localStorage.setItem('test_key', 'test_value');
      expect(safeStorage.getItem('test_key')).toBe('test_value');
    });

    it('should return fallback if key does not exist', () => {
      expect(safeStorage.getItem('non_existent', 'default')).toBe('default');
    });

    it('should return empty string if no fallback provided and key does not exist', () => {
      expect(safeStorage.getItem('non_existent')).toBe('');
    });

    it('should catch security/DOM exceptions and return fallback', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new Error('Storage blocked');
        },
        configurable: true,
      });

      try {
        const val = safeStorage.getItem('some_key', 'fallback');
        expect(val).toBe('fallback');
        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        Object.defineProperty(window, 'localStorage', {
          get: () => originalLocalStorage,
          configurable: true,
        });
      }
    });
  });

  describe('setItem', () => {
    it('should write value to localStorage', () => {
      safeStorage.setItem('test_key', 'hello');
      expect(localStorage.getItem('test_key')).toBe('hello');
    });

    it('should catch security exceptions during write and log warn', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new Error('Quota exceeded');
        },
        configurable: true,
      });

      try {
        safeStorage.setItem('test_key', 'hello');
        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        Object.defineProperty(window, 'localStorage', {
          get: () => originalLocalStorage,
          configurable: true,
        });
      }
    });
  });

  describe('removeItem', () => {
    it('should remove value from localStorage', () => {
      localStorage.setItem('test_key', 'value');
      safeStorage.removeItem('test_key');
      expect(localStorage.getItem('test_key')).toBeNull();
    });

    it('should catch exception and warn if localStorage throws', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new Error('Failed to remove');
        },
        configurable: true,
      });

      try {
        safeStorage.removeItem('test_key');
        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        Object.defineProperty(window, 'localStorage', {
          get: () => originalLocalStorage,
          configurable: true,
        });
      }
    });
  });

  describe('getJSON and setJSON', () => {
    it('should set and get JSON values correctly', () => {
      const data = { name: 'torrenta', active: true, count: 5 };
      safeStorage.setJSON('test_json_key', data);

      const parsed = safeStorage.getJSON('test_json_key', {});
      expect(parsed).toEqual(data);
    });

    it('should return fallback if key is missing', () => {
      const fallback = { empty: true };
      const parsed = safeStorage.getJSON('missing_json_key', fallback);
      expect(parsed).toEqual(fallback);
    });

    it('should return fallback and warn if parsing invalid JSON', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem('corrupted_key', '{invalid-json');

      const fallback = { ok: false };
      const parsed = safeStorage.getJSON('corrupted_key', fallback);
      expect(parsed).toEqual(fallback);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log warning if setting json throws error during stringify', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Object with circular reference which cannot be JSON stringified
      const circular: any = {};
      circular.self = circular;

      safeStorage.setJSON('circular_key', circular);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
