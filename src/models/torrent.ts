export interface UnifiedTorrent {
  id: string;            // The immutable unique torrent hash
  name: string;          // Human-readable file/torrent name
  progress: number;      // Calculated percentage float (0.00 to 100.00)
  size: number;          // Total size of payload in Bytes
  downloadSpeed: number; // Current ingestion velocity in Bytes/sec
  uploadSpeed: number;   // Current swarm broadcasting velocity in Bytes/sec
  status: 'downloading' | 'paused' | 'seeding' | 'checking' | 'error' | 'queued';
  eta: number;           // Estimated time of arrival / completion in seconds
  category: string;      // User-assigned organization category
  ratio: number;         // Share/Seeding ratio
  num_seeds?: number;
  num_seeds_total?: number;
  num_peers?: number;
  num_peers_total?: number;
  uploaded?: number;
  tracker?: string;
  added_on?: number;
  completion_on?: number;
  savepath?: string;
  tags?: string[];
}

export interface GlobalState {
  globalDownloadSpeed: number;
  globalUploadSpeed: number;
  freeSpaceOnDisk: number;
  allTorrentsCount: number;
}

export interface TorrentProperties {
  save_path: string;
  creation_date: number;
  piece_size: number;
  num_pieces: number;
  comment: string;
  total_wasted: number;
  total_uploaded: number;
  total_uploaded_session: number;
  total_downloaded: number;
  total_downloaded_session: number;
  up_limit: number;
  dl_limit: number;
  time_elapsed: number;
  seeding_time: number;
  connection_limit: number;
  share_ratio: number;
  addition_date: number;
  completion_date: number;
  created_by: string;
  average_download_speed: number;
  average_upload_speed: number;
  peers: number;
  peers_total: number;
  seeds: number;
  seeds_total: number;
  last_seen: number;
  is_private: boolean;
}
