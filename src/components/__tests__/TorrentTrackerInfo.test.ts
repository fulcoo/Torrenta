import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, reactive, type App } from 'vue';
import TorrentTrackerInfo from '../TorrentTrackerInfo.vue';
import type { TorrentTracker } from '@/models/torrent';

const { getDetails } = vi.hoisted(() => ({ getDetails: vi.fn() }));
vi.mock('@/stores/torrent', () => ({
  useTorrentStore: () => ({ getTorrentTrackerDetails: getDetails }),
}));
vi.mock('@/i18n/useI18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

let app: App;
let container: HTMLDivElement;
const flush = async () => { await Promise.resolve(); await nextTick(); };

function mount(id = 'hash1') {
  const props = reactive({ torrentId: id });
  app = createApp({ setup: () => () => h(TorrentTrackerInfo, props) });
  container = document.createElement('div');
  document.body.append(container);
  app.mount(container);
  return props;
}

beforeEach(() => {
  vi.useFakeTimers();
  getDetails.mockReset();
});

afterEach(() => {
  app.unmount();
  container.remove();
  vi.useRealTimers();
});

describe('TorrentTrackerInfo', () => {
  it('renders discovery entries, statuses, messages and unknown counts, then stops polling on close', async () => {
    getDetails.mockResolvedValue([
      { url: '** [DHT] **', tier: -1, status: 0, num_peers: 0 },
      { url: 'https://tracker.example/announce', tier: 0, status: 4,
        num_peers: -1, num_seeds: 12, num_leeches: 3, num_downloaded: 42, msg: '<b>Unavailable</b>' },
    ]);
    mount();
    await flush();
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('** [DHT] **');
    expect(rows[0].querySelector('td')?.textContent).toBe('—');
    const cells = rows[1].querySelectorAll('td');
    expect([...cells].map(cell => cell.textContent)).toEqual([
      '0', 'https://tracker.example/announce', 'torrent.trackerNotWorking', '—', '12', '3', '42', '<b>Unavailable</b>',
    ]);
    expect(container.querySelector('b')).toBeNull();
    await vi.advanceTimersByTimeAsync(2000);
    expect(getDetails).toHaveBeenCalledTimes(2);
    app.unmount();
    await vi.advanceTimersByTimeAsync(4000);
    expect(getDetails).toHaveBeenCalledTimes(2);
  });

  it('discards an old torrent response when the selected torrent changes', async () => {
    let resolveOld!: (value: TorrentTracker[]) => void;
    getDetails.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    getDetails.mockResolvedValueOnce([{ url: 'new-tracker', tier: 0, status: 2 }]);
    const props = mount();
    props.torrentId = 'hash2';
    await nextTick();
    await flush();
    resolveOld([{ url: 'old-tracker', tier: 0, status: 1 }]);
    await flush();
    expect(container.textContent).toContain('new-tracker');
    expect(container.textContent).not.toContain('old-tracker');
  });

  it('shows loading errors and recovers on the next poll with an empty state', async () => {
    getDetails.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce([]);
    mount();
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    await flush();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('torrent.trackerLoadError');
    await vi.advanceTimersByTimeAsync(2000);
    await flush();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain('torrent.trackerInfoEmpty');
  });
});
