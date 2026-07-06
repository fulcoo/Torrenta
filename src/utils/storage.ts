/**
 * Safe wrapper for localStorage access.
 * Handles DOMException (SecurityError) when cookies/localStorage are blocked,
 * and JSON parsing exceptions when stored values are corrupted.
 */

export const safeStorage = {
  getItem(key: string, fallback: string = ''): string {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(key);
        return item !== null ? item : fallback;
      }
    } catch (err) {
      console.warn(`[Storage] Failed to read key "${key}" from localStorage:`, err);
    }
    return fallback;
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (err) {
      console.warn(`[Storage] Failed to write key "${key}" to localStorage:`, err);
    }
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (err) {
      console.warn(`[Storage] Failed to remove key "${key}" from localStorage:`, err);
    }
  },

  getJSON<T>(key: string, fallback: T): T {
    const raw = this.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn(`[Storage] Failed to parse JSON for key "${key}", using fallback:`, err);
      return fallback;
    }
  },

  setJSON<T>(key: string, value: T): void {
    try {
      this.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`[Storage] Failed to stringify JSON for key "${key}":`, err);
    }
  }
};
