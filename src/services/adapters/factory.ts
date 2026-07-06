import type { DownloaderAdapter } from './interface';
import { QBittorrentAdapter } from './qbittorrent';

export class DownloaderFactory {
  static create(type: 'qbittorrent' | 'transmission' | 'aria2'): DownloaderAdapter {
    switch (type) {
      case 'qbittorrent':
        return new QBittorrentAdapter();
      default:
        throw new Error(`Driver type [${type}] not implemented yet.`);
    }
  }
}
