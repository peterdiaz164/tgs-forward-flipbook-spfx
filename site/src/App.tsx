import * as React from 'react';
import styles from './App.module.scss';
import { IPageProbeResult } from './utils/types';
import { buildAllPageUrls } from './utils/urlUtils';
import { discoverPages } from './utils/pageDiscovery';
import { ImagePreloader } from './utils/imagePreloader';
import FlipbookViewer from './components/FlipbookViewer';
import ErrorPanel from './components/ErrorPanel';
import LoadingSpinner from './components/LoadingSpinner';

type LoadPhase = 'init' | 'discovering' | 'preloading' | 'ready' | 'error';

const BASE = import.meta.env.BASE_URL;

const CONFIG = {
  baseUrl: `${BASE}demo-pages/`,
  filePrefix: 'page-',
  fileExtension: 'png',
  startIndex: 1,
  zeroPad: 3,
  maxPages: 50,
  forcePageCount: 0,
  singlePageOnDesktop: false,
  pdfUrl: '',
  showDownloadButton: false,
};

const App: React.FC = () => {
  const [phase, setPhase] = React.useState<LoadPhase>('init');
  const [totalPages, setTotalPages] = React.useState(0);
  const [pageUrls, setPageUrls] = React.useState<string[]>([]);
  const [probeResults, setProbeResults] = React.useState<IPageProbeResult[]>([]);
  const [errorMsg, setErrorMsg] = React.useState('');

  const imageCacheRef = React.useRef(new ImagePreloader());
  const imageCache = imageCacheRef.current;

  React.useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      const {
        baseUrl, filePrefix, fileExtension, startIndex,
        zeroPad, maxPages, forcePageCount,
      } = CONFIG;

      setPhase('discovering');
      let count: number;
      let probes: IPageProbeResult[] = [];

      if (forcePageCount > 0) {
        count = forcePageCount;
      } else {
        const result = await discoverPages(
          baseUrl, filePrefix, fileExtension,
          startIndex, zeroPad, maxPages,
        );
        count = result.count;
        probes = result.probeResults;
        if (cancelled) return;
        setProbeResults(probes);
      }

      if (count === 0) {
        setErrorMsg(
          'No valid page images were found. Check that demo images ' +
          'exist in public/demo-pages/ (e.g. page-001.svg).',
        );
        setPhase('error');
        return;
      }

      const urls = buildAllPageUrls(baseUrl, filePrefix, startIndex, count, zeroPad, fileExtension);
      setTotalPages(count);
      setPageUrls(urls);

      setPhase('preloading');
      await imageCache.preloadCriticalThenBackground(urls, [0, 1, 2, 3]);
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
  }, [imageCache]);

  return (
    <div className={styles.container}>
      {(phase === 'init' || phase === 'discovering') && (
        <LoadingSpinner label="Detecting pages..." />
      )}

      {phase === 'preloading' && (
        <LoadingSpinner label="Loading images..." />
      )}

      {phase === 'error' && (
        <ErrorPanel
          message={errorMsg}
          baseUrl={CONFIG.baseUrl}
          probeResults={probeResults}
        />
      )}

      {phase === 'ready' && (
        <FlipbookViewer
          pages={pageUrls}
          totalPages={totalPages}
          singlePageOnDesktop={CONFIG.singlePageOnDesktop}
          imageCache={imageCache}
          pdfUrl={CONFIG.pdfUrl}
          showDownloadButton={CONFIG.showDownloadButton}
        />
      )}
    </div>
  );
};

export default App;
