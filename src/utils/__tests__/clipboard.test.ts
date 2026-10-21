import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateMagnetUri, copyToClipboard } from '../clipboard';

describe('clipboard utils', () => {
  describe('generateMagnetUri', () => {
    it('should return existing valid magnet_uri if already present', () => {
      const uri = 'magnet:?xt=urn:btih:custom123&dn=Sample';
      const result = generateMagnetUri({
        id: 'fallback123',
        magnet_uri: uri,
      });
      expect(result).toBe(uri);
    });

    it('should construct magnet link from id and name', () => {
      const result = generateMagnetUri({
        id: 'abc456def',
        name: 'Ubuntu Linux 24.04',
      });
      expect(result).toBe('magnet:?xt=urn:btih:abc456def&dn=Ubuntu%20Linux%2024.04');
    });

    it('should append tracker if available', () => {
      const result = generateMagnetUri({
        id: 'abc456def',
        name: 'Test File',
        tracker: 'udp://tracker.openbittorrent.com:80',
      });
      expect(result).toBe('magnet:?xt=urn:btih:abc456def&dn=Test%20File&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80');
    });

    it('should handle missing name and tracker gracefully', () => {
      const result = generateMagnetUri({
        id: 'abc456def',
      });
      expect(result).toBe('magnet:?xt=urn:btih:abc456def');
    });
  });

  describe('copyToClipboard', () => {
    const originalNavigator = globalThis.navigator;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        writable: true,
      });
    });

    it('should return false for empty text', async () => {
      const result = await copyToClipboard('');
      expect(result).toBe(false);
    });

    it('should use navigator.clipboard.writeText in secure context', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(globalThis, 'navigator', {
        value: { clipboard: { writeText: writeTextMock } },
        writable: true,
      });
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
      });

      const ok = await copyToClipboard('magnet:?xt=urn:btih:xyz');
      expect(ok).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('magnet:?xt=urn:btih:xyz');
    });

    it('should fallback to document.execCommand when navigator.clipboard fails', async () => {
      const writeTextMock = vi.fn().mockRejectedValue(new Error('Permission denied'));
      Object.defineProperty(globalThis, 'navigator', {
        value: { clipboard: { writeText: writeTextMock } },
        writable: true,
      });
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
      });

      const execCommandSpy = vi.fn().mockReturnValue(true);
      document.execCommand = execCommandSpy;

      const ok = await copyToClipboard('magnet:?xt=urn:btih:fallback');
      expect(ok).toBe(true);
      expect(execCommandSpy).toHaveBeenCalledWith('copy');
    });
  });
});
