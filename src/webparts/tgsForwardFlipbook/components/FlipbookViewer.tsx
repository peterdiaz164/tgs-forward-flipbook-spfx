import * as React from 'react';
import styles from './FlipbookViewer.module.scss';
import { FlipState, FlipDirection } from '../utils/types';
import { ImagePreloader } from '../utils/imagePreloader';
import { useGestures } from '../utils/gestureHandler';
import FlipbookControls from './FlipbookControls';

/* ================================================================
   Props
   ================================================================ */
export interface IFlipbookViewerProps {
  pages: string[];
  totalPages: number;
  singlePageOnDesktop: boolean;
  imageCache: ImagePreloader;
  pdfUrl: string;
  showDownloadButton: boolean;
  domElement: HTMLElement;
}

/* ================================================================
   Helper — compute book dimensions to fit the viewport
   ================================================================ */
interface IBookDims {
  pageWidth: number;
  pageHeight: number;
  bookWidth: number;
  bookHeight: number;
}

const PADDING = 24;
const CONTROLS_RESERVE = 88;
const ZOOM_STEPS = [0.75, 1, 1.25, 1.5, 2];

function calcDims(
  vpW: number,
  vpH: number,
  pageAR: number,
  isSingle: boolean,
  zoom: number
): IBookDims {
  if (pageAR <= 0) pageAR = 0.7727;
  const pagesVis = isSingle ? 1 : 2;
  const bookAR = pagesVis * pageAR;

  const availW = vpW - PADDING * 2;
  const availH = vpH - PADDING * 2 - CONTROLS_RESERVE;

  let bw: number;
  let bh: number;

  if (availW / availH > bookAR) {
    bh = availH;
    bw = bh * bookAR;
  } else {
    bw = availW;
    bh = bw / bookAR;
  }

  bw = Math.max(bw * zoom, 200);
  bh = Math.max(bh * zoom, 200);

  return {
    pageWidth: bw / pagesVis,
    pageHeight: bh,
    bookWidth: bw,
    bookHeight: bh
  };
}

/* ================================================================
   Component
   ================================================================ */
const FlipbookViewer: React.FC<IFlipbookViewerProps> = (props) => {
  const { pages, totalPages, singlePageOnDesktop, imageCache, pdfUrl, showDownloadButton, domElement } = props;

  /* ── Core state ─────────────────────────────────── */
  const [currentPage, setCurrentPage] = React.useState(0);
  const [flipState, setFlipState] = React.useState<FlipState>('idle');
  const [flipDirection, setFlipDirection] = React.useState<FlipDirection>('forward');
  const [flipAngle, setFlipAngle] = React.useState(0);
  const [flipTarget, setFlipTarget] = React.useState<'complete' | 'cancel' | null>(null);

  /* ── Visual state ───────────────────────────────── */
  const [zoom, setZoom] = React.useState(1);
  const [fitWidth, setFitWidth] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [cornerHint, setCornerHint] = React.useState(false);
  const [vpSize, setVpSize] = React.useState({ w: 800, h: 600 });

  /* ── Refs ────────────────────────────────────────── */
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const bookRef = React.useRef<HTMLDivElement>(null);
  const turningLeafRef = React.useRef<HTMLDivElement>(null);
  const transitionDur = React.useRef(0.7);
  const flipAngleRef = React.useRef(0);
  flipAngleRef.current = flipAngle;

  /* ── Derived values ─────────────────────────────── */
  const isMobile = vpSize.w < 768;
  const isSingle = singlePageOnDesktop || isMobile;
  const pageAR = imageCache.aspectRatio || 0.7727;
  const dims = calcDims(vpSize.w, vpSize.h, pageAR, isSingle, zoom);

  const canGoForward = isSingle
    ? currentPage < totalPages - 1
    : currentPage + 2 < totalPages;
  const canGoBackward = isSingle ? currentPage > 0 : currentPage >= 2;
  const totalSpreads = isSingle ? totalPages : Math.ceil(totalPages / 2);
  const currentSpread = isSingle ? currentPage : Math.floor(currentPage / 2);

  /* ── ResizeObserver ─────────────────────────────── */
  React.useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (e) setVpSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Fullscreen listener ────────────────────────── */
  React.useEffect(() => {
    const onChange = (): void => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  /* ── Preload neighbours when page changes ───────── */
  React.useEffect(() => {
    const nearby: number[] = [];
    for (let d = -2; d <= 4; d++) {
      const idx = currentPage + d;
      if (idx >= 0 && idx < totalPages) nearby.push(idx);
    }
    const urls = nearby.map(i => pages[i]).filter(Boolean);
    imageCache.preloadRange(urls);
  }, [currentPage, totalPages]);

  /* ── Drive the animated flip to its target angle ── */
  React.useEffect(() => {
    if (flipState !== 'animating' || flipTarget === null) return;

    const target = flipTarget === 'complete' ? 180 : 0;
    const current = flipAngleRef.current;

    if (Math.abs(current - target) < 0.5) {
      /* Already at the target — complete immediately (no CSS transition fires). */
      if (flipTarget === 'complete') {
        setCurrentPage(prev => {
          const step = isSingle ? 1 : 2;
          return flipDirection === 'forward' ? prev + step : prev - step;
        });
      }
      setFlipState('idle');
      setFlipAngle(0);
      setFlipTarget(null);
      return;
    }

    /* Double-rAF ensures the browser has painted the current state (with
       the CSS transition property active) before we change the angle. */
    let cancelled = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setFlipAngle(target);
      });
    });
    return () => { cancelled = true; };
  }, [flipState, flipTarget, flipDirection, isSingle]);

  /* ── Navigate ───────────────────────────────────── */
  const goForward = React.useCallback(() => {
    if (flipState !== 'idle' || !canGoForward) return;
    transitionDur.current = 0.7;
    setFlipDirection('forward');
    setFlipTarget('complete');
    setFlipAngle(0);
    setFlipState('animating');
  }, [flipState, canGoForward]);

  const goBackward = React.useCallback(() => {
    if (flipState !== 'idle' || !canGoBackward) return;
    transitionDur.current = 0.7;
    setFlipDirection('backward');
    setFlipTarget('complete');
    setFlipAngle(0);
    setFlipState('animating');
  }, [flipState, canGoBackward]);

  const jumpToPage = React.useCallback((page: number) => {
    if (flipState !== 'idle') return;
    const clamped = Math.max(0, Math.min(page, totalPages - 1));
    const aligned = isSingle ? clamped : clamped - (clamped % 2);
    setCurrentPage(aligned);
  }, [flipState, totalPages, isSingle]);

  /* ── TransitionEnd handler ──────────────────────── */
  const onTransitionEnd = React.useCallback((e: React.TransitionEvent) => {
    if (e.propertyName !== 'transform') return;
    if (flipTarget === 'complete') {
      setCurrentPage(prev => {
        const step = isSingle ? 1 : 2;
        return flipDirection === 'forward' ? prev + step : prev - step;
      });
    }
    setFlipState('idle');
    setFlipAngle(0);
    setFlipTarget(null);
  }, [flipTarget, flipDirection, isSingle]);

  /* ── Gesture callbacks ──────────────────────────── */
  const gestureCallbacks = React.useMemo(() => ({
    onDragStart: (dir: 'left' | 'right') => {
      if (flipState !== 'idle') return;
      if (dir === 'left' && canGoForward) {
        setFlipDirection('forward');
        setFlipState('dragging');
        setFlipAngle(0);
      } else if (dir === 'right' && canGoBackward) {
        setFlipDirection('backward');
        setFlipState('dragging');
        setFlipAngle(0);
      }
    },
    onDragMove: (deltaX: number) => {
      const pw = dims.pageWidth || 300;
      const raw = (Math.abs(deltaX) / pw) * 180;
      setFlipAngle(Math.max(0, Math.min(180, raw)));
    },
    onDragEnd: (_deltaX: number, velocity: number) => {
      const angle = flipAngleRef.current;
      const VELOCITY_THRESHOLD = 0.4;
      const shouldComplete = angle > 90 || Math.abs(velocity) > VELOCITY_THRESHOLD;
      const remaining = shouldComplete ? 180 - angle : angle;
      transitionDur.current = Math.max(0.15, 0.7 * (remaining / 180));
      setFlipTarget(shouldComplete ? 'complete' : 'cancel');
      setFlipState('animating');
      /* flipAngle stays at the drag value; the useEffect will animate it to target */
    },
    onTapLeft: () => goBackward(),
    onTapRight: () => goForward()
  }), [flipState, canGoForward, canGoBackward, dims.pageWidth, goForward, goBackward]);

  useGestures(bookRef, gestureCallbacks, flipState === 'idle' || flipState === 'dragging');

  /* ── Keyboard ───────────────────────────────────── */
  const onKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight': goForward(); e.preventDefault(); break;
      case 'ArrowLeft': goBackward(); e.preventDefault(); break;
      case 'Home': jumpToPage(0); e.preventDefault(); break;
      case 'End': jumpToPage(totalPages - 1); e.preventDefault(); break;
      default: break;
    }
  }, [goForward, goBackward, jumpToPage, totalPages]);

  /* ── Corner hover cue (desktop) ─────────────────── */
  const onMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (isMobile || flipState !== 'idle') return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const nearCorner =
      e.clientX > rect.right - 80 && e.clientY > rect.bottom - 80;
    setCornerHint(nearCorner && canGoForward);
  }, [isMobile, flipState, canGoForward]);

  const onMouseLeave = React.useCallback(() => setCornerHint(false), []);

  /* ── Fullscreen toggle ──────────────────────────── */
  const toggleFullscreen = React.useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { /* noop */ });
    } else {
      (domElement || viewportRef.current)?.requestFullscreen?.().catch(() => { /* noop */ });
    }
  }, [domElement]);

  /* ── Zoom / fit-width ───────────────────────────── */
  const zoomIn = React.useCallback(() => {
    setZoom(z => {
      const idx = ZOOM_STEPS.findIndex(s => s >= z);
      return idx >= 0 && idx < ZOOM_STEPS.length - 1 ? ZOOM_STEPS[idx + 1] : z;
    });
    setFitWidth(false);
  }, []);
  const zoomOut = React.useCallback(() => {
    setZoom(z => {
      const idx = ZOOM_STEPS.findIndex(s => s >= z);
      return idx > 0 ? ZOOM_STEPS[idx - 1] : z;
    });
    setFitWidth(false);
  }, []);
  const toggleFitWidth = React.useCallback(() => {
    setFitWidth(prev => {
      if (!prev) {
        const target = (vpSize.w - PADDING * 2) / (calcDims(vpSize.w, vpSize.h, pageAR, isSingle, 1).bookWidth);
        setZoom(target);
      } else {
        setZoom(1);
      }
      return !prev;
    });
  }, [vpSize, pageAR, isSingle]);

  /* ────────────────────────────────────────────────
     Render helpers
     ──────────────────────────────────────────────── */

  const renderPageImg = (index: number): React.ReactNode => {
    if (index < 0 || index >= totalPages) {
      return <div className={styles.blankPage} />;
    }
    return <img src={pages[index]} alt={`Page ${index + 1}`} draggable={false} />;
  };

  const shadowOpacity = Math.sin((flipAngle * Math.PI) / 180) * 0.55;
  const edgeOpacity = Math.sin((flipAngle * Math.PI) / 180) * 0.35;

  /** Transition style for the turning leaf */
  const leafTransition =
    flipState === 'dragging'
      ? 'none'
      : `transform ${transitionDur.current}s cubic-bezier(0.22,0.61,0.36,1)`;

  /* ── Determine slot contents ────────────────────── */
  const P = currentPage;
  let leftSlotPage: number;
  let rightSlotPage: number;
  let turningFront: number;
  let turningBack: number;

  if (flipState !== 'idle') {
    if (isSingle) {
      turningFront = P;
      turningBack = flipDirection === 'forward' ? P + 1 : P - 1;
      leftSlotPage = -1;
      rightSlotPage = flipDirection === 'forward' ? P + 1 : P - 1;
    } else if (flipDirection === 'forward') {
      leftSlotPage = P;
      rightSlotPage = P + 3;
      turningFront = P + 1;
      turningBack = P + 2;
    } else {
      leftSlotPage = P - 2;
      rightSlotPage = P + 1;
      turningFront = P;
      turningBack = P - 1;
    }
  } else {
    leftSlotPage = isSingle ? -1 : P;
    rightSlotPage = isSingle ? P : P + 1;
    turningFront = -1;
    turningBack = -1;
  }

  /* ── Turning leaf CSS class ─────────────────────── */
  let leafClass = styles.turningLeaf + ' ';
  if (isSingle) {
    leafClass += flipDirection === 'forward'
      ? styles.turningForwardSingle
      : styles.turningBackwardSingle;
  } else {
    leafClass += flipDirection === 'forward'
      ? styles.turningForward
      : styles.turningBackward;
  }

  const leafRotate = flipDirection === 'forward' ? -flipAngle : flipAngle;

  /* ── Fold-gradient classes ──────────────────────── */
  const foldFrontClass = `${styles.foldGradient} ${
    flipDirection === 'forward'
      ? styles.foldGradientFrontForward
      : styles.foldGradientFrontBackward
  }`;
  const foldBackClass = `${styles.foldGradient} ${
    flipDirection === 'forward'
      ? styles.foldGradientBackForward
      : styles.foldGradientBackBackward
  }`;

  const underShadowClass = `${styles.underPageShadow} ${
    flipDirection === 'forward'
      ? styles.underShadowForward
      : styles.underShadowBackward
  }`;

  const edgeHighlightClass = `${styles.edgeHighlight} ${
    flipDirection === 'forward'
      ? styles.edgeHighlightForward
      : styles.edgeHighlightBackward
  }`;

  /* ================================================================
     JSX
     ================================================================ */
  return (
    <div
      className={styles.viewport}
      ref={viewportRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={isFullscreen ? { height: '100vh' } : undefined}
    >
      {/* ── Controls overlay ──────────────────────── */}
      <FlipbookControls
        currentPage={currentPage}
        totalPages={totalPages}
        currentSpread={currentSpread}
        totalSpreads={totalSpreads}
        isSingle={isSingle}
        zoom={zoom}
        fitWidth={fitWidth}
        isFullscreen={isFullscreen}
        pdfUrl={pdfUrl}
        showDownloadButton={showDownloadButton}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitWidth={toggleFitWidth}
        onFullscreen={toggleFullscreen}
        onPageJump={jumpToPage}
      />

      {/* ── Book ──────────────────────────────────── */}
      <div className={styles.bookWrapper}>
        <div
          className={styles.book}
          ref={bookRef}
          style={{
            width: dims.bookWidth,
            height: dims.bookHeight,
            cursor: flipState === 'dragging' ? 'grabbing' : 'pointer'
          }}
        >
          {/* Left page slot (spread mode only) */}
          {!isSingle && (
            <div className={`${styles.pageSlot} ${styles.leftSlot}`} style={{ width: dims.pageWidth, height: dims.pageHeight }}>
              {renderPageImg(leftSlotPage)}
              {flipState !== 'idle' && flipDirection === 'backward' && (
                <div className={underShadowClass} style={{ opacity: shadowOpacity }} />
              )}
            </div>
          )}

          {/* Right / single page slot */}
          <div
            className={`${styles.pageSlot} ${isSingle ? '' : styles.rightSlot}`}
            style={{ width: isSingle ? dims.bookWidth : dims.pageWidth, height: dims.pageHeight }}
          >
            {renderPageImg(rightSlotPage)}
            {flipState !== 'idle' && (isSingle || flipDirection === 'forward') && (
              <div className={underShadowClass} style={{ opacity: shadowOpacity }} />
            )}
          </div>

          {/* Spine shadow (spread mode only) */}
          {!isSingle && <div className={styles.spineShadow} />}

          {/* Page-edge thickness indicators */}
          {!isSingle && canGoBackward && (
            <div className={`${styles.pageEdge} ${styles.pageEdgeLeft}`} />
          )}
          {!isSingle && canGoForward && (
            <div className={`${styles.pageEdge} ${styles.pageEdgeRight}`} />
          )}

          {/* ── Turning leaf ──────────────────────── */}
          {flipState !== 'idle' && (
            <div
              ref={turningLeafRef}
              className={leafClass}
              style={{
                transform: `rotateY(${leafRotate}deg)`,
                transition: leafTransition
              }}
              onTransitionEnd={onTransitionEnd}
            >
              {/* Front face */}
              <div className={styles.leafFace}>
                {renderPageImg(turningFront)}
                <div className={foldFrontClass} style={{ opacity: shadowOpacity }} />
              </div>

              {/* Back face */}
              <div className={styles.leafBack}>
                {renderPageImg(turningBack)}
                <div className={foldBackClass} style={{ opacity: shadowOpacity }} />
              </div>

              {/* Edge highlight */}
              <div className={edgeHighlightClass} style={{ opacity: edgeOpacity }} />
            </div>
          )}

          {/* Corner hover cue */}
          {!isSingle && (
            <div className={`${styles.cornerCue} ${cornerHint ? styles.cornerCueVisible : ''}`} />
          )}
        </div>
      </div>
    </div>
  );
};

export default FlipbookViewer;
