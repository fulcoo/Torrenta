export interface TorrentFile {
  name: string;
  length: number;
  path: string[];
}

export interface ParsedTorrent {
  name: string;
  files: TorrentFile[];
  totalSize: number;
  infoHash?: string;
  trackers?: string[];
}

export interface FileTreeNode {
  name: string;
  path: string;
  size?: number;
  children?: FileTreeNode[];
  isFolder: boolean;
}

/**
 * Decodes a bencoded Uint8Array into a JavaScript object.
 * Safe for large torrent files by skipping UTF-8 decoding of the binary 'pieces' field.
 */
export function decodeBencode(buffer: Uint8Array): any {
  let offset = 0;
  const decoder = new TextDecoder('utf-8');

  function readUntil(char: number): Uint8Array {
    const start = offset;
    while (offset < buffer.length && buffer[offset] !== char) {
      offset++;
    }
    if (offset >= buffer.length) {
      throw new Error('Unexpected EOF');
    }
    const result = buffer.subarray(start, offset);
    offset++; // skip the separator char
    return result;
  }

  function parseStringBytes(): Uint8Array {
    const lenBytes = readUntil(0x3a); // ':'
    const lenStr = decoder.decode(lenBytes);
    const len = parseInt(lenStr, 10);
    if (isNaN(len) || len < 0) {
      throw new Error(`Invalid string length: ${lenStr}`);
    }
    if (offset + len > buffer.length) {
      throw new Error('Unexpected EOF in string');
    }
    const strBytes = buffer.subarray(offset, offset + len);
    offset += len;
    return strBytes;
  }

  function parseVal(): any {
    if (offset >= buffer.length) {
      throw new Error('Unexpected EOF');
    }
    const char = buffer[offset];

    if (char === 0x69) { // 'i' -> integer
      offset++; // skip 'i'
      const numBytes = readUntil(0x65); // 'e'
      const numStr = decoder.decode(numBytes);
      return parseInt(numStr, 10);
    } else if (char === 0x6c) { // 'l' -> list
      offset++; // skip 'l'
      const list: any[] = [];
      while (offset < buffer.length && buffer[offset] !== 0x65) { // until 'e'
        list.push(parseVal());
      }
      if (offset >= buffer.length) {
        throw new Error('Unterminated list');
      }
      offset++; // skip 'e'
      return list;
    } else if (char === 0x64) { // 'd' -> dictionary
      offset++; // skip 'd'
      const dict: Record<string, any> = {};
      while (offset < buffer.length && buffer[offset] !== 0x65) { // until 'e'
        const keyBytes = parseStringBytes();
        const key = decoder.decode(keyBytes);
        
        const valStart = offset;
        let val: any;
        if (key === 'pieces') {
          // Speed optimization: do not decode pieces block as UTF-8 string
          val = parseStringBytes();
        } else {
          val = parseVal();
        }
        const valEnd = offset;
        
        if (key === 'info') {
          dict._infoBytes = buffer.subarray(valStart, valEnd);
        }
        dict[key] = val;
      }
      if (offset >= buffer.length) {
        throw new Error('Unterminated dictionary');
      }
      offset++; // skip 'e'
      return dict;
    } else if (char >= 0x30 && char <= 0x39) { // '0'-'9' -> string
      const bytes = parseStringBytes();
      return decoder.decode(bytes);
    } else {
      throw new Error(`Invalid character: ${String.fromCharCode(char)} at offset ${offset}`);
    }
  }

  return parseVal();
}

async function computeSha1(bytes: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-1', bytes as any);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function parseMagnetLink(url: string): { name: string; infoHash: string; trackers: string[] } | null {
  if (!url.startsWith('magnet:')) return null;
  const parts = url.split('?')[1] || '';
  const params = new URLSearchParams(parts);
  const xt = params.get('xt') || '';
  let infoHash = '';
  if (xt.startsWith('urn:btih:')) {
    infoHash = xt.substring(9).toLowerCase();
  }
  const dn = params.get('dn') || '';
  const name = dn ? decodeURIComponent(dn) : 'Magnet Link';
  const trackers = params.getAll('tr').map(tr => decodeURIComponent(tr));
  return { name, infoHash, trackers };
}

/**
 * Parses a .torrent ArrayBuffer and extracts the torrent structure.
 */
export async function parseTorrentFile(arrayBuffer: ArrayBuffer): Promise<ParsedTorrent> {
  const bytes = new Uint8Array(arrayBuffer);
  const decoded = decodeBencode(bytes);

  if (!decoded || typeof decoded !== 'object') {
    throw new Error('Invalid torrent file format');
  }

  const info = decoded.info;
  if (!info || typeof info !== 'object') {
    throw new Error('Missing info dictionary in torrent');
  }

  const name = typeof info.name === 'string' ? info.name : 'Unknown Torrent';
  const files: TorrentFile[] = [];
  let totalSize = 0;

  if (Array.isArray(info.files)) {
    // Multi-file torrent
    for (const f of info.files) {
      if (f && typeof f === 'object') {
        const length = typeof f.length === 'number' ? f.length : 0;
        let path: string[] = [];
        if (Array.isArray(f.path)) {
          path = f.path.map((p: any) => typeof p === 'string' ? p : String(p));
        } else if (typeof f.path === 'string') {
          path = [f.path];
        }
        const fullPath = [name, ...path];
        const fileName = path[path.length - 1] || 'unknown';
        files.push({
          name: fileName,
          length,
          path: fullPath,
        });
        totalSize += length;
      }
    }
  } else if (typeof info.length === 'number') {
    // Single-file torrent
    files.push({
      name,
      length: info.length,
      path: [name],
    });
    totalSize = info.length;
  }

  // Extract trackers
  const trackers: string[] = [];
  if (typeof decoded.announce === 'string' && decoded.announce.trim()) {
    trackers.push(decoded.announce.trim());
  }
  if (Array.isArray(decoded['announce-list'])) {
    for (const tier of decoded['announce-list']) {
      if (Array.isArray(tier)) {
        for (const url of tier) {
          if (typeof url === 'string' && url.trim() && !trackers.includes(url.trim())) {
            trackers.push(url.trim());
          }
        }
      }
    }
  }

  // Compute info hash
  let infoHash = '';
  if (decoded._infoBytes) {
    try {
      infoHash = await computeSha1(decoded._infoBytes);
    } catch (e) {
      console.error('Failed to compute info hash:', e);
    }
  }

  return {
    name,
    files,
    totalSize,
    infoHash,
    trackers,
  };
}

/**
 * Transforms flat files list into a hierarchical file tree structure.
 */
export function buildFileTree(files: TorrentFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const file of files) {
    let currentLevel = root;
    const parts = file.path;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join('/');

      let existing = currentLevel.find((node) => node.name === part);

      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          isFolder: !isLast,
        };
        if (!isLast) {
          existing.children = [];
        } else {
          existing.size = file.length;
        }
        currentLevel.push(existing);
      }

      if (!isLast && existing.children) {
        currentLevel = existing.children;
      }
    }
  }

  // Sort folders first, then files alphabetically
  function sortTree(nodes: FileTreeNode[]) {
    nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) {
        sortTree(node.children);
      }
    }
  }

  sortTree(root);
  return root;
}
