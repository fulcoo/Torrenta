import type { UnifiedTorrent, GlobalState, TorrentProperties } from '@/models/torrent';

export interface AddTorrentOptions {
  urls?: string;
  files?: File[];
  savepath?: string;
  category?: string;
  paused?: boolean;
  skip_checking?: boolean;
  autoTMM?: boolean;
  sequentialDownload?: boolean;
  firstLastAsStream?: boolean;
  addToTopOfQueue?: boolean;
  tags?: string;
  rename?: string;
  upLimit?: number;
  dlLimit?: number;
  ratioLimit?: number;
  seedingTimeLimit?: number;
  inactiveSeedingTimeLimit?: number;
  stopCondition?: 'None' | 'MetadataReceived' | 'FilesChecked';
  contentLayout?: 'Original' | 'Subfolder' | 'NoSubfolder';
  forced?: boolean;
  downloadPath?: string;
  useDownloadPath?: boolean;
}

export interface DownloaderAdapter {
  connect(url: string, username?: string, password?: string): Promise<boolean>;
  getTorrents(): Promise<UnifiedTorrent[]>;
  getGlobalState(): Promise<GlobalState>;
  pauseTorrents(ids: string[]): Promise<boolean>;
  resumeTorrents(ids: string[]): Promise<boolean>;
  deleteTorrents(ids: string[], deleteData: boolean): Promise<boolean>;
  addTorrents(options: AddTorrentOptions): Promise<boolean>;
  changeCredentials(username: string, password?: string): Promise<boolean>;
  getTorrentProperties(id: string): Promise<TorrentProperties | null>;
  forceStartTorrents(ids: string[]): Promise<boolean>;
  setTorrentsLocation(ids: string[], location: string): Promise<boolean>;
  renameTorrent(id: string, name: string): Promise<boolean>;
  addTorrentTags(ids: string[], tags: string[]): Promise<boolean>;
  removeTorrentTags(ids: string[], tags: string[]): Promise<boolean>;
  setTorrentTags(ids: string[], tags: string[]): Promise<boolean>;
  getTags(): Promise<string[]>;
  createTags(tags: string[]): Promise<boolean>;
  deleteTags(tags: string[]): Promise<boolean>;
  getTorrentTrackers(id: string): Promise<{ url: string; tier: number }[]>;
  removeTorrentTrackers(id: string, urls: string[]): Promise<boolean>;
  addTorrentTrackers(id: string, urls: string): Promise<boolean>;
  editTorrentTrackerTier(id: string, url: string, tier: number): Promise<boolean>;
  getPreferences(): Promise<Record<string, any>>;
  setPreferences(preferences: Record<string, any>): Promise<boolean>;
  getCategories(): Promise<Record<string, any>>;
  createCategory(name: string, savePath?: string): Promise<boolean>;
  removeCategories(names: string[]): Promise<boolean>;
}

