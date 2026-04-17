import { useCallback, useEffect, useRef, useState } from 'react';
import type { MonthGroup } from '../models/galleryLayout';
import styles from './MonthNav.module.css';

interface MonthNavProps {
  monthsByYear: [number, MonthGroup[]][];
  monthGroups: MonthGroup[];
  activeMonthIndex: number;
  scrollTop: number;
  maxScrollTop: number;
  handleJumpToRatio: (ratio: number, smooth?: boolean) => void;
}

// Vertical month navigator used in gallery mode for quick timeline jumps.
export const MonthNav = ({
  monthGroups,
  activeMonthIndex,
  scrollTop,
  maxScrollTop,
  handleJumpToRatio,
}: MonthNavProps) => {
  const navRef = useRef<HTMLElement | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const scrollHideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setIsVisible(true);

    if (scrollHideTimerRef.current !== null) {
      window.clearTimeout(scrollHideTimerRef.current);
    }

    scrollHideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      scrollHideTimerRef.current = null;
    }, 900);
  }, [scrollTop]);

  useEffect(() => {
    return () => {
      if (scrollHideTimerRef.current !== null) {
        window.clearTimeout(scrollHideTimerRef.current);
      }
    };
  }, []);

  const getRatioFromPointer = useCallback(
    (clientY: number) => {
      if (!navRef.current || monthGroups.length === 0) {
        return 0;
      }

      const rect = navRef.current.getBoundingClientRect();
      const inset = 20;
      const trackHeight = Math.max(1, rect.height - inset * 2);
      return Math.max(0, Math.min(1, (clientY - rect.top - inset) / trackHeight));
    },
    [monthGroups.length],
  );

  const jumpByPointer = useCallback(
    (clientY: number, smooth: boolean) => {
      handleJumpToRatio(getRatioFromPointer(clientY), smooth);
    },
    [getRatioFromPointer, handleJumpToRatio],
  );

  useEffect(() => {
    if (!isScrubbing) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      jumpByPointer(event.clientY, false);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, jumpByPointer]);

  const scrollRatio = maxScrollTop > 0 ? Math.max(0, Math.min(1, scrollTop / maxScrollTop)) : 0;
  const displayIndex =
    monthGroups.length > 0
      ? Math.max(
          0,
          Math.min(monthGroups.length - 1, Math.round(scrollRatio * (monthGroups.length - 1))),
        )
      : activeMonthIndex;
  const displayGroup = monthGroups[displayIndex];
  const scanLineTop = `calc(20px + (100% - 40px) * ${scrollRatio})`;

  return (
    <nav
      ref={navRef}
      className={[styles.root, isScrubbing ? styles.scrubbing : '', isVisible ? styles.visible : '']
        .filter(Boolean)
        .join(' ')}
      onMouseDown={(event) => {
        setIsScrubbing(true);
        setIsVisible(true);
        jumpByPointer(event.clientY, false);
      }}
      onMouseEnter={() => {
        setIsVisible(true);
      }}
      onMouseLeave={() => {
        if (!isScrubbing) {
          setIsVisible(false);
        }
      }}
      aria-label="月移動バー"
    >
      <div className={styles.spine} aria-hidden="true" />
      <div className={styles['scan-line']} style={{ top: scanLineTop }} aria-hidden="true" />
      {monthGroups.map((g, index) => {
        const isYearStart = index === 0 || monthGroups[index - 1].year !== g.year;
        return (
          <button
            key={g.key}
            className={[
              styles.item,
              isYearStart ? styles['year-start'] : '',
              index === activeMonthIndex ? styles.active : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              handleJumpToRatio((index + 0.5) / monthGroups.length, true);
            }}
            onMouseDown={(event) => {
              setIsScrubbing(true);
              setIsVisible(true);
              jumpByPointer(event.clientY, false);
            }}
            aria-label={`${g.year}年 ${g.label}`}
            type="button"
          >
            <span className={styles.tick} aria-hidden="true" />
            {isYearStart && <span className={styles.year}>{g.year}</span>}
          </button>
        );
      })}
      {displayGroup && (
        <div
          className={[styles.tooltip, isVisible ? styles['tooltip-visible'] : '']
            .filter(Boolean)
            .join(' ')}
          style={{ top: scanLineTop }}
          aria-hidden="true"
        >
          <div className={styles['tooltip-inner']}>
            <span className={styles['tooltip-year']}>{displayGroup.year}</span>
            <span className={styles['tooltip-month']}>{displayGroup.label}</span>
          </div>
        </div>
      )}
    </nav>
  );
};
