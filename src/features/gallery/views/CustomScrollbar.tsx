import { MouseEvent } from 'react';
import styles from './CustomScrollbar.module.css';

interface CustomScrollbarProps {
  isDragging: boolean;
  thumbTop: number;
  thumbHeight: number;
  handleTrackClick: (e: MouseEvent<HTMLElement>) => void;
  handleScrollbarMouseDown: (e: MouseEvent) => void;
}

/** Decorative scrollbar used for the custom gallery navigator. */
export const CustomScrollbar = ({
  isDragging,
  thumbTop,
  thumbHeight,
  handleTrackClick,
  handleScrollbarMouseDown,
}: CustomScrollbarProps) => {
  return (
    <div className={[styles.root, isDragging ? styles.dragging : ''].filter(Boolean).join(' ')}>
      <button className={styles.track} onClick={handleTrackClick} type="button">
        <button
          className={styles.thumb}
          style={{ top: thumbTop, height: thumbHeight }}
          onMouseDown={handleScrollbarMouseDown}
          type="button"
          aria-label="スクロール位置を調整"
        />
      </button>
    </div>
  );
};
