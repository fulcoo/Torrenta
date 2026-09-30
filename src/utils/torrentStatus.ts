import type { UnifiedTorrent } from '@/models/torrent';

export type StatusFilterId =
  | 'all'
  | 'downloading'
  | 'seeding'
  | 'completed'
  | 'running'
  | 'stopped'
  | 'active'
  | 'inactive'
  | 'stalled'
  | 'stalled_uploading'
  | 'stalled_downloading'
  | 'checking'
  | 'moving'
  | 'error'
  | 'queued';

/**
 * Evaluates whether a torrent satisfies the given qBittorrent status filter condition.
 * Replicates the official qBittorrent TransferListFiltersWidget & TorrentFilter logic.
 */
export function matchTorrentStatus(torrent: UnifiedTorrent, filterId: string): boolean {
  switch (filterId) {
    case 'all':
      return true;

    case 'downloading':
      // qBittorrent isDownloading(): task is in the download pipeline (not completed)
      if (torrent.rawState) {
        return (
          [
            'downloading',
            'stalledDL',
            'forcedDL',
            'metaDL',
            'forcedMetaDL',
            'queuedDL',
            'checkingDL',
            'pausedDL',
            'stoppedDL',
            'allocating',
          ].includes(torrent.rawState) ||
          (torrent.progress < 100 && !['error', 'missingFiles'].includes(torrent.rawState))
        );
      }
      return torrent.status === 'downloading' || (torrent.progress < 100 && torrent.status !== 'error' && torrent.status !== 'seeding');

    case 'seeding':
      // qBittorrent isUploading(): task has finished downloading and is actively seeding or queued/checked to seed
      if (torrent.rawState) {
        return ['uploading', 'stalledUP', 'checkingUP', 'queuedUP', 'forcedUP'].includes(torrent.rawState);
      }
      return torrent.status === 'seeding';

    case 'completed':
      // qBittorrent isCompleted(): 100% completed payload, whether currently seeding or stopped
      if (torrent.progress >= 100) return true;
      if (torrent.rawState) {
        return ['uploading', 'stalledUP', 'checkingUP', 'stoppedUP', 'pausedUP', 'queuedUP', 'forcedUP'].includes(torrent.rawState);
      }
      return torrent.status === 'seeding';

    case 'running':
      // qBittorrent isRunning(): task is not stopped / not paused
      if (torrent.rawState) {
        return (
          !['pausedDL', 'pausedUP', 'stoppedDL', 'stoppedUP', 'stopped'].includes(torrent.rawState) &&
          torrent.status !== 'paused'
        );
      }
      return torrent.status !== 'paused';

    case 'stopped':
    case 'paused':
      // qBittorrent isStopped(): task has been paused/stopped by the user or queue
      if (torrent.rawState) {
        return (
          ['pausedDL', 'pausedUP', 'stoppedDL', 'stoppedUP', 'stopped'].includes(torrent.rawState) ||
          torrent.status === 'paused'
        );
      }
      return torrent.status === 'paused';

    case 'active':
      // qBittorrent isActive(): currently transferring payload data
      return (torrent.downloadSpeed || 0) > 0 || (torrent.uploadSpeed || 0) > 0;

    case 'inactive':
      // qBittorrent isInactive(): no payload velocity
      return (torrent.downloadSpeed || 0) === 0 && (torrent.uploadSpeed || 0) === 0;

    case 'stalled':
      // qBittorrent Stalled (stalledUP + stalledDL)
      if (torrent.rawState) {
        return ['stalledUP', 'stalledDL'].includes(torrent.rawState);
      }
      return (
        (torrent.status === 'downloading' && (torrent.downloadSpeed || 0) === 0) ||
        (torrent.status === 'seeding' && (torrent.uploadSpeed || 0) === 0)
      );

    case 'stalled_uploading':
      // qBittorrent Stalled Uploading (stalledUP)
      if (torrent.rawState) {
        return torrent.rawState === 'stalledUP';
      }
      return (torrent.status === 'seeding' || (torrent.progress >= 100 && torrent.status !== 'paused')) && (torrent.uploadSpeed || 0) === 0;

    case 'stalled_downloading':
      // qBittorrent Stalled Downloading (stalledDL)
      if (torrent.rawState) {
        return torrent.rawState === 'stalledDL';
      }
      return torrent.status === 'downloading' && torrent.progress < 100 && (torrent.downloadSpeed || 0) === 0;

    case 'checking':
      // qBittorrent Checking (checkingDL, checkingUP, checkingResumeData)
      if (torrent.rawState) {
        return ['checkingDL', 'checkingUP', 'checkingResumeData'].includes(torrent.rawState) || torrent.status === 'checking';
      }
      return torrent.status === 'checking';

    case 'moving':
      // qBittorrent Moving files
      return torrent.rawState === 'moving' || torrent.status === 'moving';

    case 'error':
      // qBittorrent Errored / MissingFiles
      if (torrent.rawState) {
        return ['error', 'missingFiles'].includes(torrent.rawState) || torrent.status === 'error';
      }
      return torrent.status === 'error';

    case 'queued':
      if (torrent.rawState) {
        return ['queuedDL', 'queuedUP'].includes(torrent.rawState) || torrent.status === 'queued';
      }
      return torrent.status === 'queued';

    default:
      return torrent.status === filterId;
  }
}
