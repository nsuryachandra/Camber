import { useState, useEffect, useRef, useCallback } from 'react';

const TOTAL_FRAMES = 168;
const FRAME_PATH = (idx) => `/frames/frame_${String(idx + 1).padStart(4, '0')}.webp`;
// Total virtual pixel distance to scrub through all 168 frames (smooth & deliberate)
const VIRTUAL_SCROLL_DISTANCE = 2200;

export function useScrollFrameAnimation({ onComplete }) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const imagesRef = useRef(new Array(TOTAL_FRAMES));
  const frameIndexRef = useRef(0);
  const virtualScrollRef = useRef(0);
  const targetScrollRef = useRef(0);
  const rafIdRef = useRef(null);
  const lastDrawnImageRef = useRef(null);
  const hasTriggeredCompleteRef = useRef(false);
  const forceUpdateListeners = useRef(new Set());
  const touchStartYRef = useRef(0);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Repaint subscription
  const subscribeRepaint = useCallback((callback) => {
    forceUpdateListeners.current.add(callback);
    return () => forceUpdateListeners.current.delete(callback);
  }, []);

  const notifyRepaint = useCallback(() => {
    forceUpdateListeners.current.forEach((cb) => cb());
  }, []);

  // Preload all 168 frames with eager parallel loading
  useEffect(() => {
    let active = true;
    const images = imagesRef.current;

    const loadSingle = (index) => {
      if (images[index]) return Promise.resolve(images[index]);
      return new Promise((resolve) => {
        const img = new Image();
        img.src = FRAME_PATH(index);
        img.onload = () => {
          if (!active) return;
          images[index] = img;
          if (index === 0) {
            setIsLoaded(true);
            lastDrawnImageRef.current = img;
          }
          if (index === frameIndexRef.current) {
            notifyRepaint();
          }
          resolve(img);
        };
        img.onerror = () => {
          resolve(null);
        };
      });
    };

    // Load Frame 1 instantly, then all frames in batches of 24
    loadSingle(0).then(() => {
      if (!active) return;
      const loadAll = async () => {
        const batchSize = 24;
        for (let i = 1; i < TOTAL_FRAMES; i += batchSize) {
          if (!active) break;
          const batch = [];
          for (let j = i; j < Math.min(i + batchSize, TOTAL_FRAMES); j++) {
            batch.push(loadSingle(j));
          }
          await Promise.all(batch);
        }
      };
      loadAll();
    });

    return () => {
      active = false;
    };
  }, [notifyRepaint]);

  const isFastForwardingRef = useRef(false);
  const [isFastForwarding, setIsFastForwarding] = useState(false);

  // Fast-forward trigger (e.g. for "Skip Intro" rapid scrub)
  const fastForward = useCallback(() => {
    isFastForwardingRef.current = true;
    setIsFastForwarding(true);
    targetScrollRef.current = VIRTUAL_SCROLL_DISTANCE;
  }, []);

  // Virtual Scroll & Smooth Lerp Animation Loop
  useEffect(() => {
    if (prefersReducedMotion) return;

    let isRunning = true;

    const loop = () => {
      if (!isRunning) return;

      if (isFastForwardingRef.current) {
        // Fast-forward playback at authentic 1.5x speed (~3.0s across 168 frames)
        const step = 12;
        virtualScrollRef.current = Math.min(VIRTUAL_SCROLL_DISTANCE, virtualScrollRef.current + step);
        targetScrollRef.current = VIRTUAL_SCROLL_DISTANCE;
      } else {
        // Smooth lerp interpolation: virtualScroll approaches targetScroll
        const diff = targetScrollRef.current - virtualScrollRef.current;
        if (Math.abs(diff) > 0.1) {
          virtualScrollRef.current += diff * 0.22; // Snappy & responsive damping
        } else {
          virtualScrollRef.current = targetScrollRef.current;
        }
      }

      const rawProgress = Math.min(1, Math.max(0, virtualScrollRef.current / VIRTUAL_SCROLL_DISTANCE));
      const targetFrame = Math.min(
        TOTAL_FRAMES - 1,
        Math.max(0, Math.floor(rawProgress * (TOTAL_FRAMES - 1)))
      );

      if (targetFrame !== frameIndexRef.current) {
        frameIndexRef.current = targetFrame;
        setCurrentFrame(targetFrame);
        setProgress(rawProgress);
        notifyRepaint();
      }

      // Auto-transition to login on reaching final frame
      if (rawProgress >= 0.995 && !hasTriggeredCompleteRef.current) {
        hasTriggeredCompleteRef.current = true;
        if (onComplete) onComplete();
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    // Mouse wheel handler (intercepts wheel directly on fixed viewport)
    const handleWheel = (e) => {
      if (isFastForwardingRef.current) return;
      e.preventDefault();
      // Normalize delta
      const delta = e.deltaY * 1.35;
      targetScrollRef.current = Math.min(
        VIRTUAL_SCROLL_DISTANCE,
        Math.max(0, targetScrollRef.current + delta)
      );
    };

    // Touch handlers for mobile / trackpad touch
    const handleTouchStart = (e) => {
      if (e.touches.length > 0) {
        touchStartYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        const touchY = e.touches[0].clientY;
        const delta = (touchStartYRef.current - touchY) * 2.2;
        touchStartYRef.current = touchY;
        targetScrollRef.current = Math.min(
          VIRTUAL_SCROLL_DISTANCE,
          Math.max(0, targetScrollRef.current + delta)
        );
      }
    };

    // Keyboard Arrow Keys
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        targetScrollRef.current = Math.min(
          VIRTUAL_SCROLL_DISTANCE,
          targetScrollRef.current + 180
        );
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        targetScrollRef.current = Math.max(0, targetScrollRef.current - 180);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isRunning = false;
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [prefersReducedMotion, onComplete, notifyRepaint]);

  // Robust get frame image with nearest neighbor fallback
  const getFrameImage = useCallback((index) => {
    const images = imagesRef.current;
    if (!images) return lastDrawnImageRef.current;

    const current = images[index];
    if (current && current.complete && current.naturalWidth > 0) {
      lastDrawnImageRef.current = current;
      return current;
    }

    // Nearest loaded neighbor (search outwards)
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = images[index - offset];
      if (prev && prev.complete && prev.naturalWidth > 0) {
        lastDrawnImageRef.current = prev;
        return prev;
      }
      const next = images[index + offset];
      if (next && next.complete && next.naturalWidth > 0) {
        lastDrawnImageRef.current = next;
        return next;
      }
    }

    return lastDrawnImageRef.current || images[0] || null;
  }, []);

  return {
    currentFrame,
    totalFrames: TOTAL_FRAMES,
    progress,
    isLoaded,
    isFastForwarding,
    fastForward,
    prefersReducedMotion,
    getFrameImage,
    subscribeRepaint,
  };
}
