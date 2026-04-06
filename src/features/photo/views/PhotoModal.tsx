import { useEffect, useRef, useState, type WheelEvent } from 'react';
import type { Photo } from '../models/types';
import { Icons } from '../../../shared/components/Icons';
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
}: PhotoModalProps) => {
  const [selectedExistingTag, setSelectedExistingTag] = useState('');
  const similarStripRef = useRef<HTMLDivElement | null>(null);
  const photoSrc = usePhotoSrcViewModel(photo.photo_path);

  const availableTags = allTags.filter((tag) => !photo.tags.includes(tag));
  const hasAvailableTags = availableTags.length > 0;
  const isDbMatched = photo.match_source === 'stella_db';
  const isPhashMatched = photo.match_source === 'phash';

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
      <section className={styles.content} aria-modal="true">
        {canGoBack && onGoBack && (
          <button className={styles.back} onClick={onGoBack} type="button">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        <button className={styles.close} onClick={onClose} aria-label="閉じる" type="button">
          <Icons.Close />
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
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              className={[styles['edge-button'], styles.next].join(' ')}
              onClick={onGoNext}
              disabled={!canGoNext}
              aria-label="次の写真"
              type="button"
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
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
              <h2 id="photo-modal-title" className={styles.title}>
                {photo.world_name || 'ワールド不明'}
              </h2>
              <div>
                <div className={styles['meta-badges']}>
                  <span
                    className={[styles['meta-badge'], isDbMatched ? styles['active-db'] : '']
                      .filter(Boolean)
                      .join(' ')}
                  >
                    STELLA DB
                  </span>
                  <span
                    className={[styles['meta-badge'], isPhashMatched ? styles['active-phash'] : '']
                      .filter(Boolean)
                      .join(' ')}
                  >
                    類似一致
                  </span>
                </div>
              </div>
            </header>

            <div className={styles.divider} />

            <section className={styles.form} aria-label="写真情報編集">
              <label>タグ</label>
              <div className={styles['tag-select-row']}>
                <div className={styles['tag-select-wrap']}>
                  <select
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
                <p className={styles['empty-note']}>
                  追加できるタグがありません。設定画面でタグを追加してください。
                </p>
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

              <label>メモ</label>
              <textarea
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
              <HoverTooltip label={photo.is_favorite ? 'お気に入りから解除' : 'お気に入りに追加'}>
                <button
                  className={[
                    styles['bottom-action'],
                    photo.is_favorite ? styles['favorite-active'] : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={onToggleFavorite}
                  aria-label={photo.is_favorite ? 'お気に入りから解除' : 'お気に入りに追加'}
                  type="button"
                >
                  <AnimatedFavoriteStar liked={photo.is_favorite} className="favorite-star-modal" />
                </button>
              </HoverTooltip>
              <HoverTooltip label="ツイート投稿画面を開く">
                <button
                  className={styles['bottom-action']}
                  onClick={onTweet}
                  aria-label="ツイート投稿画面を開く"
                  type="button"
                >
                  <Icons.Quill />
                </button>
              </HoverTooltip>
              <HoverTooltip
                label={photo.world_id ? 'ワールドリンクを開く' : 'ワールドIDがありません'}
              >
                <button
                  className={styles['bottom-action']}
                  onClick={handleOpenWorld}
                  disabled={!photo.world_id}
                  aria-label="ワールドリンクを開く"
                  type="button"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18" />
                    <path d="M12 3a14 14 0 0 1 0 18" />
                    <path d="M12 3a14 14 0 0 0 0 18" />
                  </svg>
                </button>
              </HoverTooltip>
              <HoverTooltip label="エクスプローラーで表示">
                <button
                  className={styles['bottom-action']}
                  onClick={onShowInExplorer}
                  aria-label="エクスプローラーで表示"
                  type="button"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l1.7 2H18.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
                  </svg>
                </button>
              </HoverTooltip>
            </footer>
          </section>
        </div>
      </section>
    </>
  );
};
