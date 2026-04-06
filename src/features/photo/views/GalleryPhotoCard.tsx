import { useRef } from 'react';
import type { DisplayPhotoItem } from '../../../shared/models/types';
import { AnimatedFavoriteStar } from '../../../shared/components/AnimatedFavoriteStar';
import { useViewportPresence } from '../viewmodels/useViewportPresence';
import { useGridThumbnailViewModel } from '../viewmodels/useGridThumbnailViewModel';
import styles from './GalleryPhotoCard.module.css';

interface GalleryPhotoCardProps {
  item: DisplayPhotoItem;
  onSelect: (item: DisplayPhotoItem) => void;
  onToggleSelect: (item: DisplayPhotoItem, shiftKey: boolean) => void;
  selected: boolean;
}

export const GalleryPhotoCard = ({
  item,
  onSelect,
  onToggleSelect,
  selected,
}: GalleryPhotoCardProps) => {
  const photo = item.photo;
  const cardRef = useRef<HTMLDivElement | null>(null);
  const shouldLoadThumb = useViewportPresence(cardRef, photo.photo_path, {
    rootMargin: '96px 0px',
    releaseDelayMs: 180,
  });
  const thumbUrl = useGridThumbnailViewModel(photo.photo_path, photo.source_slot, shouldLoadThumb);

  return (
    <div
      ref={cardRef}
      className={[styles.card, selected ? styles.selected : ''].filter(Boolean).join(' ')}
      onClick={() => {
        onSelect(item);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(item);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className={styles.thumb}>
        <button
          className={[styles['select-toggle'], selected ? styles.selected : '']
            .filter(Boolean)
            .join(' ')}
          onClick={(event) => {
            event.stopPropagation();
            onToggleSelect(item, event.shiftKey);
          }}
          aria-label={selected ? '選択解除' : '選択'}
          type="button"
        >
          {selected ? '✓' : ''}
        </button>
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={photo.photo_filename}
            className={styles.image}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ) : (
          <div className={styles.skeleton} />
        )}
        <div
          className={[styles.favorite, photo.is_favorite ? styles.active : '']
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        >
          <AnimatedFavoriteStar liked={photo.is_favorite} className="favorite-star-gallery" />
        </div>
        {!!item.groupCount && item.groupCount > 1 && (
          <div className={styles['group-badge']} aria-hidden="true">
            {item.groupCount}枚
          </div>
        )}
        <div className={styles.overlay}>
          <div className={styles.topline}>
            <div className={styles['meta-row']}>
              {photo.is_favorite && (
                <span className={[styles.pill, styles['favorite-pill']].join(' ')}>★ Favorite</span>
              )}
              {photo.match_source === 'stella_db' && <span className={styles.pill}>DB</span>}
              {photo.match_source === 'phash' && <span className={styles.pill}>類似一致</span>}
            </div>
          </div>
          <div className={styles.bottomline}>
            <div className={styles.world}>{photo.world_name || 'ワールド不明'}</div>
            <div className={styles.date}>{photo.timestamp}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
