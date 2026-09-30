import { describe, it, expect } from 'vitest';
import { matchTorrentStatus } from '../torrentStatus';
import type { UnifiedTorrent } from '@/models/torrent';

function createMockTorrent(overrides: Partial<UnifiedTorrent> = {}): UnifiedTorrent {
  return {
    id: 'mock-hash',
    name: 'Mock Torrent',
    progress: 50,
    size: 1000,
    downloadSpeed: 0,
    uploadSpeed: 0,
    status: 'downloading',
    eta: 0,
    category: '',
    ratio: 0,
    ...overrides,
  };
}

describe('matchTorrentStatus', () => {
  it('should match all filter for every torrent', () => {
    const t = createMockTorrent();
    expect(matchTorrentStatus(t, 'all')).toBe(true);
  });

  it('should match downloading filter', () => {
    const t1 = createMockTorrent({ status: 'downloading', progress: 50, rawState: 'downloading' });
    const t2 = createMockTorrent({ status: 'seeding', progress: 100, rawState: 'uploading' });
    const t3 = createMockTorrent({ status: 'paused', progress: 50, rawState: 'stoppedDL' });

    expect(matchTorrentStatus(t1, 'downloading')).toBe(true);
    expect(matchTorrentStatus(t2, 'downloading')).toBe(false);
    expect(matchTorrentStatus(t3, 'downloading')).toBe(true); // in qB, incomplete stopped torrent is still downloading category
  });

  it('should match seeding filter', () => {
    const t1 = createMockTorrent({ status: 'seeding', progress: 100, rawState: 'uploading' });
    const t2 = createMockTorrent({ status: 'seeding', progress: 100, rawState: 'stalledUP' });
    const t3 = createMockTorrent({ status: 'downloading', progress: 50, rawState: 'downloading' });
    const t4 = createMockTorrent({ status: 'paused', progress: 100, rawState: 'stoppedUP' });

    expect(matchTorrentStatus(t1, 'seeding')).toBe(true);
    expect(matchTorrentStatus(t2, 'seeding')).toBe(true);
    expect(matchTorrentStatus(t3, 'seeding')).toBe(false);
    expect(matchTorrentStatus(t4, 'seeding')).toBe(false);
  });

  it('should match completed filter', () => {
    const t1 = createMockTorrent({ status: 'seeding', progress: 100, rawState: 'uploading' });
    const t2 = createMockTorrent({ status: 'paused', progress: 100, rawState: 'stoppedUP' });
    const t3 = createMockTorrent({ status: 'downloading', progress: 50, rawState: 'downloading' });

    expect(matchTorrentStatus(t1, 'completed')).toBe(true);
    expect(matchTorrentStatus(t2, 'completed')).toBe(true);
    expect(matchTorrentStatus(t3, 'completed')).toBe(false);
  });

  it('should match running and stopped filters', () => {
    const tRunning = createMockTorrent({ status: 'downloading', rawState: 'downloading' });
    const tStopped = createMockTorrent({ status: 'paused', rawState: 'stoppedDL' });

    expect(matchTorrentStatus(tRunning, 'running')).toBe(true);
    expect(matchTorrentStatus(tRunning, 'stopped')).toBe(false);

    expect(matchTorrentStatus(tStopped, 'running')).toBe(false);
    expect(matchTorrentStatus(tStopped, 'stopped')).toBe(true);
    expect(matchTorrentStatus(tStopped, 'paused')).toBe(true);
  });

  it('should match active and inactive filters', () => {
    const tActive = createMockTorrent({ downloadSpeed: 1000, uploadSpeed: 0 });
    const tInactive = createMockTorrent({ downloadSpeed: 0, uploadSpeed: 0 });

    expect(matchTorrentStatus(tActive, 'active')).toBe(true);
    expect(matchTorrentStatus(tActive, 'inactive')).toBe(false);

    expect(matchTorrentStatus(tInactive, 'active')).toBe(false);
    expect(matchTorrentStatus(tInactive, 'inactive')).toBe(true);
  });

  it('should match stalled, stalled_uploading, and stalled_downloading filters', () => {
    const tStalledUP = createMockTorrent({
      status: 'seeding',
      progress: 100,
      uploadSpeed: 0,
      rawState: 'stalledUP',
    });
    const tStalledDL = createMockTorrent({
      status: 'downloading',
      progress: 50,
      downloadSpeed: 0,
      rawState: 'stalledDL',
    });
    const tUploading = createMockTorrent({
      status: 'seeding',
      progress: 100,
      uploadSpeed: 5000,
      rawState: 'uploading',
    });

    expect(matchTorrentStatus(tStalledUP, 'stalled')).toBe(true);
    expect(matchTorrentStatus(tStalledUP, 'stalled_uploading')).toBe(true);
    expect(matchTorrentStatus(tStalledUP, 'stalled_downloading')).toBe(false);

    expect(matchTorrentStatus(tStalledDL, 'stalled')).toBe(true);
    expect(matchTorrentStatus(tStalledDL, 'stalled_downloading')).toBe(true);
    expect(matchTorrentStatus(tStalledDL, 'stalled_uploading')).toBe(false);

    expect(matchTorrentStatus(tUploading, 'stalled')).toBe(false);
    expect(matchTorrentStatus(tUploading, 'stalled_uploading')).toBe(false);
  });

  it('should match checking, moving, and error filters', () => {
    const tChecking = createMockTorrent({ status: 'checking', rawState: 'checkingDL' });
    const tMoving = createMockTorrent({ status: 'moving', rawState: 'moving' });
    const tError = createMockTorrent({ status: 'error', rawState: 'error' });

    expect(matchTorrentStatus(tChecking, 'checking')).toBe(true);
    expect(matchTorrentStatus(tMoving, 'moving')).toBe(true);
    expect(matchTorrentStatus(tError, 'error')).toBe(true);
  });
});
