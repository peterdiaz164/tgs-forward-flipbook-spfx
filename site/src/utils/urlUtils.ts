/**
 * Ensures a URL string ends with a trailing slash.
 */
export function ensureTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : url + '/';
}

/**
 * Normalises a pages-folder URL to an absolute URL.
 * Accepts absolute URLs, server-relative URLs, or web-relative URLs.
 */
export function normalizeUrl(url: string, webAbsoluteUrl: string): string {
  if (!url) return '';

  const trimmed = url.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return ensureTrailingSlash(trimmed);
  }

  if (trimmed.startsWith('/')) {
    try {
      const origin = new URL(webAbsoluteUrl).origin;
      return ensureTrailingSlash(origin + trimmed);
    } catch {
      return ensureTrailingSlash(webAbsoluteUrl + trimmed);
    }
  }

  const base = webAbsoluteUrl.endsWith('/') ? webAbsoluteUrl : webAbsoluteUrl + '/';
  return ensureTrailingSlash(base + trimmed);
}

/**
 * Builds the full URL for a single page image.
 *
 * @param baseUrl  Absolute URL ending with `/` to the pages folder
 * @param prefix   Filename prefix, e.g. `page-`
 * @param index    1-based page number
 * @param zeroPad  Number of zero-padded digits
 * @param ext      File extension without dot, e.g. `webp`
 */
export function buildPageUrl(
  baseUrl: string,
  prefix: string,
  index: number,
  zeroPad: number,
  ext: string
): string {
  const paddedIndex = String(index).padStart(zeroPad, '0');
  const base = ensureTrailingSlash(baseUrl);
  return `${base}${prefix}${paddedIndex}.${ext}`;
}

/**
 * Builds an array of all page URLs for a known page count.
 */
export function buildAllPageUrls(
  baseUrl: string,
  prefix: string,
  startIndex: number,
  totalPages: number,
  zeroPad: number,
  ext: string
): string[] {
  const urls: string[] = [];
  for (let i = 0; i < totalPages; i++) {
    urls.push(buildPageUrl(baseUrl, prefix, startIndex + i, zeroPad, ext));
  }
  return urls;
}
