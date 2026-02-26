import * as React from 'react';
import styles from './FlipbookViewer.module.scss';
import { FlipState, FlipDirection } from '../utils/types';
import { ImagePreloader } from '../utils/imagePreloader';
import { useGestures } from '../utils/gestureHandler';
import FlipbookControls from './FlipbookControls';

export interface IFlipbookViewerProps {
  pages: string[];
  totalPages: number;
  singlePageOnDesktop: boolean;
  imageCache: ImagePreloader;
  pdfUrl: string;
  showDownloadButton: boolean;
}

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

function normalizeSpreadIndex(page: number): number {
  if (page <= 0) return 0;
  if (page % 2 === 0) return page - 1;
  return page;
}

const DEBUG_OVERLAY = false;

const FlipbookViewer: React.FC<IFlipbookViewerProps> = (props) => {
  const { pages, totalPages, singlePageOnDesktop, imageCache, pdfUrl, showDownloadButton } = props;

  const [currentPage, setCurrentPage] = React.useState(0);
  const [flipState, setFlipState] = React.useState<FlipState>('idle');
  const [flipDirection, setFlipDirection] = React.useState<FlipDirection>('forward');
  const [flipAngle, setFlipAngle] = React.useState(0);
  const [flipTarget, setFlipTarget] = React.useState<'complete' | 'cancel' | null>(null);

  const [zoom, setZoom] = React.useState(1);
  const [fitWidth, setFitWidth] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [cornerHint, setCornerHint] = React.useState(false);
  const [vpSize, setVpSize] = React.useState({ w: 800, h: 600 });

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const bookRef = React.useRef<HTMLDivElement>(null);
  const turningLeafRef = React.useRef<HTMLDivElement>(null);
  const transitionDur = React.useRef(0.7);
  const flipAngleRef = React.useRef(0);
  flipAngleRef.current = flipAngle;
  const flipBasePageRef = React.useRef(0);

  const isMobile = vpSize.w < 768;
  const isBookSpread = !isMobile && !singlePageOnDesktop;
  const isCoverSingle = isBookSpread && currentPage === 0;
  const isBackCoverSingle = isBookSpread && currentPage > 0
    && currentPage === totalPages - 1 && currentPage % 2 === 1;
  const renderSingle = isMobile || singlePageOnDesktop || isCoverSingle || isBackCoverSingle;
  const pageAR = imageCache.aspectRatio || 0.7727;
  const dims = calcDims(vpSize.w, vpSize.h, pageAR, renderSingle, zoom);

  const canGoForward = renderSingle
    ? currentPage < totalPages - 1
    : currentPage + 2 < totalPages;
  const canGoBackward = renderSingle ? currentPage > 0 : currentPage >= 1;
  const controlsSingle = isMobile || singlePageOnDesktop;
  const totalSpreads = controlsSingle
    ? totalPages
    : (totalPages <= 1 ? 1 : 1 + Math.ceil((totalPages - 1) / 2));
  const currentSpread = controlsSingle
    ? currentPage
    : Math.ceil(currentPage / 2);

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

  React.useEffect(() => {
    const onChange = (): void => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  React.useEffect(() => {
    const nearby: number[] = [];
    for (let d = -2; d <= 4; d++) {
      const idx = currentPage + d;
      if (idx >= 0 && idx < totalPages) nearby.push(idx);
    }
    const urls = nearby.map(i => pages[i]).filter(Boolean);
    imageCache.preloadRange(urls);
  }, [currentPage, totalPages, pages, imageCache]);

  React.useEffect(() => {
    if (flipState !== 'animating' || flipTarget === null) return;

    const target = flipTarget === 'complete' ? 180 : 0;
    const current = flipAngleRef.current;

    if (Math.abs(current - target) < 0.5) {
      if (flipTarget === 'complete') {
        setCurrentPage(prev => {
          if (flipDirection === 'forward') {
            return prev + (renderSingle ? 1 : 2);
          }
          if (isBackCoverSingle) return prev - 2;
          return Math.max(0, prev - (renderSingle ? 1 : (prev <= 1 ? 1 : 2)));
        });
      }
      setFlipState('idle');
      setFlipAngle(0);
      setFlipTarget(null);
      return;
    }

    let cancelled = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setFlipAngle(target);
      });
    });
    return () => { cancelled = true; };
  }, [flipState, flipTarget, flipDirection, renderSingle, isBackCoverSingle]);

  const goForward = React.useCallback(() => {
    if (flipState !== 'idle' || !canGoForward) return;
    flipBasePageRef.current = currentPage;
    transitionDur.current = 0.7;
    setFlipDirection('forward');
    setFlipTarget('complete');
    setFlipAngle(0);
    setFlipState('animating');
  }, [flipState, canGoForward, currentPage]);

  const goBackward = React.useCallback(() => {
    if (flipState !== 'idle' || !canGoBackward) return;
    flipBasePageRef.current = currentPage;
    transitionDur.current = 0.7;
    setFlipDirection('backward');
    setFlipTarget('complete');
    setFlipAngle(0);
    setFlipState('animating');
  }, [flipState, canGoBackward, currentPage]);

  const jumpToPage = React.useCallback((page: number) => {
    if (flipState !== 'idle') return;
    const clamped = Math.max(0, Math.min(page, totalPages - 1));
    const aligned = isBookSpread ? normalizeSpreadIndex(clamped) : clamped;
    setCurrentPage(aligned);
  }, [flipState, totalPages, isBookSpread]);

  const onTransitionEnd = React.useCallback((e: React.TransitionEvent) => {
    if (e.propertyName !== 'transform') return;
    if (flipTarget === 'complete') {
      setCurrentPage(prev => {
        if (flipDirection === 'forward') {
          return prev + (renderSingle ? 1 : 2);
        }
        if (isBackCoverSingle) return prev - 2;
        return Math.max(0, prev - (renderSingle ? 1 : (prev <= 1 ? 1 : 2)));
      });
    }
    setFlipState('idle');
    setFlipAngle(0);
    setFlipTarget(null);
  }, [flipTarget, flipDirection, renderSingle, isBackCoverSingle]);

  const gestureCallbacks = React.useMemo(() => ({
    onDragStart: (dir: 'left' | 'right') => {
      if (flipState !== 'idle') return;
      flipBasePageRef.current = currentPage;
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
    },
    onTapLeft: () => goBackward(),
    onTapRight: () => goForward()
  }), [flipState, canGoForward, canGoBackward, dims.pageWidth, goForward, goBackward, currentPage]);

  useGestures(bookRef, gestureCallbacks, flipState === 'idle' || flipState === 'dragging');

  const onKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight': goForward(); e.preventDefault(); break;
      case 'ArrowLeft': goBackward(); e.preventDefault(); break;
      case 'Home': jumpToPage(0); e.preventDefault(); break;
      case 'End': jumpToPage(totalPages - 1); e.preventDefault(); break;
      default: break;
    }
  }, [goForward, goBackward, jumpToPage, totalPages]);

  const onMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (isMobile || flipState !== 'idle') return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const nearCorner =
      e.clientX > rect.right - 80 && e.clientY > rect.bottom - 80;
    setCornerHint(nearCorner && canGoForward);
  }, [isMobile, flipState, canGoForward]);

  const onMouseLeave = React.useCallback(() => setCornerHint(false), []);

  const toggleFullscreen = React.useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { /* noop */ });
    } else {
      viewportRef.current?.requestFullscreen?.().catch(() => { /* noop */ });
    }
  }, []);

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
        const target = (vpSize.w - PADDING * 2) / (calcDims(vpSize.w, vpSize.h, pageAR, renderSingle, 1).bookWidth);
        setZoom(target);
      } else {
        setZoom(1);
      }
      return !prev;
    });
  }, [vpSize, pageAR, renderSingle]);

  const renderPageImg = (index: number): React.ReactNode => {
    if (index < 0 || index >= totalPages) {
      return <div className={styles.blankPage} />;
    }
    return <img src={pages[index]} alt={`Page ${index + 1}`} draggable={false} />;
  };

  const shadowOpacity = Math.sin((flipAngle * Math.PI) / 180) * 0.55;
  const edgeOpacity = Math.sin((flipAngle * Math.PI) / 180) * 0.35;

  const leafTransition =
    flipState === 'dragging'
      ? 'none'
      : `transform ${transitionDur.current}s cubic-bezier(0.22,0.61,0.36,1)`;

  const P = flipState !== 'idle' ? flipBasePageRef.current : currentPage;
  let leftSlotPage: number;
  let rightSlotPage: number;
  let turningFront: number;
  let turningBack: number;

  if (flipState !== 'idle') {
    if (renderSingle) {
      turningFront = P;
      turningBack = flipDirection === 'forward' ? P + 1 : P - 1;
      leftSlotPage = -1;
      rightSlotPage = P;
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
    leftSlotPage = renderSingle ? -1 : P;
    rightSlotPage = renderSingle ? P : P + 1;
    turningFront = -1;
    turningBack = -1;
  }

  let leafClass = styles.turningLeaf + ' ';
  if (renderSingle) {
    leafClass += flipDirection === 'forward'
      ? styles.turningForwardSingle
      : styles.turningBackwardSingle;
  } else {
    leafClass += flipDirection === 'forward'
      ? styles.turningForward
      : styles.turningBackward;
  }

  const leafRotate = flipDirection === 'forward' ? -flipAngle : flipAngle;

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
      <FlipbookControls
        currentPage={currentPage}
        totalPages={totalPages}
        currentSpread={currentSpread}
        totalSpreads={totalSpreads}
        isSingle={controlsSingle}
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

      {DEBUG_OVERLAY && (
        <div className={styles.debugPanel}>
          {`P=${P} cur=${currentPage} base=${flipBasePageRef.current}\n`}
          {`L=${leftSlotPage} R=${rightSlotPage} tF=${turningFront} tB=${turningBack}\n`}
          {`${flipState} ${flipDirection} single=${renderSingle} cover=${isCoverSingle} backCover=${isBackCoverSingle}`}
        </div>
      )}

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
          {!renderSingle && (
            <div className={`${styles.pageSlot} ${styles.leftSlot}`} style={{ width: dims.pageWidth, height: dims.pageHeight }}>
              {renderPageImg(leftSlotPage)}
              {flipState !== 'idle' && flipDirection === 'backward' && (
                <div className={underShadowClass} style={{ opacity: shadowOpacity }} />
              )}
              {DEBUG_OVERLAY && <div className={styles.debugLabel} style={{ background: 'rgba(0,80,200,.75)' }}>LEFT slot:{leftSlotPage}</div>}
            </div>
          )}

          <div
            className={`${styles.pageSlot} ${renderSingle ? '' : styles.rightSlot}`}
            style={{ width: renderSingle ? dims.bookWidth : dims.pageWidth, height: dims.pageHeight }}
          >
            {renderPageImg(rightSlotPage)}
            {flipState !== 'idle' && (renderSingle || flipDirection === 'forward') && (
              <div className={underShadowClass} style={{ opacity: shadowOpacity }} />
            )}
            {DEBUG_OVERLAY && <div className={styles.debugLabel} style={{ background: 'rgba(0,140,0,.75)' }}>RIGHT slot:{rightSlotPage}</div>}
          </div>

          {!renderSingle && <div className={styles.spineShadow} />}

          {!renderSingle && canGoBackward && (
            <div className={`${styles.pageEdge} ${styles.pageEdgeLeft}`} />
          )}
          {!renderSingle && canGoForward && (
            <div className={`${styles.pageEdge} ${styles.pageEdgeRight}`} />
          )}

          {flipState !== 'idle' && (() => {
            const leaf = (
              <div
                ref={turningLeafRef}
                className={leafClass}
                style={{
                  transform: `rotateY(${leafRotate}deg)`,
                  transition: leafTransition
                }}
                onTransitionEnd={onTransitionEnd}
              >
                <div className={styles.leafFace}>
                  {renderPageImg(turningFront)}
                  <div className={foldFrontClass} style={{ opacity: shadowOpacity }} />
                  {DEBUG_OVERLAY && <div className={styles.debugLabel} style={{ background: 'rgba(220,120,0,.85)' }}>FRONT:{turningFront}</div>}
                </div>

                <div className={styles.leafBack}>
                  {renderPageImg(turningBack)}
                  <div className={foldBackClass} style={{ opacity: shadowOpacity }} />
                  {DEBUG_OVERLAY && <div className={styles.debugLabel} style={{ background: 'rgba(200,0,0,.85)' }}>BACK:{turningBack}</div>}
                </div>

                <div className={edgeHighlightClass} style={{ opacity: edgeOpacity }} />
              </div>
            );

            if (renderSingle) return leaf;

            const clipClass = flipDirection === 'forward'
              ? styles.turningClipForward
              : styles.turningClipBackward;

            return <div className={clipClass}>{leaf}</div>;
          })()}

          {isBookSpread && (
            <div className={`${styles.cornerCue} ${cornerHint ? styles.cornerCueVisible : ''}`} />
          )}
        </div>
      </div>
    </div>
  );
};

export default FlipbookViewer;
