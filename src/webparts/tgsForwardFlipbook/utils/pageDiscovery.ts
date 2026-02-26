import { IPageProbeResult } from './types';
import { buildPageUrl } from './urlUtils';

/**
 * Probes the pages folder sequentially to discover how many valid page images
 * exist. Stops at the first non-image response (404, 403, or 200 with
 * text/html body — which SharePoint sometimes returns for missing files).
 *
 * Returns the count of valid pages and the raw probe results for diagnostics.
 */
export async function discoverPages(
  baseUrl: string,
  prefix: string,
  extension: string,
  startIndex: number,
  zeroPad: number,
  maxPages: number
): Promise<{ count: number; probeResults: IPageProbeResult[] }> {
  const probeResults: IPageProbeResult[] = [];
  let count = 0;

  for (let i = startIndex; i < startIndex + maxPages; i++) {
    const url = buildPageUrl(baseUrl, prefix, i, zeroPad, extension);

    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'image/*' },
        redirect: 'follow'
      });

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const isImageContentType = contentType.startsWith('image/');
      const valid = response.ok && isImageContentType;

      probeResults.push({ index: i, url, status: response.status, contentType, valid });

      if (!valid) {
        break;
      }
      count++;
    } catch (err) {
      probeResults.push({
        index: i,
        url,
        status: 0,
        contentType: 'network-error: ' + String((err as Error).message || err),
        valid: false
      });
      break;
    }
  }

  return { count, probeResults };
}
