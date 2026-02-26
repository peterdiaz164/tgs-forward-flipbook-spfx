import * as React from 'react';
import styles from './TgsForwardFlipbook.module.scss';
import { ITgsForwardFlipbookProps } from './ITgsForwardFlipbookProps';
import { IPageProbeResult } from '../utils/types';
import { normalizeUrl, buildAllPageUrls } from '../utils/urlUtils';
import { discoverPages } from '../utils/pageDiscovery';
import { ImagePreloader } from '../utils/imagePreloader';
import FlipbookViewer from './FlipbookViewer';
import ErrorPanel from './ErrorPanel';
import LoadingSpinner from './LoadingSpinner';

type LoadPhase = 'init' | 'discovering' | 'preloading' | 'ready' | 'error' | 'unconfigured';

const TgsForwardFlipbook: React.FC<ITgsForwardFlipbookProps> = (props) => {
  const {
    pagesFolderUrl, filePrefix, fileExtension, startIndex,
    zeroPad, maxPages, forcePageCount, singlePageOnDesktop,
    pdfUrl, showDownloadButton, webUrl, domElement
  } = props;

  const [phase, setPhase] = React.useState<LoadPhase>('init');
  const [totalPages, setTotalPages] = React.useState(0);
  const [pageUrls, setPageUrls] = React.useState<string[]>([]);
  const [probeResults, setProbeResults] = React.useState<IPageProbeResult[]>([]);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [resolvedBaseUrl, setResolvedBaseUrl] = React.useState('');

  const imageCacheRef = React.useRef(new ImagePreloader());
  const imageCache = imageCacheRef.current;

  /* ── Discovery + preload pipeline ───────────────── */
  React.useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      if (!pagesFolderUrl) {
        setPhase('unconfigured');
        return;
      }

      const baseUrl = normalizeUrl(pagesFolderUrl, webUrl);
      setResolvedBaseUrl(baseUrl);

      /* Step 1 — discover page count */
      setPhase('discovering');
      let count: number;
      let probes: IPageProbeResult[] = [];

      if (forcePageCount > 0) {
        count = forcePageCount;
      } else {
        const result = await discoverPages(
          baseUrl, filePrefix, fileExtension,
          startIndex, zeroPad, maxPages
        );
        count = result.count;
        probes = result.probeResults;
        if (cancelled) return;
        setProbeResults(probes);
      }

      if (count === 0) {
        setErrorMsg(
          'No valid page images were found. Verify the folder URL, file naming, ' +
          'and that the current user has read permissions.'
        );
        setPhase('error');
        return;
      }

      /* Step 2 — build all URLs */
      const urls = buildAllPageUrls(baseUrl, filePrefix, startIndex, count, zeroPad, fileExtension);
      setTotalPages(count);
      setPageUrls(urls);

      /* Step 3 — preload first spread, then background-load rest */
      setPhase('preloading');
      const criticalIndices = [0, 1, 2, 3];
      await imageCache.preloadCriticalThenBackground(urls, criticalIndices);
      if (cancelled) return;

      setPhase('ready');
    };

    run().catch((err) => {
      if (!cancelled) {
        setErrorMsg(String((err as Error).message || err));
        setPhase('error');
      }
    });

    return () => { cancelled = true; };
  }, [pagesFolderUrl, filePrefix, fileExtension, startIndex, zeroPad, maxPages, forcePageCount, webUrl]);

  /* ── Render ─────────────────────────────────────── */
  return (
    <div className={styles.container}>
      {phase === 'unconfigured' && (
        <div className={styles.configPrompt}>
          <div className={styles.configPromptIcon}>📖</div>
          <h2 className={styles.configPromptTitle}>TGS Forward Flipbook</h2>
          <p className={styles.configPromptText}>
            Open the web part property pane and set the <strong>Pages folder URL</strong> to
            the SharePoint folder that contains your page images.
          </p>
        </div>
      )}

      {(phase === 'init' || phase === 'discovering') && (
        <LoadingSpinner label="Detecting pages…" />
      )}

      {phase === 'preloading' && (
        <LoadingSpinner label="Loading images…" />
      )}

      {phase === 'error' && (
        <ErrorPanel
          message={errorMsg}
          baseUrl={resolvedBaseUrl}
          probeResults={probeResults}
        />
      )}

      {phase === 'ready' && (
        <FlipbookViewer
          pages={pageUrls}
          totalPages={totalPages}
          singlePageOnDesktop={singlePageOnDesktop}
          imageCache={imageCache}
          pdfUrl={pdfUrl}
          showDownloadButton={showDownloadButton}
          domElement={domElement}
        />
      )}
    </div>
  );
};

export default TgsForwardFlipbook;
