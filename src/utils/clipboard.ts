/**
 * Clipboard & Magnet URI utilities
 */

/**
 * Generates a standard BitTorrent magnet link from torrent information.
 */
export function generateMagnetUri(torrent: {
  id: string;
  name?: string;
  tracker?: string;
  magnet_uri?: string;
}): string {
  if (torrent.magnet_uri && torrent.magnet_uri.startsWith('magnet:?')) {
    return torrent.magnet_uri;
  }
  let uri = `magnet:?xt=urn:btih:${torrent.id}`;
  if (torrent.name) {
    uri += `&dn=${encodeURIComponent(torrent.name)}`;
  }
  if (torrent.tracker) {
    uri += `&tr=${encodeURIComponent(torrent.tracker)}`;
  }
  return uri;
}

/**
 * Copies plain text to user clipboard with multi-fallback support
 * (Supports modern navigator.clipboard and legacy execCommand for non-HTTPS / LAN IP environments).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // Modern asynchronous Clipboard API (supported on HTTPS / localhost)
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback for HTTP LAN IP or legacy browsers
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      // Prevent zooming / scrolling on mobile
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('Fallback execCommand copy failed:', err);
      return false;
    }
  }

  return false;
}
