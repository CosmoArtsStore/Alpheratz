import { useEffect, useRef, useState, type WheelEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Photo, SimilarWorldCandidate } from "../types";
import { Icons } from "./Icons";
import { AnimatedFavoriteStar } from "./AnimatedFavoriteStar";
import { HoverTooltip } from "./HoverTooltip";

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
  groupedPhotos?: Photo[];
  groupedPhotoTotalCount?: number;
  groupedPhotoLabel?: string;
  showGroupedPhotos?: boolean;
  onSelectGroupedPhoto?: (photo: Photo) => void;
  canTweet?: boolean;
  tweetTooltipLabel?: string;
  onToggleFavorite: () => void;
  onTweet: () => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onOpenTagMaster: () => void;
  onApplySimilarWorldMatch: (sourcePhoto: Photo) => Promise<void>;
  addToast: (msg: string) => void;
}

const SimilarPhotoThumb = ({ photo, isActive, onSelect }: { photo: Photo; isActive: boolean; onSelect: (photo: Photo) => void; }) => {
  return (
    <button
      className={`similar-photo-thumb ${isActive ? "active" : ""}`}
      onClick={() => onSelect(photo)}
      type="button"
      title={photo.photo_filename}
    >
      <span className="similar-photo-thumb-skeleton" />
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
  groupedPhotos = [],
  groupedPhotoTotalCount,
  groupedPhotoLabel = "",
  showGroupedPhotos = false,
  onSelectGroupedPhoto,
  canTweet = true,
  tweetTooltipLabel = "ツイート投稿画面を開く",
  onToggleFavorite,
  onTweet,
  onAddTag,
  onRemoveTag,
  onOpenTagMaster,
  onApplySimilarWorldMatch,
  addToast,
}: PhotoModalProps) => {
  const [selectedExistingTags, setSelectedExistingTags] = useState<string[]>([]);
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [isSimilarSearchOpen, setIsSimilarSearchOpen] = useState(false);
  const [similarCandidates, setSimilarCandidates] = useState<SimilarWorldCandidate[]>([]);
  const [selectedSimilarCandidatePath, setSelectedSimilarCandidatePath] = useState<string | null>(null);
  const [isSearchingSimilarCandidates, setIsSearchingSimilarCandidates] = useState(false);
  const [isApplyingSimilarCandidate, setIsApplyingSimilarCandidate] = useState(false);
  const similarStripRef = useRef<HTMLDivElement | null>(null);

  const availableTags = allTags.filter((tag) => !photo.tags.includes(tag));
  const filteredAvailableTags = availableTags.filter((tag) => (
    tag.toLowerCase().includes(tagSearchQuery.trim().toLowerCase())
  ));
  const hasAvailableTags = availableTags.length > 0;
  const matchSourceLabel = (() => {
    if (photo.match_source === "stella_db" || photo.match_source === "metadata" || photo.match_source === "title") {
      return "DBから取得";
    }
    if (photo.match_source === "phash") {
      return "類似分析から取得";
    }
    return null;
  })();
  const canSearchSimilarWorld = !photo.world_name?.trim();

  const handleShowInExplorer = async () => {
    try {
      await invoke("show_in_explorer", { path: photo.photo_path });
    } catch (err) {
      addToast(`エクスプローラーで表示できませんでした: ${String(err)}`);
    }
  };

  const addExistingTag = () => {
    if (selectedExistingTags.length === 0) {
      return;
    }
    selectedExistingTags.forEach((tag) => onAddTag(tag));
    setSelectedExistingTags([]);
  };

  useEffect(() => {
    setSelectedExistingTags([]);
    setIsTagSelectorOpen(false);
    setTagSearchQuery("");
    setIsSimilarSearchOpen(false);
    setSimilarCandidates([]);
    setSelectedSimilarCandidatePath(null);
  }, [photo.photo_path]);

  const selectedSimilarCandidate = similarCandidates.find((candidate) => candidate.photo.photo_path === selectedSimilarCandidatePath) ?? null;

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      const tagName = target.tagName;
      return target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      const activeGroup = showGroupedPhotos ? groupedPhotos : [];
      if (activeGroup.length > 1 && onSelectGroupedPhoto) {
        const currentIndex = activeGroup.findIndex((item) => item.photo_path === photo.photo_path);
        if (currentIndex >= 0) {
          const nextIndex = event.key === "ArrowRight" ? currentIndex + 1 : currentIndex - 1;
          if (nextIndex >= 0 && nextIndex < activeGroup.length) {
            event.preventDefault();
            onSelectGroupedPhoto(activeGroup[nextIndex]);
            return;
          }
        }
      }

      if (event.key === "ArrowRight" && canGoNext && onGoNext) {
        event.preventDefault();
        onGoNext();
      }

      if (event.key === "ArrowLeft" && canGoPrev && onGoPrev) {
        event.preventDefault();
        onGoPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canGoNext, canGoPrev, groupedPhotos, onGoNext, onGoPrev, onSelectGroupedPhoto, photo.photo_path, showGroupedPhotos]);

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

  const openSimilarSearch = async () => {
    setIsSimilarSearchOpen(true);
    setIsSearchingSimilarCandidates(true);
    setSelectedSimilarCandidatePath(null);
    try {
      const results = await invoke<SimilarWorldCandidate[]>("find_similar_world_candidates_cmd", {
        targetPhotoPath: photo.photo_path,
        limit: 24,
      });
      setSimilarCandidates(results);
      setSelectedSimilarCandidatePath(results[0]?.photo.photo_path ?? null);
    } catch (err) {
      addToast(`類似候補の検索に失敗しました: ${String(err)}`);
      setSimilarCandidates([]);
    } finally {
      setIsSearchingSimilarCandidates(false);
    }
  };

  const applySimilarCandidate = async () => {
    if (!selectedSimilarCandidate) {
      return;
    }
    setIsApplyingSimilarCandidate(true);
    try {
      await onApplySimilarWorldMatch(selectedSimilarCandidate.photo);
      setIsSimilarSearchOpen(false);
    } finally {
      setIsApplyingSimilarCandidate(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content photo-modal" onClick={(event) => event.stopPropagation()}>
        {canGoBack && onGoBack && (
          <button className="modal-back photo-modal-back" onClick={onGoBack} type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        <button className="modal-close" onClick={onClose} aria-label="閉じる" type="button">
          <Icons.Close />
        </button>
        <div className="modal-body photo-modal-body">
          <div className={`modal-image-container photo-modal-image ${showGroupedPhotos && groupedPhotos.length > 1 ? "has-similar-strip" : ""}`}>
            <div className="photo-modal-image-stage">
              <button
                className="photo-edge-button photo-edge-button-prev"
                onClick={onGoPrev}
                disabled={!canGoPrev}
                aria-label="前の写真"
                type="button"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                className="photo-edge-button photo-edge-button-next"
                onClick={onGoNext}
                disabled={!canGoNext}
                aria-label="次の写真"
                type="button"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <div className="photo-thumb-skeleton" />
            </div>
            {showGroupedPhotos && groupedPhotos.length > 1 && onSelectGroupedPhoto && (
              <>
                <div className="similar-photos-strip-trigger" />
                <div className="similar-photos-strip">
                  <div
                    ref={similarStripRef}
                    className="similar-photos-strip-scroll"
                    onWheel={handleSimilarStripWheel}
                  >
                    {groupedPhotos.map((item) => (
                      <SimilarPhotoThumb
                        key={item.photo_path}
                        photo={item}
                        isActive={item.photo_path === photo.photo_path}
                        onSelect={onSelectGroupedPhoto}
                      />
                    ))}
                  </div>
                  <div className="similar-photos-strip-count">
                    {groupedPhotoLabel ? `${groupedPhotoLabel} ` : ""}{groupedPhotoTotalCount ?? groupedPhotos.length} 枚
                  </div>
                </div>
                <div className="similar-photos-strip-hint" />
              </>
            )}
            <div className="photo-modal-filename">{photo.photo_filename}</div>
          </div>

          <div className="modal-info photo-modal-info">
            <div className="info-header photo-modal-header">
              <h2 className="photo-modal-title">{photo.world_name || "ワールド不明"}</h2>
              <div className="photo-modal-meta">
                <div className="photo-meta-badges">
                  {matchSourceLabel && (
                    <span className={`photo-meta-badge active ${photo.match_source === "phash" ? "phash" : "db"}`}>
                      {matchSourceLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="photo-modal-divider" />

            <div className="memo-section photo-modal-form">
              <label>タグ</label>
              {hasAvailableTags ? (
                <div className="tag-select-row">
                  <button
                    className="save-button settings-action-button"
                    onClick={() => setIsTagSelectorOpen(true)}
                    type="button"
                  >
                    タグを追加
                  </button>
                </div>
              ) : (
                <div className="tag-select-empty-note">
                  <div>追加できるタグがありません。</div>
                  <button
                    className="tag-master-link-button"
                    onClick={onOpenTagMaster}
                    type="button"
                  >
                    タグマスタ編集を開く
                  </button>
                </div>
              )}

              {canSearchSimilarWorld && (
                <>
                  <label>ワールド補完</label>
                  <div className="tag-select-row">
                    <button
                      className="save-button settings-action-button"
                      onClick={() => void openSimilarSearch()}
                      type="button"
                    >
                      類似写真を探す
                    </button>
                  </div>
                </>
              )}

              {!!photo.tags.length && (
                <div className="tag-list photo-modal-tag-list">
                  {photo.tags.map((tag) => (
                    <button key={tag} className="tag-chip" onClick={() => onRemoveTag(tag)} type="button">
                      {tag} ×
                    </button>
                  ))}
                </div>
              )}

              <label>メモ</label>
              <textarea
                value={localMemo}
                onChange={(event) => setLocalMemo(event.target.value)}
                placeholder="メモを入力..."
              />
              <button className="save-button" onClick={handleSaveMemo} disabled={isSavingMemo} type="button">
                {isSavingMemo ? "保存中..." : "メモを保存"}
              </button>
            </div>

            <div className="photo-modal-bottom-actions photo-modal-bottom-actions-four">
              <HoverTooltip label={photo.is_favorite ? "お気に入りから解除" : "お気に入りに追加"}>
                <button
                  className={`photo-modal-bottom-action photo-modal-bottom-action-favorite ${photo.is_favorite ? "favorite-active" : ""}`}
                  onClick={onToggleFavorite}
                  aria-label={photo.is_favorite ? "お気に入りから解除" : "お気に入りに追加"}
                  type="button"
                >
                  <AnimatedFavoriteStar liked={photo.is_favorite} className="favorite-star-modal" />
                </button>
              </HoverTooltip>
              <HoverTooltip label={tweetTooltipLabel}>
                <button
                  className="photo-modal-bottom-action photo-modal-bottom-action-tweet"
                  onClick={onTweet}
                  disabled={!canTweet}
                  aria-label="ツイート投稿画面を開く"
                  type="button"
                >
                  <Icons.Quill />
                </button>
              </HoverTooltip>
              <HoverTooltip label={photo.world_id ? "ワールドリンクを開く" : "ワールドIDがありません"}>
                <button
                  className="photo-modal-bottom-action photo-modal-bottom-action-world"
                  onClick={handleOpenWorld}
                  disabled={!photo.world_id}
                  aria-label="ワールドリンクを開く"
                  type="button"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18" />
                    <path d="M12 3a14 14 0 0 1 0 18" />
                    <path d="M12 3a14 14 0 0 0 0 18" />
                  </svg>
                </button>
              </HoverTooltip>
              <HoverTooltip label="エクスプローラーで表示" className="tooltip-align-right">
                <button
                  className="photo-modal-bottom-action photo-modal-bottom-action-explorer"
                  onClick={() => void handleShowInExplorer()}
                  aria-label="エクスプローラーで表示"
                  type="button"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l1.7 2H18.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
                  </svg>
                </button>
              </HoverTooltip>
            </div>
          </div>
        </div>
        {isTagSelectorOpen && (
          <div className="photo-tag-modal-overlay" onClick={() => setIsTagSelectorOpen(false)}>
            <div className="photo-tag-modal" onClick={(event) => event.stopPropagation()}>
              <div className="photo-tag-modal-header">
                <h3>タグを選択</h3>
                <button className="modal-close photo-tag-modal-close" onClick={() => setIsTagSelectorOpen(false)} aria-label="閉じる" type="button">
                  <Icons.Close />
                </button>
              </div>
              <div className="dd-search-wrap photo-tag-modal-search">
                <span className="dd-search-icon">⌕</span>
                <input
                  className="dd-search"
                  value={tagSearchQuery}
                  placeholder="タグ名で絞り込む..."
                  onChange={(event) => setTagSearchQuery(event.target.value)}
                />
              </div>
              <div className="photo-tag-modal-list">
                {filteredAvailableTags.length === 0 ? (
                  <div className="tag-dropdown-empty">該当するタグがありません。</div>
                ) : (
                  filteredAvailableTags.map((tag) => (
                    <label key={tag} className="dd-check-item photo-modal-tag-check-item">
                      <input
                        type="checkbox"
                        checked={selectedExistingTags.includes(tag)}
                        onChange={() => {
                          setSelectedExistingTags((prev) => (
                            prev.includes(tag)
                              ? prev.filter((item) => item !== tag)
                              : [...prev, tag]
                          ));
                        }}
                      />
                      <span className="dd-item-dot" />
                      <span className="dd-item-name">{tag}</span>
                    </label>
                  ))
                )}
              </div>
              {selectedExistingTags.length > 0 && (
                <div className="tag-list photo-modal-tag-selection-list">
                  {selectedExistingTags.map((tag) => (
                    <button
                      key={tag}
                      className="tag-chip"
                      onClick={() => setSelectedExistingTags((prev) => prev.filter((item) => item !== tag))}
                      type="button"
                    >
                      {tag} ×
                    </button>
                  ))}
                </div>
              )}
              <div className="photo-tag-modal-footer">
                <div className="photo-tag-modal-count">{selectedExistingTags.length}件選択中</div>
                <div className="photo-tag-modal-actions">
                  <button className="modal-secondary-button" onClick={() => setIsTagSelectorOpen(false)} type="button">
                    閉じる
                  </button>
                  <button
                    className="save-button settings-action-button"
                    onClick={() => {
                      addExistingTag();
                      setIsTagSelectorOpen(false);
                    }}
                    disabled={selectedExistingTags.length === 0}
                    type="button"
                  >
                    追加
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {isSimilarSearchOpen && (
          <div className="photo-tag-modal-overlay" onClick={() => !isApplyingSimilarCandidate && setIsSimilarSearchOpen(false)}>
            <div className="photo-tag-modal photo-similar-modal" onClick={(event) => event.stopPropagation()}>
              <div className="photo-tag-modal-header">
                <h3>類似写真を探す</h3>
                <button className="modal-close photo-tag-modal-close" onClick={() => !isApplyingSimilarCandidate && setIsSimilarSearchOpen(false)} aria-label="閉じる" type="button">
                  <Icons.Close />
                </button>
              </div>
              {isSearchingSimilarCandidates ? (
                <div className="similar-search-status">探索分析中...</div>
              ) : similarCandidates.length === 0 ? (
                <div className="similar-search-status">候補が見つかりませんでした。</div>
              ) : (
                <div className="photo-similar-modal-list">
                  {similarCandidates.map((candidate) => (
                    <button
                      key={candidate.photo.photo_path}
                      className={`photo-similar-candidate ${selectedSimilarCandidatePath === candidate.photo.photo_path ? "selected" : ""}`}
                      onClick={() => setSelectedSimilarCandidatePath(candidate.photo.photo_path)}
                      type="button"
                    >
                      <div className="photo-similar-candidate-thumb">
                        <span className="similar-photo-thumb-skeleton" />
                      </div>
                      <div className="photo-similar-candidate-info">
                        <div className="photo-similar-candidate-world">{candidate.photo.world_name || "ワールド不明"}</div>
                        <div className="photo-similar-candidate-date">{candidate.photo.timestamp}</div>
                        <div className="photo-similar-candidate-score">一致度 {candidate.similarity.toFixed(1)}% / 距離 {candidate.distance}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="photo-tag-modal-footer">
                <div className="photo-tag-modal-count">
                  {selectedSimilarCandidate ? `選択中: ${selectedSimilarCandidate.photo.world_name || "ワールド不明"}` : "候補を選択してください"}
                </div>
                <div className="photo-tag-modal-actions">
                  <button className="modal-secondary-button" onClick={() => setIsSimilarSearchOpen(false)} disabled={isApplyingSimilarCandidate} type="button">
                    閉じる
                  </button>
                  <button
                    className="save-button settings-action-button"
                    onClick={() => void applySimilarCandidate()}
                    disabled={!selectedSimilarCandidate || isApplyingSimilarCandidate}
                    type="button"
                  >
                    {isApplyingSimilarCandidate ? "反映中..." : "OK"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
