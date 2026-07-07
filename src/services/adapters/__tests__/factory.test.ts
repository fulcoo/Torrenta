import { describe, it, expect } from 'vitest';
import { DownloaderFactory } from '../factory';
import { QBittorrentAdapter } from '../qbittorrent';

describe('DownloaderFactory', () => {
  it('should instantiate QBittorrentAdapter when type is qbittorrent', () => {
    const adapter = DownloaderFactory.create('qbittorrent');
    expect(adapter).toBeInstanceOf(QBittorrentAdapter);
  });

  it('should throw error for unimplemented downloader types', () => {
    expect(() => DownloaderFactory.create('transmission' as any)).toThrow(
      'Driver type [transmission] not implemented yet.'
    );
    expect(() => DownloaderFactory.create('aria2' as any)).toThrow(
      'Driver type [aria2] not implemented yet.'
    );
  });
});
