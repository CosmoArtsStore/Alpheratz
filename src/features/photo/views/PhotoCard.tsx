import { useRef, type CSSProperties } from 'react';
import type { DisplayPhotoItem } from '../../../shared/models/types';
import { AnimatedFavoriteStar } from '../../../shared/components/AnimatedFavoriteStar';
import { useViewportPresence } from '../viewmodels/useViewportPresence';
import { useGridThumbnailViewModel } from '../viewmodels/useGridThumbnailViewModel';
import styles from './PhotoCard.module.css';

interface PhotoCardProps {
  data: DisplayPhotoItem[];
  onSelect: (item: DisplayPhotoItem) => void;
  onToggleSelect: (item: DisplayPhotoItem, shiftKey: boolean) => void;
  isSelected: (item: DisplayPhotoItem) => boolean;
  showTags: boolean;
  showSelectionToggle: boolean;
  columnCount: number;
  columnIndex: number;
  rowIndex: number;
  style: CSSProperties;
}

// Standard-grid photo card with lazy thumbnail loading and selection UI.
export const PhotoCard = ({
  data,
  onSelect,
  onToggleSelect,
  isSelected,
  showTags,
  showSelectionToggle,
  columnCount,
  columnIndex,
  rowIndex,
  style,
}: PhotoCardProps) => {
  const index = rowIndex * columnCount + columnIndex;
  const item = data[index];
  const photo = item?.photo;
  const cardRef = useRef<HTMLDivElement | null>(null);
  const shouldLoadThumb = useViewportPresence(cardRef, photo?.photo_path, {
    rootMargin: '64px 0px',
    releaseDelayMs: 180,
  });
  const thumbUrl = useGridThumbnailViewModel(
    photo?.photo_path,
    photo?.source_slot,
    shouldLoadThumb,
  );

  if (!photo) {
    return null;
  }

  const isSelectedCard = isSelected(item);
  const cardClassName = [styles.card, isSelectedCard ? styles.selected : '']
    .filter(Boolean)
    .join(' ');
  const toggleClassName = [styles['select-toggle'], isSelectedCard ? styles.selected : '']
    .filter(Boolean)
    .join(' ');
  const sourceBadgeClassName = [styles['source-badge'], photo.source_slot === 2 ? styles.slot2 : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={cardRef} style={style} className={styles.wrapper}>
      <button
        className={styles['card-button']}
        onClick={() => {
          onSelect(item);
        }}
        type="button"
      >
        <div className={cardClassName}>
          <div className={styles['thumb-container']}>
            {thumbUrl ? (
              <img
                src={thumbUrl}
                alt={photo.photo_filename}
                className={styles.thumb}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            ) : (
              <div className={styles['thumb-skeleton']} />
            )}
            {photo.is_favorite && (
              <span className={styles['favorite-corner']} aria-hidden="true">
                <AnimatedFavoriteStar liked={true} className="favorite-star-corner" />
              </span>
            )}
            {!!item.groupCount && item.groupCount > 1 && (
              <span className={styles['group-count-badge']} aria-hidden="true">
                {item.groupCount}枚
              </span>
            )}
            <span className={sourceBadgeClassName}>{photo.source_slot === 2 ? '2nd' : '1st'}</span>
          </div>
          <div className={styles.info}>
            <div className={styles['meta-row']}>
              {photo.match_source === 'polaris_archive' && (
                <span className={styles.pill}>archive</span>
              )}
              {photo.match_source === 'phash' && <span className={styles.pill}>類似一致</span>}
            </div>
            <div className={styles.world}>{photo.world_name || 'ワールド不明'}</div>
            <div className={styles.date}>{photo.timestamp}</div>
            {showTags && !!photo.tags?.length && (
              <div className={styles['tags-preview']}>
                {photo.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className={styles['tag-chip']}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </button>
      {showSelectionToggle && (
        <button
          className={toggleClassName}
          onClick={(event) => {
            event.stopPropagation();
            onToggleSelect(item, event.shiftKey);
          }}
          aria-label={isSelectedCard ? '選択解除' : '選択'}
          type="button"
        >
          {isSelectedCard ? '✓' : ''}
        </button>
      )}
    </div>
  );
};
