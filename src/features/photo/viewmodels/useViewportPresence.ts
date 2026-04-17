import { RefObject, useEffect, useRef, useState } from 'react';

interface UseViewportPresenceOptions {
  rootMargin: string;
  threshold?: number;
  releaseDelayMs?: number;
}

// Tracks whether a target element is near the viewport.
export const useViewportPresence = <T extends Element>(
  targetRef: RefObject<T | null>,
  targetKey: string | undefined,
  { rootMargin, threshold = 0.01, releaseDelayMs = 180 }: UseViewportPresenceOptions,
) => {
  const [isPresent, setIsPresent] = useState(false);
  const releaseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const clearReleaseTimer = () => {
      if (releaseTimerRef.current !== null) {
        window.clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
    };

    const scheduleRelease = () => {
      clearReleaseTimer();
      releaseTimerRef.current = window.setTimeout(() => {
        releaseTimerRef.current = null;
        setIsPresent(false);
      }, releaseDelayMs);
    };

    const node = targetRef.current;
    if (!node || !targetKey) {
      clearReleaseTimer();
      setIsPresent(false);
      return;
    }

    if (!('IntersectionObserver' in window)) {
      clearReleaseTimer();
      setIsPresent(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries.some((entry) => entry.isIntersecting);
        if (isIntersecting) {
          clearReleaseTimer();
          setIsPresent(true);
          return;
        }

        scheduleRelease();
      },
      {
        rootMargin,
        threshold,
      },
    );

    observer.observe(node);

    return () => {
      clearReleaseTimer();
      observer.disconnect();
    };
  }, [releaseDelayMs, rootMargin, targetKey, targetRef, threshold]);

  return isPresent;
};
