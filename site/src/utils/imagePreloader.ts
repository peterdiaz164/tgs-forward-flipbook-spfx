/**
 * In-memory image preloader. Triggers browser-level caching via
 * `new Image()` so that subsequent `<img src="…">` renders are instant.
 */
export class ImagePreloader {
  private loaded: Set<string> = new Set();
  private loading: Map<string, Promise<void>> = new Map();
  private _aspectRatio: number = 0;

  /** Width / height of the first successfully loaded image. */
  get aspectRatio(): number {
    return this._aspectRatio;
  }

  isLoaded(url: string): boolean {
    return this.loaded.has(url);
  }

  /** Preload a single image. Resolves when the image is cached. */
  preload(url: string): Promise<void> {
    if (this.loaded.has(url)) return Promise.resolve();
    if (this.loading.has(url)) return this.loading.get(url)!;

    const promise = new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loaded.add(url);
        this.loading.delete(url);
        if (this._aspectRatio === 0 && img.naturalWidth > 0) {
          this._aspectRatio = img.naturalWidth / img.naturalHeight;
        }
        resolve();
      };
      img.onerror = () => {
        this.loading.delete(url);
        reject(new Error(`Failed to load: ${url}`));
      };
      img.src = url;
    });

    this.loading.set(url, promise);
    return promise;
  }

  /**
   * Preload the critical spread images first (returns a promise), then
   * queue the rest for background loading via requestIdleCallback.
   */
  async preloadCriticalThenBackground(
    allUrls: string[],
    criticalIndices: number[]
  ): Promise<void> {
    const criticalUrls = criticalIndices
      .filter(i => i >= 0 && i < allUrls.length)
      .map(i => allUrls[i]);

    await Promise.all(criticalUrls.map(u => this.preload(u).catch(() => { /* swallow */ })));

    const remaining = allUrls.filter(u => !this.loaded.has(u) && !this.loading.has(u));
    this._backgroundLoad(remaining);
  }

  /** Preload an array of URLs in the background using idle callbacks. */
  preloadRange(urls: string[]): void {
    const pending = urls.filter(u => !this.loaded.has(u) && !this.loading.has(u));
    this._backgroundLoad(pending);
  }

  private _backgroundLoad(urls: string[]): void {
    let idx = 0;

    const next = (): void => {
      if (idx >= urls.length) return;
      const url = urls[idx++];

      const doLoad = (): void => {
        this.preload(url).then(next, next);
      };

      if (typeof (window as unknown as Record<string, unknown>).requestIdleCallback === 'function') {
        (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(doLoad);
      } else {
        setTimeout(doLoad, 60);
      }
    };

    next();
    next();
  }
}
