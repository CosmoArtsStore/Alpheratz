import { useEffect, useRef, useState, type WheelEvent } from 'react';
import type { Photo } from '../models/types';
import { AppIcon, APP_ICON_CLASS_NAMES, APP_ICON_NAMES } from '../../../shared/components/Icons';
import { AnimatedFavoriteStar } from '../../../shared/components/AnimatedFavoriteStar';
import { HoverTooltip } from '../../../shared/components/HoverTooltip';
import { useViewportPresence } from '../viewmodels/useViewportPresence';
import { useGridThumbnailViewModel } from '../viewmodels/useGridThumbnailViewModel';
import { usePhotoSrcViewModel } from '../viewmodels/usePhotoSrcViewModel';
import styles from './PhotoModal.module.css';

interface PhotoModalProps {
  photo: Photo;
  allTags: string[];
  onClose: () => void;
  localMemo: string;
  setLocalMemo: (val: string) => void;
  handleSaveMemo: () => void;
  isSavingMemo: boolean;
  handleOpenWorld: () => void;
  canGoBack?: boolean;
  onGoBack?: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  onGoPrev?: () => void;
  onGoNext?: () => void;
  similarPhotos?: Photo[];
  showSimilarPhotos?: boolean;
  onSelectSimilarPhoto?: (photo: Photo) => void;
  onToggleFavorite: () => void;
  onTweet: () => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onShowInExplorer: () => void;
  onOpenTagMaster?: () => void;
}

const SimilarPhotoThumb = ({
  photo,
  isActive,
  onSelect,
}: {
  photo: Photo;
  isActive: boolean;
  onSelect: (photo: Photo) => void;
}) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const shouldLoadThumb = useViewportPresence(buttonRef, photo.photo_path, {
    rootMargin: '40px 0px',
    releaseDelayMs: 180,
  });
  const thumbUrl = useGridThumbnailViewModel(photo.photo_path, photo.source_slot, shouldLoadThumb);

  return (
    <button
      ref={buttonRef}
      className={[styles['similar-thumb'], isActive ? styles.active : ''].filter(Boolean).join(' ')}
      onClick={() => {
        onSelect(photo);
      }}
      type="button"
      title={photo.photo_filename}
    >
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={photo.photo_filename}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      ) : (
        <span className={styles['similar-skeleton']} />
      )}
    </button>
  );
};

// Full photo-detail modal with memo, tag, favorite, and navigation controls.
export const PhotoModal = ({
  photo,
  allTags,
  onClose,
  localMemo,
  setLocalMemo,
  handleSaveMemo,
  isSavingMemo,
  handleOpenWorld,
  canGoBack,
  onGoBack,
  canGoPrev,
  canGoNext,
  onGoPrev,
  onGoNext,
  similarPhotos = [],
  showSimilarPhotos = false,
  onSelectSimilarPhoto,
  onToggleFavorite,
  onTweet,
  onAddTag,
  onRemoveTag,
  onShowInExplorer,
  onOpenTagMaster,
}: PhotoModalProps) => {
  const [selectedExistingTag, setSelectedExistingTag] = useState('');
  const similarStripRef = useRef<HTMLDivElement | null>(null);
  const photoSrc = usePhotoSrcViewModel(photo.photo_path);

  const availableTags = allTags.filter((tag) => !photo.tags.includes(tag));
  const hasAvailableTags = availableTags.length > 0;
  const matchSourceLabel =
    photo.match_source === 'polaris_archive'
      ? 'archive ログから補完'
      : photo.match_source === 'phash'
        ? '類似写真から推測'
        : null;

  const addExistingTag = () => {
    if (!selectedExistingTag) {
      return;
    }
    onAddTag(selectedExistingTag);
    setSelectedExistingTag('');
  };

  useEffect(() => {
    setSelectedExistingTag('');
  }, [photo.photo_path]);

  const handleSimilarStripWheel = (event: WheelEvent<HTMLDivElement>) => {
    const strip = similarStripRef.current;
    if (!strip) {
      return;
    }

    const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (delta === 0) {
      return;
    }

    event.preventDefault();
    strip.scrollLeft += delta;
  };

  return (
    <>
      <button
        className={styles.overlay}
        onClick={onClose}
        aria-label="モーダルを閉じる"
        type="button"
      />
      <section
        className={styles.content}
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-modal-title"
      >
        {canGoBack && onGoBack && (
          <button className={styles.back} onClick={onGoBack} type="button">
            <AppIcon name={APP_ICON_NAMES.back} className={APP_ICON_CLASS_NAMES.medium} />
          </button>
        )}
        <button className={styles.close} onClick={onClose} aria-label="閉じる" type="button">
          <AppIcon name={APP_ICON_NAMES.close} />
        </button>
        <div className={styles.body}>
          <section className={styles['image-panel']} aria-label="写真表示">
            <button
              className={[styles['edge-button'], styles.prev].join(' ')}
              onClick={onGoPrev}
              disabled={!canGoPrev}
              aria-label="前の写真"
              type="button"
            >
              <AppIcon name={APP_ICON_NAMES.back} className={APP_ICON_CLASS_NAMES.large} />
            </button>
            <button
              className={[styles['edge-button'], styles.next].join(' ')}
              onClick={onGoNext}
              disabled={!canGoNext}
              aria-label="次の写真"
              type="button"
            >
              <AppIcon name={APP_ICON_NAMES.next} className={APP_ICON_CLASS_NAMES.large} />
            </button>
            <img src={photoSrc} alt="" />
            {showSimilarPhotos && similarPhotos.length > 1 && onSelectSimilarPhoto && (
              <section className={styles['similar-zone']} aria-labelledby="similar-photos-title">
                <h3 id="similar-photos-title" className={styles['similar-hint']}>
                  類似写真 {similarPhotos.length}枚
                </h3>
                <div
                  ref={similarStripRef}
                  className={styles['similar-strip']}
                  onWheel={handleSimilarStripWheel}
                >
                  {similarPhotos.map((item) => (
                    <SimilarPhotoThumb
                      key={item.photo_path}
                      photo={item}
                      isActive={item.photo_path === photo.photo_path}
                      onSelect={onSelectSimilarPhoto}
                    />
                  ))}
                </div>
              </section>
            )}
            <p className={styles.filename}>{photo.photo_filename}</p>
          </section>

          <section className={styles.info} aria-labelledby="photo-modal-title">
            <header className={styles.header}>
              <div className={styles['title-row']}>
                <h2 id="photo-modal-title" className={styles.title}>
                  {photo.world_name || 'ワールド不明'}
                </h2>
                {matchSourceLabel && (
                  <HoverTooltip
                    label={matchSourceLabel}
                    className={styles['source-indicator-wrap']}
                  >
                    <span className={styles['source-indicator']} aria-label={matchSourceLabel}>
                      <AppIcon
                        name={APP_ICON_NAMES.exclamationCircleFill}
                        className={APP_ICON_CLASS_NAMES.medium}
                      />
                    </span>
                  </HoverTooltip>
                )}
              </div>
            </header>

            <div className={styles.divider} />

            <section className={styles.form} aria-label="写真情報編集">
              <label htmlFor="photo-modal-tag-select">タグ</label>
              <div className={styles['tag-select-row']}>
                <div className={styles['tag-select-wrap']}>
                  <select
                    id="photo-modal-tag-select"
                    className={styles['tag-select']}
                    value={selectedExistingTag}
                    disabled={!hasAvailableTags}
                    onChange={(event) => {
                      setSelectedExistingTag(event.target.value);
                    }}
                  >
                    <option value="">
                      {hasAvailableTags ? 'タグを選択...' : '追加できるタグがありません'}
                    </option>
                    {availableTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className={styles['primary-button']}
                  onClick={addExistingTag}
                  disabled={!selectedExistingTag || !hasAvailableTags}
                  type="button"
                >
                  追加
                </button>
              </div>
              {!hasAvailableTags && (
                <div className={styles['empty-note']}>
                  <p>追加できるタグがありません。タグマスタ編集画面でタグを追加してください。</p>
                  {onOpenTagMaster && (
                    <button
                      className={styles['primary-button']}
                      onClick={onOpenTagMaster}
                      type="button"
                    >
                      タグマスタ編集を開く
                    </button>
                  )}
                </div>
              )}

              {!!photo.tags.length && (
                <div className={styles['tag-list']} role="list" aria-label="登録済みタグ">
                  {photo.tags.map((tag) => (
                    <button
                      key={tag}
                      className={styles['tag-chip']}
                      onClick={() => {
                        onRemoveTag(tag);
                      }}
                      type="button"
                    >
                      {tag} ×
                    </button>
                  ))}
                </div>
              )}

              <label htmlFor="photo-modal-memo">メモ</label>
              <textarea
                id="photo-modal-memo"
                value={localMemo}
                onChange={(event) => {
                  setLocalMemo(event.target.value);
                }}
                placeholder="メモを入力..."
              />
              <button
                className={styles['primary-button']}
                onClick={handleSaveMemo}
                disabled={isSavingMemo}
                type="button"
              >
                {isSavingMemo ? '保存中...' : 'メモを保存'}
              </button>
            </section>

            <footer className={styles['bottom-actions']}>
              <HoverTooltip
                label={photo.is_favorite ? 'お気に入りから解除' : 'お気に入りに追加'}
                className={styles['bottom-action-wrap']}
              >
                <button
                  className={[
                    styles['bottom-action'],
                    'photo-modal-bottom-action',
                    photo.is_favorite ? styles['favorite-active'] : '',
                    photo.is_favorite ? 'favorite-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={onToggleFavorite}
                  aria-label={photo.is_favorite ? 'お気に入りから解除' : 'お気に入りに追加'}
                  type="button"
                >
                  <AnimatedFavoriteStar liked={photo.is_favorite} className="favorite-star-modal" />
                  <span className={styles['bottom-action-label']}>お気に入り</span>
                </button>
              </HoverTooltip>
              <HoverTooltip label="ツイート投稿画面を開く" className={styles['bottom-action-wrap']}>
                <button
                  className={[styles['bottom-action'], 'photo-modal-bottom-action'].join(' ')}
                  onClick={onTweet}
                  aria-label="ツイート投稿画面を開く"
                  type="button"
                >
                  <AppIcon name={APP_ICON_NAMES.pen} />
                  <span className={styles['bottom-action-label']}>投稿</span>
                </button>
              </HoverTooltip>
              <HoverTooltip
                label={photo.world_id ? 'ワールドリンクを開く' : 'ワールドIDがありません'}
                className={styles['bottom-action-wrap']}
              >
                <button
                  className={[
                    styles['bottom-action'],
                    'photo-modal-bottom-action',
                    'world-link-button',
                  ].join(' ')}
                  onClick={handleOpenWorld}
                  disabled={!photo.world_id}
                  aria-label="ワールドリンクを開く"
                  type="button"
                >
                  <AppIcon name={APP_ICON_NAMES.globe} />
                  <span className={styles['bottom-action-label']}>ワールド</span>
                </button>
              </HoverTooltip>
              <HoverTooltip label="エクスプローラーで表示" className={styles['bottom-action-wrap']}>
                <button
                  className={[styles['bottom-action'], 'photo-modal-bottom-action'].join(' ')}
                  onClick={onShowInExplorer}
                  aria-label="エクスプローラーで表示"
                  type="button"
                >
                  <AppIcon name={APP_ICON_NAMES.explorer} />
                  <span className={styles['bottom-action-label']}>表示</span>
                </button>
              </HoverTooltip>
            </footer>
          </section>
        </div>
      </section>
    </>
  );
};
