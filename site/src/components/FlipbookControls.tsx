import * as React from 'react';
import styles from './FlipbookControls.module.scss';

export interface IFlipbookControlsProps {
  currentPage: number;
  totalPages: number;
  currentSpread: number;
  totalSpreads: number;
  isSingle: boolean;
  zoom: number;
  fitWidth: boolean;
  isFullscreen: boolean;
  pdfUrl: string;
  showDownloadButton: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitWidth: () => void;
  onFullscreen: () => void;
  onPageJump: (page: number) => void;
}

const IconFullscreen: React.FC = () => (
  <svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg>
);

const IconExitFullscreen: React.FC = () => (
  <svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" /></svg>
);

const IconZoomIn: React.FC = () => (
  <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z" /></svg>
);

const IconZoomOut: React.FC = () => (
  <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z" /></svg>
);

const IconFitWidth: React.FC = () => (
  <svg viewBox="0 0 24 24"><path d="M4 15h2V9H4v6zm4 2h8V7H8v10zm10-2h2V9h-2v6z" /></svg>
);

const IconDownload: React.FC = () => (
  <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>
);

const FlipbookControls: React.FC<IFlipbookControlsProps> = (props) => {
  const {
    currentPage, totalPages, currentSpread, totalSpreads, isSingle,
    fitWidth, isFullscreen, pdfUrl, showDownloadButton,
    onZoomIn, onZoomOut, onFitWidth, onFullscreen, onPageJump
  } = props;

  let pageLabel: string;
  if (isSingle) {
    pageLabel = `Page ${currentPage + 1} / ${totalPages}`;
  } else if (currentPage === 0) {
    pageLabel = `Page 1 / ${totalPages}`;
  } else {
    const left = currentPage + 1;
    const right = Math.min(currentPage + 2, totalPages);
    pageLabel = left === right
      ? `Page ${left} / ${totalPages}`
      : `Pages ${left}\u2013${right} / ${totalPages}`;
  }

  const onSliderChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isSingle) {
      onPageJump(val);
    } else {
      onPageJump(val * 2);
    }
  }, [isSingle, onPageJump]);

  return (
    <>
      <div className={styles.topBar}>
        <button className={styles.toolBtn} onClick={onFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          {isFullscreen ? <IconExitFullscreen /> : <IconFullscreen />}
        </button>
        <button className={styles.toolBtn} onClick={onZoomIn} title="Zoom in">
          <IconZoomIn />
        </button>
        <button className={styles.toolBtn} onClick={onZoomOut} title="Zoom out">
          <IconZoomOut />
        </button>
        <button
          className={`${styles.toolBtn} ${fitWidth ? styles.toolBtnActive : ''}`}
          onClick={onFitWidth}
          title="Fit to width"
        >
          <IconFitWidth />
        </button>
        {showDownloadButton && pdfUrl && (
          <a
            className={styles.pdfLink}
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open PDF"
          >
            <IconDownload />
          </a>
        )}
      </div>

      <div className={styles.bottomBar}>
        <span className={styles.pageLabel}>{pageLabel}</span>
        <input
          className={styles.slider}
          type="range"
          min={0}
          max={totalSpreads - 1}
          value={currentSpread}
          onChange={onSliderChange}
          aria-label="Page slider"
        />
      </div>
    </>
  );
};

export default FlipbookControls;
