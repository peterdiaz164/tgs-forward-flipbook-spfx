import * as React from 'react';

export interface IGestureCallbacks {
  onDragStart: (direction: 'left' | 'right') => void;
  onDragMove: (deltaX: number) => void;
  onDragEnd: (deltaX: number, velocity: number) => void;
  onTapLeft: () => void;
  onTapRight: () => void;
}

/**
 * React hook that attaches pointer-event listeners to the given ref
 * and exposes drag / tap callbacks for the flipbook.
 */
export function useGestures(
  ref: React.RefObject<HTMLElement>,
  callbacks: IGestureCallbacks,
  enabled: boolean
): void {
  const cbRef = React.useRef(callbacks);
  cbRef.current = callbacks;

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastTime = 0;
    let isDragging = false;
    let isTracking = false;

    const DRAG_THRESHOLD = 10;
    const DIRECTION_LOCK_RATIO = 1.4;

    const onPointerDown = (e: PointerEvent): void => {
      if (e.button !== 0) return;
      startX = e.clientX;
      startY = e.clientY;
      lastX = e.clientX;
      lastTime = Date.now();
      isTracking = true;
      isDragging = false;
      el.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent): void => {
      if (!isTracking) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!isDragging) {
        if (Math.abs(dx) > DRAG_THRESHOLD && Math.abs(dx) > Math.abs(dy) * DIRECTION_LOCK_RATIO) {
          isDragging = true;
          cbRef.current.onDragStart(dx < 0 ? 'left' : 'right');
        } else {
          return;
        }
      }

      cbRef.current.onDragMove(dx);
      lastX = e.clientX;
      lastTime = Date.now();
      e.preventDefault();
    };

    const onPointerUp = (e: PointerEvent): void => {
      if (!isTracking) return;
      isTracking = false;

      if (isDragging) {
        const dx = e.clientX - startX;
        const dt = Date.now() - lastTime;
        const velocity = dt > 0 ? (e.clientX - lastX) / dt : 0;
        isDragging = false;
        cbRef.current.onDragEnd(dx, velocity);
      } else {
        const rect = el.getBoundingClientRect();
        const tapX = e.clientX - rect.left;
        if (tapX < rect.width / 2) {
          cbRef.current.onTapLeft();
        } else {
          cbRef.current.onTapRight();
        }
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
    };
  }, [ref, enabled]);
}
