import { describe, it, expect } from 'vitest';
import { decodeBencode, parseTorrentFile, buildFileTree } from '../torrentParser';

// Helper to convert a string to Uint8Array
function stringToUint8Array(str: string): Uint8Array {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i);
  }
  return arr;
}

describe('torrentParser', () => {
  describe('decodeBencode', () => {
    it('should decode bencoded integers', () => {
      expect(decodeBencode(stringToUint8Array('i42e'))).toBe(42);
      expect(decodeBencode(stringToUint8Array('i-3e'))).toBe(-3);
      expect(decodeBencode(stringToUint8Array('i0e'))).toBe(0);
    });

    it('should decode bencoded strings', () => {
      expect(decodeBencode(stringToUint8Array('4:spam'))).toBe('spam');
      expect(decodeBencode(stringToUint8Array('0:'))).toBe('');
    });

    it('should decode bencoded lists', () => {
      expect(decodeBencode(stringToUint8Array('l4:spam4:eggse'))).toEqual(['spam', 'eggs']);
      expect(decodeBencode(stringToUint8Array('le'))).toEqual([]);
    });

    it('should decode bencoded dictionaries', () => {
      expect(decodeBencode(stringToUint8Array('d3:cow3:moo4:spam4:eggse'))).toEqual({
        cow: 'moo',
        spam: 'eggs',
      });
      expect(decodeBencode(stringToUint8Array('de'))).toEqual({});
    });

    it('should optimize pieces block skip during bencode decoding', () => {
      // pieces has a non-string binary block, which we should read as raw bytes
      const testBencode = 'd6:pieces4:aaaa3:cow3:mooe';
      const decoded = decodeBencode(stringToUint8Array(testBencode));
      expect(decoded.cow).toBe('moo');
      expect(decoded.pieces).toBeInstanceOf(Uint8Array);
      expect(Array.from(decoded.pieces)).toEqual([97, 97, 97, 97]); // 'aaaa'
    });

    it('should throw error on invalid bencode data', () => {
      expect(() => decodeBencode(stringToUint8Array('i42'))).toThrow('Unexpected EOF');
      expect(() => decodeBencode(stringToUint8Array('4spam'))).toThrow('Unexpected EOF');
      expect(() => decodeBencode(stringToUint8Array('x42e'))).toThrow('Invalid character');
    });
  });

  describe('parseTorrentFile', () => {
    it('should parse single-file torrent', () => {
      // d4:infod4:name9:test.epub6:lengthi1024eee
      const bencodeStr = 'd4:infod4:name9:test.epub6:lengthi1024eee';
      const buffer = stringToUint8Array(bencodeStr).buffer as ArrayBuffer;
      const parsed = parseTorrentFile(buffer);

      expect(parsed.name).toBe('test.epub');
      expect(parsed.totalSize).toBe(1024);
      expect(parsed.files).toHaveLength(1);
      expect(parsed.files[0]).toEqual({
        name: 'test.epub',
        length: 1024,
        path: ['test.epub'],
      });
    });

    it('should parse multi-file torrent', () => {
      // d4:infod4:name4:root5:filesld6:lengthi512e4:pathl9:file1.txteed6:lengthi256e4:pathl3:dir9:file2.txteeeee
      const bencodeStr = 'd4:infod4:name4:root5:filesld6:lengthi512e4:pathl9:file1.txteed6:lengthi256e4:pathl3:dir9:file2.txteeeee';
      const buffer = stringToUint8Array(bencodeStr).buffer as ArrayBuffer;
      const parsed = parseTorrentFile(buffer);

      expect(parsed.name).toBe('root');
      expect(parsed.totalSize).toBe(768);
      expect(parsed.files).toHaveLength(2);
      expect(parsed.files[0]).toEqual({
        name: 'file1.txt',
        length: 512,
        path: ['root', 'file1.txt'],
      });
      expect(parsed.files[1]).toEqual({
        name: 'file2.txt',
        length: 256,
        path: ['root', 'dir', 'file2.txt'],
      });
    });

    it('should throw error on missing info dict', () => {
      const bencodeStr = 'd4:name9:test.epube';
      const buffer = stringToUint8Array(bencodeStr).buffer as ArrayBuffer;
      expect(() => parseTorrentFile(buffer)).toThrow('Missing info dictionary in torrent');
    });
  });

  describe('buildFileTree', () => {
    it('should build hierarchical tree sorted with folders first', () => {
      const files = [
        { name: 'file1.txt', length: 100, path: ['root', 'file1.txt'] },
        { name: 'file2.txt', length: 200, path: ['root', 'subfolder', 'file2.txt'] },
        { name: 'a_file.txt', length: 50, path: ['root', 'a_file.txt'] },
      ];

      const tree = buildFileTree(files);

      // Root level should contain "root"
      expect(tree).toHaveLength(1);
      expect(tree[0].name).toBe('root');
      expect(tree[0].isFolder).toBe(true);
      expect(tree[0].children).toHaveLength(3);

      // Children of "root" should be sorted: folders first, then files alphabetically.
      // Expected sorted children: subfolder (folder), a_file.txt (file), file1.txt (file)
      const children = tree[0].children!;
      expect(children[0].name).toBe('subfolder');
      expect(children[0].isFolder).toBe(true);
      expect(children[1].name).toBe('a_file.txt');
      expect(children[1].isFolder).toBe(false);
      expect(children[2].name).toBe('file1.txt');
      expect(children[2].isFolder).toBe(false);

      // subfolder contents
      expect(children[0].children).toHaveLength(1);
      expect(children[0].children![0]).toEqual({
        name: 'file2.txt',
        path: 'root/subfolder/file2.txt',
        isFolder: false,
        size: 200,
      });
    });
  });
});
